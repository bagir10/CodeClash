import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { supabase, supabaseAdmin } from './supabaseClient.js';
import { executePythonCode } from './codeExecutor.js';

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
// 1. DEFAULT SEEDED QUESTIONS (3 CORE PYTHON PROBLEMS)
// =============================================================================

const DEFAULT_SEEDED_QUESTIONS = [
  {
    title: 'İki Ədədin Cəmi (Two Sum)',
    difficulty: 'easy',
    problem_statement: `Verilmiş tam ədədlər massivində (nums) cəmi hədəf ədədə (target) bərabər olan iki ədədin indekslərini tapın və siyahı kimi qaytarın.

Hər bir test üçün yalnız bir düzgün həllin olduğunu və eyni elementi iki dəfə istifadə edə bilməyəcəyinizi qəbul edin.

Nümunə 1:
Giriş: nums = [2, 7, 11, 15], target = 9
Çıxış: [0, 1]

Nümunə 2:
Giriş: nums = [3, 2, 4], target = 6
Çıxış: [1, 2]`,
    base_code: `def solution(nums, target):
    # nums: List[int], target: int -> List[int]
    seen = {}
    for idx, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], idx]
        seen[num] = idx
    return []
`,
    test_cases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
      { input: '[3, 3], 6', expectedOutput: '[0, 1]' },
    ],
    is_public: true,
  },
  {
    title: 'Polindrom Yoxlanışı (Palindrome Check)',
    difficulty: 'easy',
    problem_statement: `Verilmiş mətnin (s) polindrom olub-olmadığını yoxlayın. Polindrom həm sağdan sola, həm də soldan sağa eyni cür oxunan söz və ya cümlələrə deyilir.

Əgər mətn polindromdursa True, əks halda False qaytarın.

Nümunə 1:
Giriş: "radar"
Çıxış: True

Nümunə 2:
Giriş: "clash"
Çıxış: False`,
    base_code: `def solution(s):
    # s: str -> bool
    cleaned = ''.join(c.lower() for c in str(s) if c.isalnum())
    return cleaned == cleaned[::-1]
`,
    test_cases: [
      { input: '"radar"', expectedOutput: 'True' },
      { input: '"clash"', expectedOutput: 'False' },
      { input: '"madam"', expectedOutput: 'True' },
      { input: '"racecar"', expectedOutput: 'True' },
    ],
    is_public: true,
  },
  {
    title: 'Faktorialın Hesablanması (Factorial)',
    difficulty: 'medium',
    problem_statement: `Verilmiş mənfi olmayan tam ədədin (n) faktorialını (n!) hesablayan alqoritmi yazın (0! = 1 qəbul edilir).

Nümunə 1:
Giriş: 5
Çıxış: 120 (5 * 4 * 3 * 2 * 1)

Nümunə 2:
Giriş: 3
Çıxış: 6`,
    base_code: `def solution(n):
    # n: int -> int
    if n <= 1:
        return 1
    total = 1
    for i in range(2, n + 1):
        total *= i
    return total
`,
    test_cases: [
      { input: '5', expectedOutput: '120' },
      { input: '3', expectedOutput: '6' },
      { input: '0', expectedOutput: '1' },
      { input: '6', expectedOutput: '720' },
    ],
    is_public: true,
  },
];

let cachedQuestions = [...DEFAULT_SEEDED_QUESTIONS.map((q, idx) => ({ ...q, id: `seed-q-${idx + 1}` }))];

/**
 * Auto-seeds default Python questions into Supabase if fewer than 3 exist
 */
async function autoSeedQuestions() {
  try {
    const { data: existing, error } = await supabaseAdmin
      .from('questions')
      .select('id, title, difficulty, problem_statement, base_code, test_cases');

    if (!error && Array.isArray(existing)) {
      if (existing.length >= 3) {
        cachedQuestions = existing;
        console.log(`[SEED] Loaded ${existing.length} questions from Supabase library.`);
        return;
      }

      console.log(`[SEED] Supabase has ${existing.length} questions. Auto-seeding default 3 questions...`);
      for (const q of DEFAULT_SEEDED_QUESTIONS) {
        const alreadyExists = existing.some((item) => item.title === q.title);
        if (!alreadyExists) {
          const { data: inserted } = await supabaseAdmin.from('questions').insert(q).select().single();
          if (inserted) {
            existing.push(inserted);
          }
        }
      }
      cachedQuestions = existing.length > 0 ? existing : cachedQuestions;
    }
  } catch (err) {
    console.warn('[SEED] Note: Supabase offline or unreachable, using local memory seed:', err.message);
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
      .select('id, title, difficulty, problem_statement, base_code, test_cases')
      .order('created_at', { ascending: false });

    if (!error && questions && questions.length > 0) {
      cachedQuestions = questions;
      return res.status(200).json({ success: true, questions });
    }

    return res.status(200).json({ success: true, questions: cachedQuestions });
  } catch (err) {
    return res.status(200).json({ success: true, questions: cachedQuestions });
  }
});

/**
 * POST /api/rooms
 */
