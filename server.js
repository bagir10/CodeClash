import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { supabase, supabaseAdmin } from './supabaseClient.js';
import { executePythonCode, getExecutionQueueStats } from './codeExecutor.js';
import { QUESTION_BANK, getQuestionsForDuel } from './questionBank.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

// =============================================================================
// CORS ORIGIN VALIDATOR (Supports localhost, FRONTEND_URL & Vercel subdomains)
// =============================================================================
const rawOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.CLIENT_ORIGIN,
];

const allowedOrigins = rawOrigins
  .filter(Boolean)
  .flatMap((url) => url.split(','))
  .map((url) => url.trim().replace(/\/+$/, ''));

const corsOriginChecker = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, server-to-server health checks)
  if (!origin) return callback(null, true);

  const cleanOrigin = origin.trim().replace(/\/+$/, '');

  // Wildcard check
  if (
    process.env.FRONTEND_URL === '*' ||
    process.env.CLIENT_ORIGIN === '*' ||
    allowedOrigins.includes('*')
  ) {
    return callback(null, true);
  }

  // Exact match
  if (allowedOrigins.includes(cleanOrigin)) {
    return callback(null, true);
  }

  // Auto-allow Vercel deployments and localhost
  try {
    const urlObj = new URL(cleanOrigin);
    if (
      urlObj.hostname.endsWith('.vercel.app') ||
      urlObj.hostname === 'localhost' ||
      urlObj.hostname === '127.0.0.1'
    ) {
      return callback(null, true);
    }
  } catch {}

  console.warn(`[CORS] Blocked request from origin: ${origin}`);
  return callback(null, false);
};

// =============================================================================
// 1. QUESTION LIBRARY & MATCHMAKING ENGINE (30 DIVERSE PROBLEMS)
// =============================================================================

function normalizeQuestion(q) {
  if (!q) return null;
  const bankQ = QUESTION_BANK.find((item) => item.title === q.title || item.id === q.id);
  const starter = bankQ ? bankQ.starter_code : (q.starter_code || q.base_code || 'def solution():\n    # Kodunuzu bura yazın\n    pass\n');
  const testCases = Array.isArray(q.test_cases) ? q.test_cases : [];

  const rawVisible = Array.isArray(q.visible_tests) && q.visible_tests.length > 0
    ? q.visible_tests
    : (testCases.filter((t) => !t.isHidden).length > 0 ? testCases.filter((t) => !t.isHidden) : testCases.slice(0, 2));

  const rawHidden = Array.isArray(q.hidden_tests) && q.hidden_tests.length > 0
    ? q.hidden_tests
    : (testCases.filter((t) => t.isHidden).length > 0 ? testCases.filter((t) => t.isHidden) : testCases.slice(2));

  const visible = rawVisible.map((t, idx) => ({
    input: t.input,
    expectedOutput: t.expectedOutput ?? t.expected_output ?? t.expected,
    testNum: idx + 1,
    isHidden: false,
  }));

  const hidden = rawHidden.map((t, idx) => ({
    input: t.input,
    expectedOutput: t.expectedOutput ?? t.expected_output ?? t.expected,
    testNum: visible.length + idx + 1,
    isHidden: true,
  }));

  const combinedTestCases = [...visible, ...hidden];

  return {
    ...q,
    id: q.id || (bankQ ? bankQ.id : `q-${Math.random().toString(36).slice(2, 9)}`),
    title: q.title || 'Sual',
    difficulty: q.difficulty || 'medium',
    topic: q.topic || 'General',
    problem_statement: q.problem_statement || '',
    starter_code: starter,
    base_code: starter,
    visible_tests: visible,
    hidden_tests: hidden,
    test_cases: combinedTestCases,
    is_public: q.is_public ?? true,
  };
}

/**
 * Strips hidden_tests and test_cases (which contain expected answers) before emitting to clients
 */
function sanitizeQuestionForClient(q) {
  if (!q) return null;
  const normalized = normalizeQuestion(q);
  return {
    id: normalized.id,
    title: normalized.title,
    difficulty: normalized.difficulty,
    topic: normalized.topic,
    problem_statement: normalized.problem_statement,
    starter_code: normalized.starter_code,
    base_code: normalized.base_code,
    visible_tests: normalized.visible_tests,
    test_cases: normalized.visible_tests, // ONLY visible tests are sent to clients!
    is_public: normalized.is_public,
  };
}

