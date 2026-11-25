import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import {
  Swords,
  Users,
  Clock,
  Trophy,
  Copy,
  Check,
  Play,
  Send,
  AlertTriangle,
  Code2,
  Terminal as TerminalIcon,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Flame,
  Medal,
  Ban,
  ShieldAlert,
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import soundManager from '../utils/soundManager';
import MobileCodeEditor from './MobileCodeEditor';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

export default function Arena({
  roomId: propRoomCode,
  serverUrl = API_URL,
}) {
  const { roomId: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const roomCode = (urlRoomCode || propRoomCode || '').toUpperCase().trim();

  // ---------------------------------------------------------------------------
  // 1. USER IDENTITY (sessionStorage & localStorage: 'codeclash_user')
  // ---------------------------------------------------------------------------
  const [user] = useState(() => {
    try {
      const saved =
        sessionStorage.getItem('codeclash_user') ||
        localStorage.getItem('codeclash_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse user session:', e);
    }
    const fallback = {
      id: crypto.randomUUID(),
      username: `Oyunçu_${Math.floor(1000 + Math.random() * 9000)}`,
    };
    sessionStorage.setItem('codeclash_user', JSON.stringify(fallback));
    localStorage.setItem('codeclash_user', JSON.stringify(fallback));
    return fallback;
  });

  // ---------------------------------------------------------------------------
  // 2. ROOM & QUESTIONS STATE
  // ---------------------------------------------------------------------------
  const [room, setRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Map of code per question: { [questionId]: "source_code" }
  const [codeMap, setCodeMap] = useState({});

  // Room lifecycle status: 'loading' | 'waiting' | 'active' | 'finished' | 'error'
  const [status, setStatus] = useState('loading');
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [, setDurationSeconds] = useState(900);

  // Participants & Leaderboard
  const [participants, setParticipants] = useState([]);
  const [userSolvedIds, setUserSolvedIds] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Opponent Live Tracking
  const [opponentStatus, setOpponentStatus] = useState({}); // { [userId]: { statusText, activeQuestionIndex } }
  const [opponentProgress, setOpponentProgress] = useState({}); // { [userId]: { solvedCount, totalQuestions } }

  // Sound Mute State
  const [isMuted, setIsMuted] = useState(() => soundManager.isMuted());

  // ---------------------------------------------------------------------------
  // 3. RESPONSIVE MOBILE VIEW STATES (< 768px)
  // ---------------------------------------------------------------------------
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [mobileTab, setMobileTab] = useState('question'); // 'question' | 'code' | 'terminal'
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------------------------------------------------------------------
  // 4. ANTI-CHEAT & DISQUALIFICATION STATE & REFS
  // ---------------------------------------------------------------------------
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(null); // { count: number }
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [kickedNotification, setKickedNotification] = useState(null);

  // Anti-cheat refs to prevent rapid double-counting & stale closures
  const warningCountRef = useRef(0);
  const lastViolationTimeRef = useRef(0);
  const isDisqualifiedRef = useRef(false);

  // Execution Output Console & 2-Tab View
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outputConsole, setOutputConsole] = useState(null);
  const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' | 'raw'
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);

  // Monaco Editor Ref
  const editorRef = useRef(null);

  // Post-Match Review Tabs & State
  const [finalResults, setFinalResults] = useState(null);
  const [postMatchTab, setPostMatchTab] = useState('scoreboard'); // 'scoreboard' | 'inspect'
  const [inspectQuestionIndex, setInspectQuestionIndex] = useState(0);

  // Socket Ref
  const socketRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 5. SOUND TOGGLE HANDLER
  // ---------------------------------------------------------------------------
  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  // ---------------------------------------------------------------------------
  // 6. INITIAL ROOM FETCH
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchRoom() {
      if (!roomCode) {
        setStatus('error');
        return;
      }

      try {
        const res = await fetch(`${serverUrl}/api/rooms/${roomCode}`);
        const data = await res.json();

        if (data?.success && data.room) {
          const r = data.room;
          setRoom(r);
          setStatus(r.status || 'waiting');
          setDurationSeconds(r.duration_seconds || 900);
          setRemainingSeconds(r.remainingSeconds || r.duration_seconds || 900);

          if (Array.isArray(r.questions) && r.questions.length > 0) {
            setQuestions(r.questions);
            const initialMap = {};
            r.questions.forEach((q) => {
              initialMap[q.id] = q.starter_code || q.base_code || 'def solution():\n    pass\n';
            });
            setCodeMap(initialMap);
          }

          if (Array.isArray(r.participants)) {
            setParticipants(r.participants);
          }

          if (r.status === 'finished') {
            setFinalResults({
              leaderboard: r.leaderboard || r.participants,
              winner: r.winner,
              eloDeltas: r.eloDeltas,
              codeSubmissions: r.codeSubmissions,
            });
          }
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Error fetching room:', err);
        setStatus('error');
      }
    }

    fetchRoom();
  }, [roomCode, serverUrl]);

  // ---------------------------------------------------------------------------
  // 7. SOCKET.IO INTEGRATION & REALTIME EVENTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!roomCode) return;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(
        'join_room',
        {
          roomCode,
          userId: user.id,
          username: user.username,
        },
        (ack) => {
          if (ack?.success) {
            setStatus(ack.status);
            setDurationSeconds(ack.durationSeconds || 900);
            setRemainingSeconds(ack.remainingSeconds || ack.durationSeconds || 900);
            if (Array.isArray(ack.questions) && ack.questions.length > 0) {
              setQuestions(ack.questions);
              setCodeMap((prev) => {
                const updated = { ...prev };
                ack.questions.forEach((q) => {
                  const savedCode = ack.myParticipant?.submittedCodes?.[q.id];
                  if (savedCode) {
                    updated[q.id] = savedCode;
                  } else if (!updated[q.id]) {
                    updated[q.id] = q.starter_code || q.base_code || 'def solution():\n    pass\n';
                  }
                });
                return updated;
              });
            }
            if (Array.isArray(ack.participants)) {
              setParticipants(ack.participants);
            }
            // Restore user's solved state and disqualification flag on reconnect
            if (Array.isArray(ack.myParticipant?.solvedQuestionIds)) {
              setUserSolvedIds(ack.myParticipant.solvedQuestionIds);
            }
            if (ack.myParticipant?.disqualified) {
              setIsDisqualified(true);
              isDisqualifiedRef.current = true;
            }
          } else {
            alert(ack?.error || 'Otağa qoşularkən xəta baş verdi.');
            navigate('/');
          }
        }
      );
    });

    socket.on('roster_update', (roster) => {
      if (Array.isArray(roster)) {
        setParticipants(roster);
      }
    });

    socket.on('match_started', (data) => {
      setStatus('active');
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setCodeMap((prev) => {
          const updated = { ...prev };
          data.questions.forEach((q) => {
            if (!updated[q.id]) {
              updated[q.id] = q.starter_code || q.base_code || 'def solution():\n    pass\n';
            }
          });
          return updated;
        });
      }
      if (data.durationSeconds) {
        setDurationSeconds(data.durationSeconds);
        setRemainingSeconds(data.durationSeconds);
      }
      if (Array.isArray(data.participants)) {
        setParticipants(data.participants);
      }
    });

    socket.on('timer_tick', (data) => {
      setRemainingSeconds(data.remainingSeconds);
      if (data.durationSeconds) setDurationSeconds(data.durationSeconds);

      // Web Audio 30s Countdown Warning
      if (data.remainingSeconds <= 30 && data.remainingSeconds > 0) {
        soundManager.playCountdownWarning();
      }
    });

    socket.on('scoreboard_update', (leaderboard) => {
      if (Array.isArray(leaderboard)) {
        setParticipants(leaderboard);
        const me = leaderboard.find((p) => p.userId === user.id);
        if (me && Array.isArray(me.solvedQuestionIds)) {
          setUserSolvedIds(me.solvedQuestionIds);
        }
      }
    });

    // Realtime Opponent Editor Activity
    socket.on('opponent_status', ({ userId: oppId, statusText, activeQuestionIndex: oppIdx }) => {
      if (oppId !== user.id) {
        setOpponentStatus((prev) => ({
          ...prev,
          [oppId]: { statusText, activeQuestionIndex: oppIdx, timestamp: Date.now() },
        }));
      }
    });

    // Realtime Opponent Solved Count Progress
    socket.on('opponent_progress', (data) => {
      if (data.userId !== user.id) {
        setOpponentProgress((prev) => ({
          ...prev,
          [data.userId]: data,
        }));
      }
    });

    // Received when any player gets kicked / disqualified
    socket.on('player_kicked', ({ userId: kickedUserId, username: kickedUsername }) => {
      if (kickedUserId !== user.id) {
        setKickedNotification(`⚠️ ${kickedUsername} qaydaları pozduğu üçün oyundan kənarlaşdırıldı!`);
        setTimeout(() => {
          setKickedNotification((prev) => (prev?.includes(kickedUsername) ? null : prev));
        }, 5000);
      }
    });

    socket.on('match_ended', (data) => {
      setStatus('finished');
      setFinalResults(data);

      // Play Victory or Defeat Sound
      const isWinner = data.winner && data.winner.userId === user.id;
      if (isWinner) {
        soundManager.playVictory();
      } else {
        soundManager.playDefeat();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, serverUrl, user.id, user.username]);

  // ---------------------------------------------------------------------------
  // 8. RELIABLE ANTI-CHEAT VIOLATION HANDLER (1200ms COOLDOWN & 3-STRIKE KICK)
  // ---------------------------------------------------------------------------
  const handleViolation = useCallback(
    (reason = 'WINDOW_BLUR_OR_ALT_TAB') => {
      // Activate anti-cheat listeners ONLY when the match is actively running
      if (status !== 'active' || isDisqualifiedRef.current) return;

      const now = Date.now();
      // 1200ms timestamp cooldown: a single Alt+Tab press will only count as 1 warning
      if (now - lastViolationTimeRef.current < 1200) {
        return;
      }
      lastViolationTimeRef.current = now;

      const nextCount = warningCountRef.current + 1;
      warningCountRef.current = nextCount;
      setWarningCount(nextCount);

      if (nextCount < 3) {
        // Warning 1 & 2: Emit cheat_detected & show prominent red warning overlay
        socketRef.current?.emit('cheat_detected', {
          roomCode,
          userId: user.id,
          username: user.username,
          count: nextCount,
          violationType: reason,
        });

        setShowWarningModal({ count: nextCount });
      } else {
        // Warning 3 (nextCount >= 3): Disqualification!
        isDisqualifiedRef.current = true;
        setIsDisqualified(true);
        setShowWarningModal(null);

        // Immediately emit player_disqualified
        socketRef.current?.emit('player_disqualified', {
          roomCode,
          userId: user.id,
          username: user.username,
        });

        // After 2.5 seconds, redirect the kicked user back to / (Lobby)
        setTimeout(() => {
          navigate('/');
        }, 2500);
      }
    },
    [status, roomCode, user, navigate]
  );

  // Attach BOTH window blur & document visibilitychange ONLY when match is active
  useEffect(() => {
    if (status !== 'active' || isDisqualified) return;

    const onBlur = () => {
      handleViolation('WINDOW_BLUR_OR_ALT_TAB');
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('TAB_SWITCH_OR_MINIMIZE');
      }
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [status, isDisqualified, handleViolation]);

  // ---------------------------------------------------------------------------
  // 9. CODE SUBMISSION & RESET HANDLERS
  // ---------------------------------------------------------------------------
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStartTournamentMatch = () => {
    socketRef.current?.emit('start_match', { roomCode }, (ack) => {
      if (!ack?.success) {
        alert(ack?.error || 'Yarış başladılarkən xəta baş verdi.');
      }
    });
  };

  const currentQuestion = questions[activeQuestionIndex] || null;
  const currentCode =
    (currentQuestion && codeMap[currentQuestion.id]) ||
    currentQuestion?.starter_code ||
    currentQuestion?.base_code ||
    'def solution():\n    pass\n';

  const handleEditorChange = (newVal) => {
    if (currentQuestion?.id) {
      setCodeMap((prev) => ({ ...prev, [currentQuestion.id]: newVal || '' }));

      // Send subtle editor status update to opponent
      if (socketRef.current && status === 'active') {
        socketRef.current.emit('update_editor_status', {
          roomCode,
          userId: user.id,
          statusText: `Sual ${activeQuestionIndex + 1} kodlayır`,
          activeQuestionIndex,
        });
      }
    }
  };

  // Reset Code button handler: restores question's default starter code
  const handleResetCode = () => {
    if (!currentQuestion?.id) return;
    const starter =
      currentQuestion.starter_code ||
      currentQuestion.base_code ||
      'def solution():\n    pass\n';

    setCodeMap((prev) => ({
      ...prev,
      [currentQuestion.id]: starter,
    }));
  };

  const handleSubmitCode = useCallback(() => {
    if (status !== 'active' || !currentQuestion || isDisqualified || isSubmitting) return;

    // Automatically switch to Terminal tab on mobile so test execution is seen immediately!
    if (isMobile) {
      setMobileTab('terminal');
    }

    setIsSubmitting(true);
    setOutputConsole(null);
    setSelectedTestCaseIndex(0);

    socketRef.current?.emit(
      'submit_code',
      {
        roomCode,
        questionId: currentQuestion.id,
        code: currentCode,
        userId: user.id,
      },
      (ack) => {
        setIsSubmitting(false);
        if (ack) {
          setOutputConsole(ack);

          if (ack.isCorrect) {
            // Full solve fanfare
            soundManager.playQuestionSolved();
            if (!userSolvedIds.includes(currentQuestion.id)) {
              setUserSolvedIds((prev) => [...prev, currentQuestion.id]);
            }
          } else if ((ack.totalPassedTests || 0) > 0) {
            // Partial test passed chime
            soundManager.playTestPassed();
          }
        }
      }
    );
  }, [status, currentQuestion, isDisqualified, isSubmitting, roomCode, currentCode, user.id, userSolvedIds, isMobile]);

  // Keep ref up to date for Monaco keyboard shortcuts
  const submitRef = useRef(handleSubmitCode);
  submitRef.current = handleSubmitCode;

  // Monaco Editor Mounting & Shortcut bindings (Ctrl+Enter / Ctrl+Shift+Enter)
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Ctrl + Enter (Run & Test)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      submitRef.current();
    });

    // Ctrl + Shift + Enter (Submit Solution)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      submitRef.current();
    });
  };

  // Global keydown fallback for Ctrl+Enter / Cmd+Enter on desktop
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * Cleans problem statement: normalizes \r\n to \n and removes stray markdown headers
   */
  const formatProblemStatement = (raw) => {
    if (!raw) return '';
    return String(raw)
      .replace(/\r\n/g, '\n')
      .replace(/^###\s+/gm, '')
      .trim();
  };

  // Identify opponent in 1v1 mode
  const opponentParticipant = participants.find((p) => p.userId !== user.id) || null;
  const oppProg = opponentParticipant
    ? opponentProgress[opponentParticipant.userId]
    : null;
  const oppStat = opponentParticipant
    ? opponentStatus[opponentParticipant.userId]
    : null;

  const opponentSolvedCount =
    oppProg?.solvedCount ??
    (opponentParticipant?.solvedQuestionIds?.length || 0);

  // ---------------------------------------------------------------------------
  // 10. REUSABLE SUB-PANEL RENDERERS (LEADERBOARD & TERMINAL)
  // ---------------------------------------------------------------------------
  const renderLeaderboardList = () => (
    <div className="space-y-2">
      {participants.map((p, idx) => {
        const solvedCount = p.solvedQuestionIds?.length || 0;
        const isMe = p.userId === user.id;

        return (
          <div
            key={p.userId}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
              isMe
                ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                : 'bg-[#111827] border-gray-800 text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-gray-500">#{idx + 1}</span>
              <span
                className={`font-bold truncate max-w-[120px] ${
                  p.disqualified ? 'line-through text-rose-400' : ''
                }`}
              >
                {p.username} {isMe && '(Siz)'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {p.disqualified ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-700/60 font-bold">
                  Kənarlaşdırıldı
                </span>
              ) : (
                <span
                  className={`font-bold ${
                    solvedCount === questions.length
                      ? 'text-emerald-400'
                      : solvedCount > 0
                      ? 'text-cyan-400'
                      : 'text-gray-500'
                  }`}
                >
                  {solvedCount} / {questions.length}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTerminalPanel = () => (
    <div className="flex-1 flex flex-col bg-[#0d1117] h-full overflow-hidden border border-gray-800/80 rounded-xl">
      {/* Tab Navigation Header */}
      <div className="h-9 bg-[#161b22] px-3 sm:px-4 flex items-center justify-between border-b border-gray-800 shrink-0">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setConsoleTab('testcases')}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              consoleTab === 'testcases'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Nümunələri</span>
            {outputConsole?.testResults && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-200">
                {outputConsole.totalPassedTests || 0}/{outputConsole.totalTests || outputConsole.testResults.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setConsoleTab('raw')}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              consoleTab === 'raw'
                ? 'bg-gray-800 text-white border border-gray-700'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Konsol / Xətalar</span>
          </button>
        </div>

        {outputConsole && (
          <button
            type="button"
            onClick={() => setOutputConsole(null)}
            className="text-[10px] font-mono text-gray-400 hover:text-white"
          >
            Təmizlə
          </button>
        )}
      </div>

      {/* Tab 1: Test Cases Viewer */}
      {consoleTab === 'testcases' && (
        <div className="flex-1 p-3.5 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
          {!outputConsole ? (
            <div className="text-gray-500 flex flex-col items-center justify-center h-full space-y-1">
              <p>
                Həllinizi test etmək üçün yuxarıdakı "Kodu Yoxla"
                <span className="hidden sm:inline"> (Ctrl+Enter)</span> düyməsinə klikləyin.
              </p>
              <p className="text-[11px] text-gray-600">Bütün açıq və gizli testlər avtomatik yoxlanılacaq.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overall Summary Bar */}
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-gray-800 gap-2">
                <div className="flex items-center space-x-2">
                  {outputConsole.isCorrect ? (
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>DÜZGÜNDÜR! Bütün test nümunələri uğurla keçdi.</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>SƏHV! Bəzi testlər gözlənilən nəticəni vermədi.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-gray-400 text-[11px]">
                  <span>
                    Keçdi: <strong className="text-white">{outputConsole.totalPassedTests || 0} / {outputConsole.totalTests || (outputConsole.testResults?.length || 1)}</strong>
                  </span>
                  <span>•</span>
                  <span>İcra: <strong className="text-white">{outputConsole.executionTimeMs}ms</strong></span>
                </div>
              </div>

              {/* Test Case Sub-Selector Buttons */}
              {Array.isArray(outputConsole.testResults) && outputConsole.testResults.length > 0 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {outputConsole.testResults.map((tc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedTestCaseIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shrink-0 ${
                        selectedTestCaseIndex === idx
                          ? 'bg-[#1a2333] border-cyan-500 text-cyan-300 shadow-md'
                          : 'bg-[#111827] border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Test #{tc.testNum || idx + 1} {tc.isHidden ? '(Gizli)' : ''}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                          tc.passed
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-600/40'
                        }`}
                      >
                        {tc.passed ? '✓ Keçdi' : '✕ Xəta'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Test Case Detail Inspector */}
              {(() => {
                const activeTc =
                  outputConsole.testResults?.[selectedTestCaseIndex] ||
                  outputConsole.testResults?.[0];

                if (!activeTc) {
                  return (
                    <div className="text-gray-400 text-xs">
                      Test nəticəsi mövcud deyil.
                    </div>
                  );
                }

                return (
                  <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                      <span className="font-bold text-gray-300">
                        Test #{activeTc.testNum || selectedTestCaseIndex + 1} Detalları {activeTc.isHidden ? '(Gizli Test)' : ''}
                      </span>
                      <span
                        className={`font-black text-xs ${
                          activeTc.passed ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {activeTc.passed ? 'PASSED (KEÇDİ)' : 'FAILED (UĞURSUZ)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono">
                      {/* Input */}
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">
                          Giriş (Input):
                        </span>
                        <pre className="bg-gray-950/80 border border-gray-800 p-2 rounded-lg mt-1 text-gray-300 text-[11px] overflow-x-auto whitespace-pre-wrap select-text">
                          {activeTc.input}
                        </pre>
                      </div>

                      {/* Expected Output */}
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">
                          Gözlənilən Çıxış:
                        </span>
                        <pre className="bg-gray-950/80 border border-gray-800 p-2 rounded-lg mt-1 text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap select-text">
                          {activeTc.expected}
                        </pre>
                      </div>

                      {/* Actual Output */}
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">
                          Sənin Çıxışın:
                        </span>
                        <pre
                          className={`bg-gray-950/80 border p-2 rounded-lg mt-1 text-[11px] overflow-x-auto whitespace-pre-wrap select-text ${
                            activeTc.passed
                              ? 'border-gray-800 text-emerald-300'
                              : 'border-rose-900/60 text-rose-300'
                          }`}
                        >
                          {activeTc.actual || '(Çıxış yoxdur)'}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Raw Console & Standard Errors */}
      {consoleTab === 'raw' && (
        <div className="flex-1 p-3.5 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
          {!outputConsole ? (
            <div className="text-gray-500 flex flex-col items-center justify-center h-full">
              <p>Konsol çıxışını görmək üçün kodu işə salın.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Raw Stdout */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest block text-cyan-400 font-bold">
                  Standart Çıxış (stdout):
                </span>
                <pre className="text-gray-200 bg-gray-900/90 border border-gray-800 p-2.5 rounded-lg mt-1 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-text">
                  {outputConsole.output ? outputConsole.output : '(Çıxış yoxdur / print edilməyib)'}
                </pre>
              </div>

              {/* Stderr / Errors */}
              {outputConsole.error && (
                <div>
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block font-bold">
                    Xəta / Traceback (stderr):
                  </span>
                  <pre className="text-rose-300 bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg mt-1 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-text">
                    {outputConsole.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // 11. LOADING & ERROR SCREENS
  // ---------------------------------------------------------------------------
  if (status === 'loading') {
    return (
      <div className="h-screen w-screen bg-[#090d16] flex flex-col items-center justify-center text-gray-400 font-mono select-none">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">Otağa qoşulur [{roomCode}]...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-screen w-screen bg-[#090d16] flex flex-col items-center justify-center text-gray-300 space-y-4 select-none">
        <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold">Otaq Tapılmadı və ya Müddəti Bitib</h2>
        <p className="text-xs text-gray-500 font-mono">Kod: {roomCode}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-mono text-xs font-bold"
        >
          Lobbiyə Qayıt
        </button>
      </div>
    );
  }

  // ===========================================================================
  // 12. FINAL RESULTS SCREEN (status === 'finished') WITH ELO & CODE REVIEW
  // ===========================================================================
  if (status === 'finished') {
    const rawList = Array.isArray(finalResults)
      ? finalResults
      : finalResults?.leaderboard ||
        finalResults?.participants ||
        Array.from(participants);

    const sortedLeaderboard = [...rawList].sort((a, b) => {
      if (a.disqualified && !b.disqualified) return 1;
      if (!a.disqualified && b.disqualified) return -1;
      const bSolved = b.solvedQuestionIds?.length || 0;
      const aSolved = a.solvedQuestionIds?.length || 0;
      if (bSolved !== aSolved) return bSolved - aSolved;
      return (a.totalTimeMs || 0) - (b.totalTimeMs || 0);
    });

    const totalQCount = questions.length || 3;
    const winner =
      finalResults?.winner ||
      sortedLeaderboard.find((p) => !p.disqualified) ||
      sortedLeaderboard[0] ||
      null;

    const myEloInfo = finalResults?.eloDeltas?.[user.id] || null;
    const opponent = sortedLeaderboard.find((p) => p.userId !== user.id) || null;
    const opponentCodeSubmissions =
      (opponent && finalResults?.codeSubmissions?.[opponent.userId]) || {};

    const inspectQ = questions[inspectQuestionIndex] || questions[0];
    const opponentCodeForInspect =
      inspectQ && opponentCodeSubmissions[inspectQ.id]
        ? opponentCodeSubmissions[inspectQ.id]
        : '# Rəqib bu sual üzrə həll kodu təqdim etməyib.';

    return (
      <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans select-none">
        <header className="h-16 border-b border-gray-800 bg-[#0f172a] px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
            <h1 className="text-lg font-bold text-white tracking-wide">YARIŞIN NƏTİCƏLƏRİ</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all"
          >
            Lobbiyə Qayıt
          </button>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col items-center">
          {/* Winner Banner */}
          <div className="text-center my-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-yellow-500/10 border border-amber-400/50 mx-auto flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20 mb-3">
              <Medal className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              {winner ? `${winner.username} Qalib Gəldi!` : 'Yarış Başa Çatdı!'}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">Otaq Kodu: {roomCode}</p>

            {/* Elo Delta Rating Display */}
            {myEloInfo && (
              <div className="mt-4 inline-flex items-center space-x-3 px-4 py-2 rounded-2xl bg-[#111827] border border-gray-800 font-mono shadow-lg">
                <span className="text-xs text-gray-400">Elo Reytinqi:</span>
                <span className="text-xs text-gray-300 font-bold">{myEloInfo.oldElo}</span>
                <span className="text-gray-500">→</span>
                <span className="text-sm font-extrabold text-white">{myEloInfo.newElo}</span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                    myEloInfo.delta >= 0
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/50'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-600/50'
                  }`}
                >
                  {myEloInfo.delta >= 0 ? `+${myEloInfo.delta}` : myEloInfo.delta} Elo
                </span>
              </div>
            )}
          </div>

          {/* Sub-Tabs: Scoreboard vs Inspect Opponent's Code */}
          <div className="w-full flex items-center justify-center space-x-2 my-5">
            <button
              onClick={() => setPostMatchTab('scoreboard')}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                postMatchTab === 'scoreboard'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'bg-[#111827] border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Nəticələr Cədvəli
            </button>
            {opponent && (
              <button
                onClick={() => setPostMatchTab('inspect')}
                className={`flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  postMatchTab === 'inspect'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#111827] border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Rəqibin Kodunu İncələ ({opponent.username})</span>
              </button>
            )}
          </div>

          {postMatchTab === 'scoreboard' ? (
            /* Results Table */
            <div className="w-full bg-[#0f172a]/90 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#111827] px-6 py-3.5 border-b border-gray-800 flex items-center justify-between text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                <span>Sıra & Oyunçu</span>
                <div className="flex items-center space-x-8">
                  <span>Həll Edildi</span>
                  <span>Ümumi Vaxt</span>
                </div>
              </div>

              <div className="divide-y divide-gray-800/80">
                {sortedLeaderboard.map((player, idx) => {
                  const isMe = player.userId === user.id;
                  const solvedCount = player.solvedQuestionIds?.length || 0;
                  const totalSeconds = ((player.totalTimeMs || 0) / 1000).toFixed(1);

                  return (
                    <div
                      key={player.userId}
                      className={`px-6 py-4 flex items-center justify-between transition-colors ${
                        isMe ? 'bg-cyan-950/30' : 'hover:bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs font-mono ${
                            player.disqualified
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : idx === 0
                              ? 'bg-amber-400 text-black'
                              : idx === 1
                              ? 'bg-gray-300 text-black'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {player.disqualified ? '✕' : idx + 1}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-white flex items-center space-x-2">
                            <span className={player.disqualified ? 'line-through text-gray-400' : ''}>
                              {player.username}
                            </span>
                            {isMe && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300">
                                Siz
                              </span>
                            )}
                            {player.disqualified && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-700/60 font-bold">
                                Kənarlaşdırıldı
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-12 text-sm font-mono font-bold">
                        {player.disqualified ? (
                          <span className="text-rose-400 text-xs font-mono font-bold uppercase">
                            Diskvalifikasiya
                          </span>
                        ) : (
                          <span
                            className={
                              solvedCount === totalQCount
                                ? 'text-emerald-400 font-extrabold'
                                : solvedCount > 0
                                ? 'text-cyan-400'
                                : 'text-gray-500'
                            }
                          >
                            {solvedCount} / {totalQCount}
                          </span>
                        )}
                        <span className="text-gray-400 text-xs w-16 text-right">
                          {player.disqualified ? '-' : `${totalSeconds}s`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Inspect Opponent's Code View */
            <div className="w-full bg-[#0f172a]/95 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-[#111827] px-6 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-gray-300">
                    {opponent?.username} tərəfindən göndərilən həll
                  </span>
                </div>
                {/* Question selector tabs */}
                <div className="flex items-center space-x-1.5">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setInspectQuestionIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        inspectQuestionIndex === idx
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Sual {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-96 w-full relative">
                {isMobile ? (
                  <pre className="p-4 text-xs font-mono text-purple-200 bg-[#0d1117] h-full overflow-y-auto whitespace-pre select-text">
                    {opponentCodeForInspect}
                  </pre>
                ) : (
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={opponentCodeForInspect}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 4,
                      padding: { top: 12 },
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    }}
                  />
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="mt-8 px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/60 transition-all"
          >
            Əsas Lobbiyə Qayıt
          </button>
        </main>
      </div>
    );
  }

  // ===========================================================================
  // 13. WAITING ROOM SCREEN (status === 'waiting')
  // ===========================================================================
  if (status === 'waiting') {
    const isHost = user.id === room?.creator_id;
    const isTournament = room?.mode === 'tournament';

    return (
      <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans select-none">
        <header className="h-16 border-b border-gray-800 bg-[#0f172a] px-4 sm:px-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-xs font-mono text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lobbiyə Qayıt</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Səsi Aç' : 'Səsi Söndür'}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-amber-300">GÖZLƏMƏ ZALI</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 md:p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 shadow-xl shadow-cyan-950/60">
            {isTournament ? <Trophy className="w-8 h-8" /> : <Swords className="w-8 h-8" />}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isTournament ? 'Turnir Gözləmə Otağı' : '1vs1 Duel Otağı'}
          </h2>

          <p className="text-xs text-gray-400 mt-2 max-w-md px-2">
            {isTournament
              ? 'Kodu iştirakçılarla paylaşın. Bütün oyunçular qoşulduqdan sonra yarışı başladın.'
              : 'İkinci oyunçu bu kodu daxil edən kimi yarış avtomatik başlayacaq.'}
          </p>

          {/* Big 6-Character Code Display */}
          <div className="mt-8 bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between w-full max-w-md shadow-2xl">
            <div className="text-left font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">
                Otaq Kodu
              </span>
              <span className="text-2xl font-black text-cyan-300 tracking-[0.2em]">{roomCode}</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Kodu Kopyala</span>
                </>
              )}
            </button>
          </div>

          {/* Live Roster List */}
          <div className="mt-8 w-full max-w-md bg-[#0f172a]/90 border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 text-xs font-mono">
              <span className="text-gray-300 font-bold flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Qoşulan Oyunçular ({participants.length})</span>
              </span>
              <span className="text-purple-400 font-bold">{questions.length} Sual</span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="bg-[#111827] border border-gray-800 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-300">
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-white font-mono">{p.username}</span>
                  </div>
                  {p.userId === user.id && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300">
                      Siz
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tournament Host "Yarışı Başlat" Button */}
          {isTournament && isHost && (
            <button
              onClick={handleStartTournamentMatch}
              className="mt-8 px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-xl shadow-purple-950/60 transition-all flex items-center space-x-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Yarışı Başlat ({participants.length} Oyunçu)</span>
            </button>
          )}

          {isTournament && !isHost && (
            <p className="text-xs font-mono text-gray-500 mt-6 animate-pulse">
              Təşkilatçının yarışı başlatması gözlənilir...
            </p>
          )}

          {!isTournament && (
            <p className="text-xs font-mono text-gray-500 mt-6 animate-pulse">
              İkinci oyunçunun qoşulması gözlənilir...
            </p>
          )}
        </main>
      </div>
    );
  }

  // ===========================================================================
  // 14. ACTIVE ARENA SCREEN (status === 'active')
  // ===========================================================================
  return (
    <div className="flex flex-col min-h-screen md:h-screen w-full bg-[#090d16] text-gray-100 font-sans select-none md:overflow-hidden relative pb-16 md:pb-0">
      {/* ---------------------------------------------------------------------
          PROMINENT HIGH-VISIBILITY WARNING OVERLAY (WARNING 1 & 2)
      ---------------------------------------------------------------------- */}
      {showWarningModal && !isDisqualified && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-[#180a0e] border-2 border-rose-500 rounded-3xl max-w-lg w-full p-8 text-center space-y-5 shadow-2xl shadow-rose-950/80 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border-2 border-rose-500 mx-auto flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950 animate-pulse">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-black text-rose-300 tracking-wider uppercase font-mono">
              ⚠️ Xəbərdarlıq ({showWarningModal.count}/3)
            </h3>

            <div className="p-4 bg-rose-950/50 border border-rose-600/60 rounded-2xl text-xs font-mono text-rose-100 font-bold leading-relaxed shadow-inner">
              ⚠️ XƏBƏRDARLIQ ({showWarningModal.count}/3): Pəncərəni tərk etmək qadağandır! 3-cü xəbərdarlıqda oyundan atılacaqsınız.
            </div>

            <p className="text-[11px] text-gray-400 font-mono">
              Alt+Tab basmaq, pəncərəni kiçiltmək və ya başqa taba keçmək dərhal xəbərdarlıq kimi qeydə alınır.
            </p>

            <button
              onClick={() => setShowWarningModal(null)}
              className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-xl shadow-rose-950/60 transition-all active:scale-95"
            >
              Başa düşdüm, oyuna qayıt
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          FULL-SCREEN DISQUALIFICATION NOTICE (WARNING 3)
      ---------------------------------------------------------------------- */}
      {isDisqualified && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in fade-in">
          <div className="bg-[#1f050a] border-2 border-rose-600 rounded-3xl max-w-lg w-full p-8 text-center space-y-6 shadow-2xl shadow-rose-950 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-rose-950/90 border-2 border-rose-500 mx-auto flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-900/80 animate-bounce">
              <Ban className="w-10 h-10 text-rose-400" />
            </div>

            <h2 className="text-2xl font-black text-rose-400 tracking-wider font-mono">
              DİSKVALİFİKASİYA OLUNDUNUZ!
            </h2>

            <div className="p-4 bg-rose-950/70 border border-rose-600/80 rounded-2xl text-sm font-mono text-rose-100 font-bold leading-relaxed shadow-inner">
              🚫 3 xəbərdarlıq limitini aşdığınız üçün oyundan kənarlaşdırıldınız!
            </div>

            <div className="flex items-center justify-center space-x-2.5 text-xs font-mono text-gray-400 pt-2">
              <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              <span>Əsas menyuya yönləndirilirsiniz (2.5 saniyə)...</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          PLAYER KICKED NOTIFICATION BANNER (FOR REMAINING PLAYERS)
      ---------------------------------------------------------------------- */}
      {kickedNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-rose-950/90 border border-rose-500 text-rose-200 px-5 py-2.5 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-mono font-bold animate-in slide-in-from-top-4 duration-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          <span>{kickedNotification}</span>
          <button
            onClick={() => setKickedNotification(null)}
            className="text-rose-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          TOP BAR: BRANDING, OPPONENT PROGRESS, QUESTION TABS & TIMER
      ---------------------------------------------------------------------- */}
      <header className="h-14 border-b border-gray-800 bg-[#0f172a] px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-md sticky top-0 z-30">
        {/* Left: Branding & Room Code */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 leading-tight">
              CODE CLASH
            </h1>
            <span className="text-[10px] font-mono text-cyan-300 font-bold tracking-wider">
              {roomCode}
            </span>
          </div>

          {/* Opponent Live Status & Solved Progress (Desktop) */}
          {opponentParticipant && (
            <div className="hidden lg:flex items-center space-x-2 pl-3 border-l border-gray-800">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-600/40 text-purple-300 text-xs font-mono">
                <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="font-bold">
                  ⚡ {opponentParticipant.username}: {opponentSolvedCount}/{questions.length} Sual
                </span>
              </div>
              {oppStat?.statusText && (
                <span className="text-[10px] text-gray-400 font-mono italic animate-pulse">
                  {oppStat.statusText}
                </span>
              )}
            </div>
          )}

          {warningCount > 0 && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-600/50 text-[10px] font-mono font-bold">
              <AlertTriangle className="w-3 h-3" />
              <span>{warningCount}/3</span>
            </div>
          )}
        </div>

        {/* Center: Question Tabs (Sual 1, Sual 2, Sual 3...) */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 bg-[#111827] p-1 rounded-xl border border-gray-800 overflow-x-auto scrollbar-none max-w-[125px] xs:max-w-[180px] sm:max-w-none">
          {questions.map((q, idx) => {
            const isSolved = userSolvedIds.includes(q.id);
            const isActive = activeQuestionIndex === idx;

            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestionIndex(idx);
                  setOutputConsole(null);
                  setSelectedTestCaseIndex(0);
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {isSolved ? (
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                )}
                <span>Sual {idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Sound Toggle, Timer & Desktop Submit Button */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Web Audio Mute Toggle Button */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Səsi Aç' : 'Səsi Söndür'}
            className="p-1.5 sm:p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition-all"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            )}
          </button>

          <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm font-mono font-bold text-white bg-gray-900 px-2 sm:px-3 py-1.5 rounded-lg border border-gray-800">
            <Clock
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                remainingSeconds <= 60 ? 'text-rose-400 animate-bounce' : 'text-cyan-400'
              }`}
            />
            <span className={remainingSeconds <= 60 ? 'text-rose-400' : 'text-gray-100'}>
              {formatTimer(remainingSeconds)}
            </span>
          </div>

          {/* Desktop "Kodu Yoxla" Button (Hidden on Mobile) */}
          <button
            onClick={handleSubmitCode}
            disabled={isSubmitting || status !== 'active' || isDisqualified}
            title="Kodu Yoxla (Ctrl + Enter)"
            className={`hidden md:flex items-center space-x-2 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
              isSubmitting
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Yoxlanılır...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Kodu Yoxla</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------------------
          MOBILE 3-TAB SWITCHER BAR (< 768px)
      ---------------------------------------------------------------------- */}
      <div className="md:hidden flex items-center border-b border-gray-800 bg-[#0f172a] px-2 py-1.5 shrink-0 sticky top-14 z-20">
        <button
          type="button"
          onClick={() => setMobileTab('question')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === 'question'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>📄 Sual</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === 'code'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>💻 Kod</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('terminal')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all relative ${
            mobileTab === 'terminal'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🖥️ Terminal</span>
          {outputConsole && (
            <span
              className={`w-2 h-2 rounded-full absolute top-1.5 right-2 ${
                outputConsole.isCorrect ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          )}
        </button>
      </div>

      {/* ---------------------------------------------------------------------
          MOBILE LAYOUT TABS (< 768px)
      ---------------------------------------------------------------------- */}
      <div className="md:hidden flex-1 flex flex-col overflow-y-auto">
        {/* Tab 1: Question Description & Collapsible Leaderboard */}
        {mobileTab === 'question' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <span className="text-xs font-mono font-bold text-gray-300">
                Sual {activeQuestionIndex + 1} / {questions.length} • {currentQuestion?.topic || 'Python'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                Python 3.10
              </span>
            </div>

            <h2 className="text-base font-bold text-white tracking-wide">
              {currentQuestion?.title || 'Sual Yüklənir...'}
            </h2>

            {/* Clean Line Breaks in Problem Statement */}
            <div className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-200 select-text">
              {formatProblemStatement(currentQuestion?.problem_statement)}
            </div>

            {/* Collapsible Mobile Live Leaderboard */}
            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowMobileLeaderboard((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#111827] border border-gray-800 text-xs font-mono font-bold text-gray-300"
              >
                <span className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Canlı Liderlik Cədvəli ({participants.length} Oyunçu)</span>
                </span>
                {showMobileLeaderboard ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {showMobileLeaderboard && (
                <div className="mt-2.5 space-y-2">
                  {renderLeaderboardList()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Full-Height Instant Mobile Code Editor */}
        {mobileTab === 'code' && (
          <div className="p-2 sm:p-3 flex-1 flex flex-col min-h-[420px]">
            <MobileCodeEditor
              value={currentCode}
              onChange={handleEditorChange}
              onReset={handleResetCode}
              activeQuestionIndex={activeQuestionIndex}
            />
          </div>
        )}

        {/* Tab 3: Full-Height Terminal Output & Test Cases */}
        {mobileTab === 'terminal' && (
          <div className="p-2 sm:p-3 flex-1 flex flex-col min-h-[400px]">
            {renderTerminalPanel()}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          DESKTOP MAIN ARENA SPLIT VIEW (>= 768px)
      ---------------------------------------------------------------------- */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden">
        {/* Left Panel: Problem Statement & Live Scoreboard (38%) */}
        <section className="w-[38%] border-r border-gray-800 flex flex-col bg-[#0b0f19] overflow-hidden">
          <div className="h-10 border-b border-gray-800 bg-[#0f172a]/70 px-4 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-300">
              Sual {activeQuestionIndex + 1} / {questions.length} • {currentQuestion?.topic || 'Python'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              Python 3.10
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {currentQuestion?.title || 'Sual Yüklənir...'}
              </h2>
            </div>

            {/* Clean Line Breaks in Problem Statement: font-sans text-sm leading-7 text-slate-200 */}
            <div className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-200 select-text">
              {formatProblemStatement(currentQuestion?.problem_statement)}
            </div>

            {/* Live Scoreboard */}
            <div className="mt-8 pt-4 border-t border-gray-800">
              <h3 className="text-xs font-mono font-bold uppercase text-gray-400 mb-3 flex items-center justify-between">
                <span>Canlı Liderlik Cədvəli</span>
                <span className="text-[10px] text-gray-500">{participants.length} Oyunçu</span>
              </h3>

              {renderLeaderboardList()}
            </div>
          </div>
        </section>

        {/* Right Panel: Pro Monaco Editor (Top 62%) & 2-Tab Terminal Output (Bottom 38%) */}
        <section className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
          {/* Top: Code Editor */}
          <div className="h-[62%] flex flex-col border-b border-gray-800 relative">
            <div className="h-9 bg-[#161b22] px-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono text-gray-300 font-semibold">
                  solution_{activeQuestionIndex + 1}.py
                </span>
                <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                  • Ctrl+Enter ilə yoxla
                </span>
              </div>

              {/* Reset Code Button */}
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                  Avtomatik saxlanılır
                </span>
                <button
                  type="button"
                  onClick={handleResetCode}
                  title="Başlanğıc koda geri qaytar"
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-mono transition-all"
                >
                  <RotateCcw className="w-3 h-3 text-cyan-400" />
                  <span>Kodu Sıfırla</span>
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={currentCode}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                loading={
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-xs space-y-2">
                    <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    <span>Redaktor hazırlanır...</span>
                  </div>
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 12 },
                  renderLineHighlight: 'all',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                }}
              />
            </div>
          </div>

          {/* Bottom: 2-Tab Execution Console Panel (Test Cases vs Raw Console) */}
          <div className="h-[38%] flex flex-col bg-[#0d1117]">
            {renderTerminalPanel()}
          </div>
        </section>
      </div>

      {/* ---------------------------------------------------------------------
          STICKY BOTTOM ACTION BAR ON MOBILE (< 768px)
      ---------------------------------------------------------------------- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-t border-gray-800 p-2.5 flex items-center space-x-2.5 shadow-2xl">
        <button
          type="button"
          onClick={handleSubmitCode}
          disabled={isSubmitting || status !== 'active' || isDisqualified}
          className="flex-1 py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 active:scale-95 text-white flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-950/40 disabled:opacity-40 transition-all"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Yoxlanılır...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>▶ Yoxla</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSubmitCode}
          disabled={isSubmitting || status !== 'active' || isDisqualified}
          className="flex-1 py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-95 text-white flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/40 disabled:opacity-40 transition-all"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Göndərilir...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✓ Təsdiqlə</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