app.post('/api/rooms', async (req, res) => {
  try {
    const { mode, duration_minutes, customQuestions, creator_id } = req.body;
    const isTournament = mode === 'tournament';
    const roomCode = generateRoomCode();

    let selectedQuestions = [];
    let questionIds = [];

    if (!isTournament) {
      // 1v1 Duel: Pick 3 questions
      await autoSeedQuestions();
      selectedQuestions = cachedQuestions.slice(0, 3);
      if (selectedQuestions.length < 3) {
        selectedQuestions = DEFAULT_SEEDED_QUESTIONS.map((q, idx) => ({ ...q, id: `seed-${idx + 1}` }));
      }
      questionIds = selectedQuestions.map((q) => q.id);
    } else {
      // Tournament Mode: Save custom questions one by one
      if (Array.isArray(customQuestions) && customQuestions.length > 0) {
        for (const cq of customQuestions) {
          const newQ = {
            title: cq.title || 'Xüsusi Sual',
            difficulty: cq.difficulty || 'medium',
            problem_statement: cq.problem_statement || '',
            base_code: cq.base_code || 'def solution():\n    pass\n',
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
              selectedQuestions.push(inserted);
              questionIds.push(inserted.id);
            } else {
              const fallbackQ = { ...newQ, id: crypto.randomUUID() };
              selectedQuestions.push(fallbackQ);
              questionIds.push(fallbackQ.id);
            }
          } catch (e) {
            const fallbackQ = { ...newQ, id: crypto.randomUUID() };
            selectedQuestions.push(fallbackQ);
            questionIds.push(fallbackQ.id);
          }
        }
      }

      if (selectedQuestions.length === 0) {
        selectedQuestions = cachedQuestions.slice(0, 3);
        questionIds = selectedQuestions.map((q) => q.id);
      }
    }

    const durationSeconds = isTournament
      ? (parseInt(duration_minutes, 10) || 30) * 60
      : 900; // 15 mins (900s) for 1v1

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
        questions: newRoom.questions,
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
          questions: room.questions,
          participants: Array.from(room.participants.values()),
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

      return res.status(200).json({ success: true, room });
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

  console.log(`[MATCH ENDED] Room [${roomCode}]. Reason: ${reason}. Winner: ${finalWinner ? finalWinner.username : 'None'}`);

  io.to(roomCode).emit('match_ended', {
    roomCode,
    reason,
    winner: finalWinner,
    totalQuestions: room.questions.length,
    leaderboard: sortedLeaderboard,
    participants: sortedLeaderboard,
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
    questions: room.questions,
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
          solvedQuestionIds: [],
          totalTimeMs: 0,
          disqualified: false,
          joinedAt: new Date().toISOString(),
        };
        room.participants.set(userId, participant);
      }

      socketToUser.set(socket.id, { userId, username: participant.username, roomCode: code });

      io.to(code).emit('roster_update', Array.from(room.participants.values()));

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: code,
          mode: room.mode,
          status: room.status,
          durationSeconds: room.duration_seconds,
          remainingSeconds: room.remainingSeconds,
          questions: room.questions,
          participants: Array.from(room.participants.values()),
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

      console.log(`[EVAL] Executing code for user ${userId} on Question "${targetQuestion.title}" in Room [${codeUpper}]...`);

      const execResult = await executePythonCode(code, targetQuestion.test_cases);

      if (execResult.isCorrect && participant) {
        if (!participant.solvedQuestionIds.includes(questionId)) {
          participant.solvedQuestionIds.push(questionId);
          participant.totalTimeMs += execResult.executionTimeMs || 0;
        }
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          isCorrect: execResult.isCorrect,
          executionTimeMs: execResult.executionTimeMs,
          output: execResult.output,
          error: execResult.error,
          solvedCount: participant ? participant.solvedQuestionIds.length : 0,
          totalQuestions: room.questions.length,
        });
      }

      const sortedLeaderboard = Array.from(room.participants.values()).sort((a, b) => {
        if (a.disqualified && !b.disqualified) return 1;
        if (!a.disqualified && b.disqualified) return -1;
        if (b.solvedQuestionIds.length !== a.solvedQuestionIds.length) {
          return b.solvedQuestionIds.length - a.solvedQuestionIds.length;
        }
        return a.totalTimeMs - b.totalTimeMs;
      });

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

      const participantsList = Array.from(room.participants.values());

      // 2. Broadcast roster_update, scoreboard_update, and player_kicked
      io.to(code).emit('roster_update', participantsList);
      io.to(code).emit('scoreboard_update', participantsList);
      io.to(code).emit('player_kicked', { userId, username });

      // 3. If 1v1 mode and match is active, immediately end the match & award victory to remaining honest player
      if (room.mode === '1v1' && room.status === 'active') {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }

        room.status = 'finished';
        room.ended_at = new Date().toISOString();

        const remainingPlayers = participantsList.filter(
          (p) => !p.disqualified && p.userId !== userId
        );
        const winner = remainingPlayers[0] || null;

        console.log(
          `[1v1 AUTO-WIN] Due to disqualification of ${username}, ${winner ? winner.username : 'remaining player'} automatically wins Room [${code}]!`
        );

        io.to(code).emit('match_ended', {
          roomCode: code,
          reason: 'disqualification',
          winner,
          totalQuestions: room.questions.length,
          leaderboard: participantsList,
          participants: participantsList,
        });
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