let cachedQuestions = QUESTION_BANK.map(normalizeQuestion);

// In-memory anti-repeat question history & Elo ratings
const recentQuestionsByUser = new Map(); // userId -> string[] (up to 25 recent question IDs)
const userEloRatings = new Map(); // userId -> number (default 1200)

function getRecentQuestions(userId) {
  return recentQuestionsByUser.get(userId) || [];
}

function addRecentQuestions(userId, questionIds) {
  if (!userId || !Array.isArray(questionIds)) return;
  const existing = recentQuestionsByUser.get(userId) || [];
  const combined = Array.from(new Set([...questionIds, ...existing])).slice(0, 25);
  recentQuestionsByUser.set(userId, combined);
}

function getUserElo(userId) {
  return userEloRatings.get(userId) || 1200;
}

function calculateEloDeltas(playerA, playerB, winnerId) {
  const ratingA = getUserElo(playerA.userId);
  const ratingB = getUserElo(playerB.userId);
  const K = 32;

  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  let actualA = 0.5;
  let actualB = 0.5;

  if (winnerId) {
    if (winnerId === playerA.userId) {
      actualA = 1;
      actualB = 0;
    } else if (winnerId === playerB.userId) {
      actualA = 0;
      actualB = 1;
    }
  }

  const deltaA = Math.round(K * (actualA - expectedA));
  const deltaB = Math.round(K * (actualB - expectedB));

  const newEloA = Math.max(100, ratingA + deltaA);
  const newEloB = Math.max(100, ratingB + deltaB);

  userEloRatings.set(playerA.userId, newEloA);
  userEloRatings.set(playerB.userId, newEloB);

  return {
    [playerA.userId]: { oldElo: ratingA, newElo: newEloA, delta: deltaA },
    [playerB.userId]: { oldElo: ratingB, newElo: newEloB, delta: deltaB },
  };
}

/**
 * Strips heavy data (e.g. submittedCodes) to send lightweight broadcasts for 30+ participants
 */
function getSanitizedParticipants(room) {
  if (!room || !room.participants) return [];
  return Array.from(room.participants.values()).map((p) => ({
    userId: p.userId,
    username: p.username,
    elo: p.elo || 1200,
    solvedQuestionIds: Array.isArray(p.solvedQuestionIds) ? p.solvedQuestionIds : [],
    solvedCount: Array.isArray(p.solvedQuestionIds) ? p.solvedQuestionIds.length : 0,
    totalTimeMs: p.totalTimeMs || 0,
    disqualified: Boolean(p.disqualified),
    joinedAt: p.joinedAt,
  }));
}

function getSanitizedLeaderboard(room) {
  const sanitized = getSanitizedParticipants(room);
  return sanitized.sort((a, b) => {
    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;
    if (b.solvedCount !== a.solvedCount) {
      return b.solvedCount - a.solvedCount;
    }
    return a.totalTimeMs - b.totalTimeMs;
  });
}

/**
 * Auto-seeds 30 diverse Python problems into Supabase if fewer than 30 exist
 */
async function autoSeedQuestions() {
  try {
    const { data: existing, error } = await supabaseAdmin
      .from('questions')
      .select('id, title, difficulty, topic, problem_statement, starter_code, base_code, visible_tests, hidden_tests, test_cases, is_public');

    if (!error && Array.isArray(existing)) {
      // Anti-cheat: Ensure existing rows in Supabase do not have working solutions in starter_code or base_code
      for (const item of existing) {
        const qBank = QUESTION_BANK.find((q) => q.title === item.title);
        if (qBank) {
          const hasSolution = (item.starter_code && !item.starter_code.includes('# Kodunuzu bura yazın') && item.starter_code.length > 80) ||
                              (item.base_code && !item.base_code.includes('# Kodunuzu bura yazın') && item.base_code.length > 80);
          if (hasSolution) {
            console.log(`[SEED] Sanitizing starter_code for question "${item.title}" in Supabase...`);
            await supabaseAdmin
              .from('questions')
              .update({
                starter_code: qBank.starter_code,
                base_code: qBank.starter_code,
              })
              .eq('id', item.id);
            item.starter_code = qBank.starter_code;
            item.base_code = qBank.starter_code;
          }
        }
      }

      if (existing.length >= 30) {
        cachedQuestions = existing.map(normalizeQuestion);
        console.log(`[SEED] Loaded ${existing.length} questions from Supabase library.`);
        return;
      }

      console.log(`[SEED] Supabase has ${existing.length} questions. Auto-seeding full question bank...`);
      for (const q of QUESTION_BANK) {
        const alreadyExists = existing.some((item) => item.title === q.title);
        if (!alreadyExists) {
          try {
            const { data: inserted } = await supabaseAdmin
              .from('questions')
              .insert({
                title: q.title,
                difficulty: q.difficulty,
                topic: q.topic || 'General',
                problem_statement: q.problem_statement,
                starter_code: q.starter_code,
                base_code: q.starter_code,
                visible_tests: q.visible_tests || [],
                hidden_tests: q.hidden_tests || [],
                test_cases: [...(q.visible_tests || []), ...(q.hidden_tests || [])],
                is_public: true,
              })
              .select()
              .single();

            if (inserted) {
              existing.push(inserted);
            }
          } catch (insertErr) {
            // Ignore individual insert errors
          }
        }
      }
      cachedQuestions = existing.length > 0 ? existing.map(normalizeQuestion) : cachedQuestions;
    }
  } catch (err) {
    console.warn('[SEED] Note: Supabase offline or unreachable, using in-memory question bank:', err.message);
  }
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =============================================================================
// 2. EXPRESS & SOCKET.IO SETUP
// =============================================================================

const app = express();

app.use(
  cors({
    origin: corsOriginChecker,
    credentials: true,
  })
);
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

/**
 * In-memory active rooms store keyed by 6-character room_code (UPPERCASE)
 */
const activeRooms = new Map();
const socketToUser = new Map();

// =============================================================================
// 3. REST API ENDPOINTS
// =============================================================================

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Code Clash Realtime API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    activeRooms: activeRooms.size,
    cachedQuestions: cachedQuestions.length,
    executionQueue: getExecutionQueueStats(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/questions
 */
app.get('/api/questions', async (req, res) => {
  try {
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('id, title, difficulty, topic, problem_statement, base_code, starter_code, visible_tests, is_public')
      .order('created_at', { ascending: false });

    if (!error && questions && questions.length > 0) {
      cachedQuestions = questions.map(normalizeQuestion);
      return res.status(200).json({ success: true, questions: cachedQuestions.map(sanitizeQuestionForClient) });
    }

    return res.status(200).json({ success: true, questions: cachedQuestions.map(sanitizeQuestionForClient) });
  } catch (err) {
    return res.status(200).json({ success: true, questions: cachedQuestions.map(sanitizeQuestionForClient) });
  }
});

/**
 * POST /api/rooms
 */
app.post('/api/rooms', async (req, res) => {
  try {
    const { mode, duration_minutes, customQuestions, creator_id, matchLength } = req.body;
    const isTournament = mode === 'tournament';
    const roomCode = generateRoomCode();

    let selectedQuestions = [];
    let questionIds = [];

    const isClassic = matchLength === 'classic' || matchLength === 5;
    const questionCount = isClassic ? 5 : 3;

    if (!isTournament) {
      // 1v1 Duel: Pick questions with anti-repeat matchmaking based on recent questions and Elo
      await autoSeedQuestions();
      const creatorRecent = getRecentQuestions(creator_id);
      const creatorElo = getUserElo(creator_id);

      selectedQuestions = getQuestionsForDuel({
        count: questionCount,
        excludeIds: creatorRecent,
        playerElo: creatorElo,
      }).map(normalizeQuestion);

      if (selectedQuestions.length < questionCount) {
        selectedQuestions = cachedQuestions.slice(0, questionCount).map(normalizeQuestion);
      }
      questionIds = selectedQuestions.map((q) => q.id);
      addRecentQuestions(creator_id, questionIds);
    } else {
      // Tournament Mode: Save custom questions one by one
      if (Array.isArray(customQuestions) && customQuestions.length > 0) {
        for (const cq of customQuestions) {
          const newQ = {
            title: cq.title || 'Xüsusi Sual',
            difficulty: cq.difficulty || 'medium',
            problem_statement: cq.problem_statement || '',
            base_code: cq.base_code || cq.starter_code || 'def solution():\n    pass\n',
            starter_code: cq.starter_code || cq.base_code || 'def solution():\n    pass\n',
            test_cases: Array.isArray(cq.test_cases) ? cq.test_cases : [],
            is_public: false,
          };

          try {
            const { data: inserted, error: insErr } = await supabaseAdmin
              .from('questions')
              .insert(newQ)
              .select()
              .single();

            if (!insErr && inserted) {
              const norm = normalizeQuestion(inserted);
              selectedQuestions.push(norm);
              questionIds.push(norm.id);
            } else {
              const fallbackQ = normalizeQuestion({ ...newQ, id: crypto.randomUUID() });
              selectedQuestions.push(fallbackQ);
              questionIds.push(fallbackQ.id);
            }
          } catch (e) {
            const fallbackQ = normalizeQuestion({ ...newQ, id: crypto.randomUUID() });
            selectedQuestions.push(fallbackQ);
            questionIds.push(fallbackQ.id);
          }
        }
      }

      if (selectedQuestions.length === 0) {
        await autoSeedQuestions();
        const tournamentQCount = parseInt(req.body.questionCount, 10) || 5;
        selectedQuestions = getQuestionsForDuel({ count: tournamentQCount }).map(normalizeQuestion);
        questionIds = selectedQuestions.map((q) => q.id);
      }
    }

    const durationSeconds = isTournament
      ? (parseInt(duration_minutes, 10) || 30) * 60
      : (isClassic ? 1500 : 900); // 25 mins (1500s) for Classic, 15 mins (900s) for Blitz

    const maxPlayers = isTournament ? 100 : 2;

    const newRoom = {
      id: crypto.randomUUID(),
      room_code: roomCode,
      mode: isTournament ? 'tournament' : '1v1',
      status: 'waiting',
      max_players: maxPlayers,
      duration_seconds: durationSeconds,
      remainingSeconds: durationSeconds,
      creator_id: creator_id || crypto.randomUUID(),
      question_ids: questionIds,
      questions: selectedQuestions,
      participants: new Map(),
      timerInterval: null,
      started_at: null,
      ended_at: null,
    };

    activeRooms.set(roomCode, newRoom);

    try {
      await supabaseAdmin.from('rooms').insert({
        room_code: roomCode,
        title: isTournament ? 'Xüsusi Turnir' : '1vs1 Duel Otağı',
        mode: isTournament ? 'tournament' : 'duel',
        status: 'waiting',
        max_players: maxPlayers,
        duration_seconds: durationSeconds,
      });
    } catch (e) {
      // Ignored for resilience
    }

    console.log(`[ROOM] Created Room [${roomCode}] (${newRoom.mode}) with ${selectedQuestions.length} questions.`);

    return res.status(201).json({
      success: true,
      room: {
        id: newRoom.id,
        room_code: newRoom.room_code,
        mode: newRoom.mode,
        duration_seconds: newRoom.duration_seconds,
        max_players: newRoom.max_players,
        questions: newRoom.questions.map(sanitizeQuestionForClient),
      },
    });
  } catch (error) {
    console.error('[API] Error creating room:', error);
    return res.status(500).json({ success: false, error: 'Otaq yaradılarkən xəta baş verdi.' });
  }
});

/**
 * GET /api/rooms/:code
 */
app.get('/api/rooms/:code', async (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase().trim();
    let room = activeRooms.get(code);

    if (room) {
      return res.status(200).json({
        success: true,
        room: {
          id: room.id,
          room_code: room.room_code,
          mode: room.mode,
          status: room.status,
          max_players: room.max_players,
          duration_seconds: room.duration_seconds,
          remainingSeconds: room.remainingSeconds,
          creator_id: room.creator_id,
          questions: room.questions.map(sanitizeQuestionForClient),
          participants: getSanitizedLeaderboard(room),
          leaderboard: room.leaderboard || getSanitizedLeaderboard(room),
          winner: room.winner || null,
          eloDeltas: room.eloDeltas || null,
          codeSubmissions: room.status === 'finished' ? (room.codeSubmissions || {}) : {},
        },
      });
    }

    const { data: dbRoom, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_code', code)
      .single();

    if (!error && dbRoom) {
      const questions = cachedQuestions.slice(0, 3);
      room = {
        id: dbRoom.id,
        room_code: dbRoom.room_code,
        mode: dbRoom.mode === 'tournament' ? 'tournament' : '1v1',
        status: dbRoom.status || 'waiting',
        max_players: dbRoom.max_players || 2,
        duration_seconds: dbRoom.duration_seconds || 900,
        remainingSeconds: dbRoom.duration_seconds || 900,
        creator_id: dbRoom.creator_id,
        question_ids: questions.map((q) => q.id),
        questions,
        participants: new Map(),
        timerInterval: null,
        started_at: null,
        ended_at: null,
      };
      activeRooms.set(code, room);

      return res.status(200).json({
        success: true,
        room: {
          ...room,
          questions: room.questions.map(sanitizeQuestionForClient),
          participants: [],
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Daxil edilən kodla otaq tapılmadı.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Otaq məlumatları yüklənə bilmədi.' });
  }
});

// =============================================================================
// 4. MATCH LIFECYCLE & COUNTDOWN TIMER CONTROLLER
// =============================================================================

function startMatchCountdown(roomCode) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  room.remainingSeconds = room.duration_seconds;
  console.log(`[TIMER] Started countdown (${room.remainingSeconds}s) for Room [${roomCode}]`);

  room.timerInterval = setInterval(() => {
    room.remainingSeconds -= 1;

    io.to(roomCode).emit('timer_tick', {
      roomCode,
      remainingSeconds: Math.max(0, room.remainingSeconds),
      durationSeconds: room.duration_seconds,
    });

    if (room.remainingSeconds <= 0) {
      concludeMatch(roomCode, 'time_up');
    }
  }, 1000);
}

function concludeMatch(roomCode, reason, winner = null) {
  const room = activeRooms.get(roomCode);
  if (!room || room.status === 'finished') return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  room.status = 'finished';
  room.ended_at = new Date().toISOString();

  const sortedLeaderboard = Array.from(room.participants.values()).sort((a, b) => {
    // Disqualified players always sort to the bottom
    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;

    if (b.solvedQuestionIds.length !== a.solvedQuestionIds.length) {
      return b.solvedQuestionIds.length - a.solvedQuestionIds.length;
    }
    return a.totalTimeMs - b.totalTimeMs;
  });

  const finalWinner =
    winner ||
    sortedLeaderboard.find((p) => !p.disqualified) ||
    sortedLeaderboard[0] ||
    null;

  // Calculate Elo deltas for 1v1 duels
  let eloDeltas = null;
  const participantsList = Array.from(room.participants.values());
  if (room.mode === '1v1' && participantsList.length >= 2) {
    const p1 = participantsList[0];
    const p2 = participantsList[1];
    const winnerId = finalWinner && !finalWinner.disqualified ? finalWinner.userId : null;
    eloDeltas = calculateEloDeltas(p1, p2, winnerId);
  }

  // Gather code submissions for post-match review & update recent questions
  const codeSubmissions = {};
  for (const p of participantsList) {
    codeSubmissions[p.userId] = p.submittedCodes || {};
    addRecentQuestions(p.userId, room.question_ids);
  }

  // Persist post-match state on room for page refreshes
  room.leaderboard = sortedLeaderboard;
  room.winner = finalWinner;
  room.eloDeltas = eloDeltas;
  room.codeSubmissions = codeSubmissions;

  console.log(`[MATCH ENDED] Room [${roomCode}]. Reason: ${reason}. Winner: ${finalWinner ? finalWinner.username : 'None'}`);

  io.to(roomCode).emit('match_ended', {
    roomCode,
    reason,
    winner: finalWinner,
    totalQuestions: room.questions.length,
    leaderboard: sortedLeaderboard,
    participants: sortedLeaderboard,
    eloDeltas,
    codeSubmissions,
  });
}

function launchMatch(roomCode) {
  const room = activeRooms.get(roomCode);
  if (!room || room.status !== 'waiting') return;

  room.status = 'active';
  room.started_at = new Date().toISOString();

  console.log(`[MATCH LAUNCHED] Room [${roomCode}] started with ${room.participants.size} players and ${room.questions.length} questions!`);

  io.to(roomCode).emit('match_started', {
    roomCode,
    mode: room.mode,
    questions: room.questions.map(sanitizeQuestionForClient),
    durationSeconds: room.duration_seconds,
    startedAt: room.started_at,
    participants: Array.from(room.participants.values()),
  });

  startMatchCountdown(roomCode);
}

// =============================================================================
// 5. SOCKET.IO REALTIME EVENTS
// =============================================================================

io.on('connection', (socket) => {
  // join_room ({ roomCode, userId, username })
  socket.on('join_room', async ({ roomCode, userId, username }, callback) => {
    try {
      const code = String(roomCode || '').toUpperCase().trim();
      if (!code) {
        if (typeof callback === 'function') callback({ success: false, error: 'Otaq kodu tələb olunur.' });
        return;
      }

      let room = activeRooms.get(code);

      if (!room) {
        const { data: dbRoom } = await supabaseAdmin.from('rooms').select('*').eq('room_code', code).single();
        if (dbRoom) {
          room = {
            id: dbRoom.id,
            room_code: dbRoom.room_code,
            mode: dbRoom.mode === 'tournament' ? 'tournament' : '1v1',
            status: dbRoom.status || 'waiting',
            max_players: dbRoom.max_players || 2,
            duration_seconds: dbRoom.duration_seconds || 900,
            remainingSeconds: dbRoom.duration_seconds || 900,
            creator_id: dbRoom.creator_id,
            question_ids: cachedQuestions.slice(0, 3).map((q) => q.id),
            questions: cachedQuestions.slice(0, 3),
            participants: new Map(),
            timerInterval: null,
            started_at: null,
            ended_at: null,
          };
          activeRooms.set(code, room);
        }
      }

      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Otaq tapılmadı.' });
        return;
      }

      if (room.status === 'finished') {
        if (typeof callback === 'function') callback({ success: false, error: 'Bu yarış artıq başa çatıb.' });
        return;
      }

      const isAlreadyIn = room.participants.has(userId);

      // Reconnect check: if the room is actively playing, only allow existing players to rejoin
      if (room.status === 'active' && !isAlreadyIn) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Yarış artıq başlayıb. Yeni oyunçular aktiv oyuna qoşula bilməz.' });
        }
        return;
      }

      if (!isAlreadyIn && room.participants.size >= room.max_players) {
        if (typeof callback === 'function') callback({ success: false, error: 'Otaq doludur.' });
        return;
      }

      socket.join(code);

      let participant = room.participants.get(userId);
      if (!participant) {
        participant = {
          userId,
          username: username || `Oyunçu_${Math.floor(100 + Math.random() * 900)}`,
          elo: getUserElo(userId),
          solvedQuestionIds: [],
          submittedCodes: {},
          totalTimeMs: 0,
          disqualified: false,
          joinedAt: new Date().toISOString(),
        };
        room.participants.set(userId, participant);
      } else {
        // Player reconnected: keep existing stats, update username if provided
        if (username) participant.username = username;
      }

      socketToUser.set(socket.id, { userId, username: participant.username, roomCode: code });

      const sanitizedLeaderboard = getSanitizedLeaderboard(room);

      // Broadcast lightweight roster update without code payload
      io.to(code).emit('roster_update', sanitizedLeaderboard);

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: code,
          mode: room.mode,
          status: room.status,
          durationSeconds: room.duration_seconds,
          remainingSeconds: room.remainingSeconds,
          questions: room.questions.map(sanitizeQuestionForClient),
          participants: sanitizedLeaderboard,
          myParticipant: {
            solvedQuestionIds: participant.solvedQuestionIds || [],
            submittedCodes: participant.submittedCodes || {},
            disqualified: Boolean(participant.disqualified),
          },
        });
      }

      // Auto-start 1v1 match when 2nd player joins
      if (room.mode === '1v1' && room.status === 'waiting' && room.participants.size >= 2) {
        console.log(`[AUTO-START] 2 players joined 1v1 Room [${code}]. Launching match!`);
        launchMatch(code);
      }
    } catch (err) {
      console.error('[SOCKET] Error in join_room:', err);
      if (typeof callback === 'function') callback({ success: false, error: 'Otağa qoşularkən xəta baş verdi.' });
    }
  });

  // start_match ({ roomCode })
  socket.on('start_match', ({ roomCode }, callback) => {
    const code = String(roomCode || '').toUpperCase().trim();
    const room = activeRooms.get(code);

    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Otaq tapılmadı.' });
      return;
    }

    if (room.status !== 'waiting') {
      if (typeof callback === 'function') callback({ success: false, error: 'Yarış artıq başladılıb.' });
      return;
    }

    launchMatch(code);

    if (typeof callback === 'function') {
      callback({ success: true, message: 'Yarış uğurla başladıldı.' });
    }
  });

  // update_editor_status ({ roomCode, userId, statusText, activeQuestionIndex })
  socket.on('update_editor_status', ({ roomCode, userId, statusText, activeQuestionIndex }) => {
    const code = String(roomCode || '').toUpperCase().trim();
    socket.to(code).emit('opponent_status', {
      userId,
      statusText: statusText || 'Kod yazır...',
      activeQuestionIndex: typeof activeQuestionIndex === 'number' ? activeQuestionIndex : 0,
    });
  });

  // submit_code ({ roomCode, questionId, code, userId })
  socket.on('submit_code', async (payload, callback) => {
    try {
      const { roomCode, questionId, code, userId } = payload || {};
      const codeUpper = String(roomCode || '').toUpperCase().trim();
      const room = activeRooms.get(codeUpper);

      if (!room || room.status !== 'active') {
        if (typeof callback === 'function') callback({ success: false, error: 'Aktiv yarış tapılmadı.' });
        return;
      }

      const participant = room.participants.get(userId);
      if (participant && participant.disqualified) {
        if (typeof callback === 'function') callback({ success: false, error: 'Diskvalifikasiya edildiyiniz üçün kod göndərə bilməzsiniz.' });
        return;
      }

      const targetQuestion = room.questions.find((q) => q.id === questionId);
      if (!targetQuestion) {
        if (typeof callback === 'function') callback({ success: false, error: 'Sual tapılmadı.' });
        return;
      }

      // Record submitted code for post-match review
      if (participant) {
        if (!participant.submittedCodes) participant.submittedCodes = {};
        participant.submittedCodes[questionId] = code;
      }

      console.log(`[EVAL] Executing code for user ${userId} on Question "${targetQuestion.title}" in Room [${codeUpper}]...`);

      const execResult = await executePythonCode(code, targetQuestion.test_cases);

      const totalTests = typeof execResult.totalTests === 'number'
        ? execResult.totalTests
        : (targetQuestion.test_cases?.length || 0);
      const passedTests = typeof execResult.totalPassedTests === 'number'
        ? execResult.totalPassedTests
        : 0;

      // Strict anti-cheat: Must have > 0 tests and ALL visible + hidden tests must pass with zero error
      const isSolved = Boolean(execResult.isCorrect) &&
        totalTests > 0 &&
        passedTests === totalTests &&
        !execResult.error;

      if (isSolved && participant) {
        if (!participant.solvedQuestionIds.includes(questionId)) {
          participant.solvedQuestionIds.push(questionId);
          participant.totalTimeMs += execResult.executionTimeMs || 0;
        }
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          isCorrect: isSolved,
          executionTimeMs: execResult.executionTimeMs,
          output: execResult.output,
          error: execResult.error,
          totalPassedTests: passedTests,
          totalTests,
          testResults: execResult.testResults || [],
          solvedCount: participant ? participant.solvedQuestionIds.length : 0,
          totalQuestions: room.questions.length,
        });
      }

      // Broadcast opponent live progress to the other player(s)
      socket.to(codeUpper).emit('opponent_progress', {
        userId,
        username: participant ? participant.username : 'Rəqib',
        solvedCount: participant ? participant.solvedQuestionIds.length : 0,
        totalQuestions: room.questions.length,
        questionId,
        isCorrect: isSolved,
      });

      const sortedLeaderboard = getSanitizedLeaderboard(room);
      io.to(codeUpper).emit('scoreboard_update', sortedLeaderboard);

      // In 1v1 mode, if a player solves ALL questions, conclude the match
      if (room.mode === '1v1' && participant && participant.solvedQuestionIds.length >= room.questions.length) {
        console.log(`[1v1 VICTORY] ${participant.username} solved all ${room.questions.length} questions in Room [${codeUpper}]!`);
        concludeMatch(codeUpper, 'all_solved', participant);
      }
    } catch (err) {
      console.error('[SUBMISSION ERROR]', err);
      if (typeof callback === 'function') callback({ success: false, error: 'Yoxlanış zamanı xəta baş verdi.' });
    }
  });

  // cheat_detected ({ roomCode, userId, username, count, violationType })
  socket.on('cheat_detected', async ({ roomCode, userId, username, count, violationType }) => {
    const code = String(roomCode || '').toUpperCase().trim();
    console.warn(`[CHEAT ALERT] ${username} triggered warning #${count} [${violationType || 'ALT_TAB_OR_BLUR'}] in Room [${code}]`);

    io.to(code).emit('cheat_alert', {
      roomCode: code,
      userId,
      username,
      count: count || 1,
      violationType: violationType || 'ALT_TAB_OR_BLUR',
      timestamp: new Date().toISOString(),
    });
  });

  // player_disqualified ({ roomCode, userId, username })
  socket.on('player_disqualified', ({ roomCode, userId, username }) => {
    try {
      const code = String(roomCode || '').toUpperCase().trim();
      const room = activeRooms.get(code);
      if (!room) return;

      console.warn(`[ANTI-CHEAT DISQUALIFIED] ${username} (${userId}) was disqualified from Room [${code}] (3 warnings limit reached).`);

      // 1. Mark participant as disqualified
      const participant = room.participants.get(userId);
      if (participant) {
        participant.disqualified = true;
      }

      const sanitizedLeaderboard = getSanitizedLeaderboard(room);

      // 2. Broadcast roster_update, scoreboard_update, and player_kicked
      io.to(code).emit('roster_update', sanitizedLeaderboard);
      io.to(code).emit('scoreboard_update', sanitizedLeaderboard);
      io.to(code).emit('player_kicked', { userId, username });

      // 3. If 1v1 mode and match is active, conclude the match with the other player as winner
      if (room.mode === '1v1' && room.status === 'active') {
        const remainingPlayers = participantsList.filter(
          (p) => !p.disqualified && p.userId !== userId
        );
        const winner = remainingPlayers[0] || null;

        console.log(
          `[1v1 AUTO-WIN] Due to disqualification of ${username}, ${winner ? winner.username : 'remaining player'} automatically wins Room [${code}]!`
        );

        concludeMatch(code, 'disqualification', winner);
      }
    } catch (err) {
      console.error('[SOCKET] Error in player_disqualified handler:', err);
    }
  });

  // disconnect
  socket.on('disconnect', () => {
    const userMeta = socketToUser.get(socket.id);
    if (userMeta && userMeta.roomCode) {
      const room = activeRooms.get(userMeta.roomCode);
      if (room) {
        io.to(userMeta.roomCode).emit('player_left', {
          userId: userMeta.userId,
          username: userMeta.username,
        });

        if (room.status === 'finished' && room.participants.size === 0) {
          activeRooms.delete(userMeta.roomCode);
        }
      }
    }
    socketToUser.delete(socket.id);
  });
});

// =============================================================================
// 6. START ENGINE & AUTO-SEED
// =============================================================================

server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`⚔️  CODE CLASH: PRODUCTION REALTIME ENGINE ACTIVE`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Allowed Origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'All (*)'}`);
  console.log(`🎯 1vs1 Duels • Kodla Giriş • Xüsusi Turnirlər`);
  console.log(`🛡️  Enhanced Anti-Cheat: Alt+Tab & Tab-Switch 3-Strike Detection`);
  console.log(`=======================================================`);
  await autoSeedQuestions();
});

export { app, server, io };
