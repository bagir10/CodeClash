import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Swords,
  KeyRound,
  Trophy,
  Flame,
  ArrowRight,
  Plus,
  Trash2,
  Clock,
  FileText,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LogOut,
  Code2,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

const DEFAULT_PYTHON_STARTER = `def solution(nums, target):
    # Python 3 həllinizi buraya yazın
    pass
`;

export default function Lobby() {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // 1. USER SESSION (Synchronized from Supabase in App.jsx)
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
    return {
      id: 'guest',
      username: 'Oyunçu',
      email: '',
    };
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.removeItem('codeclash_user');
      localStorage.removeItem('codeclash_user');
    } catch (err) {
      console.error('Çıxış xətası:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. CARD 1: 1VS1 OTAQ QUR
  // ---------------------------------------------------------------------------
  const [isCreating1v1, setIsCreating1v1] = useState(false);

  const handleCreate1v1Room = async () => {
    try {
      setIsCreating1v1(true);
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '1v1',
          creator_id: user.id,
        }),
      });

      const data = await res.json();
      if (data?.success && data.room?.room_code) {
        navigate(`/room/${data.room.room_code}`);
      } else {
        alert(data?.error || '1vs1 otaq yaradıla bilmədi.');
      }
    } catch (err) {
      alert(`Şəbəkə xətası: ${err.message}`);
    } finally {
      setIsCreating1v1(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. CARD 2: KODLA OTAĞA GİR
  // ---------------------------------------------------------------------------
  const [joinCode, setJoinCode] = useState('');

  const handleJoinByCode = (e) => {
    e.preventDefault();
    const cleanCode = joinCode.toUpperCase().trim();
    if (!cleanCode) return;
    navigate(`/room/${cleanCode}`);
  };

  // ---------------------------------------------------------------------------
  // 4. CARD 3: YARIŞ QUR (CUSTOM TOURNAMENT BUILDER)
  // ---------------------------------------------------------------------------
  const [showTournamentBuilder, setShowTournamentBuilder] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);

  // Stored questions list for the tournament
  const [tournamentQuestions, setTournamentQuestions] = useState([]);

  // Active question input form states (Clean, streamlined)
  const [qTitle, setQTitle] = useState('');
  const [qStatement, setQStatement] = useState('');
  const [qBaseCode, setQBaseCode] = useState(DEFAULT_PYTHON_STARTER);
  const [qTestCases, setQTestCases] = useState([
    { input: '5\n1 2 3 4 5', expectedOutput: '15' },
    { input: '3\n10 20 30', expectedOutput: '60' },
  ]);

  const handleAddTestCase = () => {
    setQTestCases((prev) => [...prev, { input: '', expectedOutput: '' }]);
  };

  const handleUpdateTestCase = (index, field, value) => {
    setQTestCases((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveTestCase = (index) => {
    if (qTestCases.length <= 1) return;
    setQTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuestionToTournament = (e) => {
    e.preventDefault();
    if (!qTitle.trim() || !qStatement.trim()) {
      alert('Zəhmət olmasa sualın başlığını və şərtini doldurun.');
      return;
    }

    const validTestCases = qTestCases.filter(
      (tc) => tc.input.trim() !== '' && tc.expectedOutput.trim() !== ''
    );

    if (validTestCases.length === 0) {
      alert('Ən azı 1 tam test nümunəsi (Giriş və Gözlənilən Çıxış) daxil edin.');
      return;
    }

    // Preserve newlines directly as problem_statement without artificial prefixes
    const cleanStatement = qStatement.replace(/\r\n/g, '\n').trim();

    const newQuestion = {
      title: qTitle.trim(),
      problem_statement: cleanStatement,
      base_code: qBaseCode,
      test_cases: validTestCases,
    };

    setTournamentQuestions((prev) => [...prev, newQuestion]);

    // Reset inputs for the next question
    setQTitle('');
    setQStatement('');
    setQBaseCode(DEFAULT_PYTHON_STARTER);
    setQTestCases([
      { input: '', expectedOutput: '' },
      { input: '', expectedOutput: '' },
    ]);
  };

  const handleRemoveQuestionFromTournament = (index) => {
    setTournamentQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTournament = async () => {
    if (tournamentQuestions.length === 0) {
      alert('Zəhmət olmasa yarış üçün ən azı 1 sual əlavə edin.');
      return;
    }

    try {
      setIsCreatingTournament(true);
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'tournament',
          duration_minutes: Number(durationMinutes) || 30,
          customQuestions: tournamentQuestions,
          creator_id: user.id,
        }),
      });

      const data = await res.json();
      if (data?.success && data.room?.room_code) {
        navigate(`/room/${data.room.room_code}`);
      } else {
        alert(data?.error || 'Turnir otağı yaradıla bilmədi.');
      }
    } catch (err) {
      alert(`Şəbəkə xətası: ${err.message}`);
    } finally {
      setIsCreatingTournament(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans select-none">
      {/* =====================================================================
          HEADER & LOGGED-IN USER INFO
      ====================================================================== */}
      <header className="border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-900/40">
            <Flame className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              CODE CLASH
            </h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-wider">
              REAL-TIME PYTHON BATTLE ARENA
            </p>
          </div>
        </div>

        {/* User Identity & Logout Button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5 bg-[#111827] border border-gray-800 px-3.5 py-1.5 rounded-xl shadow-inner">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase font-mono">
              {user.username ? user.username.charAt(0) : 'U'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white font-mono leading-tight">
                {user.username}
              </span>
              {user.email && (
                <span className="text-[10px] text-gray-500 font-mono leading-none mt-0.5 max-w-[130px] sm:max-w-[200px] truncate">
                  {user.email}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sistemdən çıxış"
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 rounded-xl text-xs font-bold text-rose-300 transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıxış</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN CONTENT AREA
      ====================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        {/* Welcome Tagline */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Avtomatlaşdırılmış Test və Real-Time Kod Döyüşü</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Xoş gəldin,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              {user.username}
            </span>
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            1v1 duelə başla, otaq kodu ilə daxil ol və ya öz xüsusi suallarınla turnir təşkil et.
          </p>
        </div>

        {/* 3 Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* -----------------------------------------------------------------
              CARD 1: 1vs1 Otaq Qur
          ------------------------------------------------------------------ */}
          <div className="bg-[#0f172a]/90 border border-gray-800 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-200 group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                <Swords className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">1vs1 Otaq Qur</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 font-bold">
                  15 DƏQ • 3 SUAL
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                1v1 otaq yaradın və 6 simvollu kod əldə edin. Rəqib koda daxil olan kimi yarış 15
                dəqiqəlik taymer və 3 Python sualı ilə avtomatik başlayacaq.
              </p>

              <div className="mt-5 bg-[#111827] border border-gray-800/80 rounded-xl p-3 space-y-1 text-xs font-mono text-gray-400">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Oyunçu sayı:</span>
                  <strong className="text-cyan-300">2 Oyunçu</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Suallar:</span>
                  <strong className="text-cyan-300">3 Python Alqoritmi</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Müddət:</span>
                  <strong className="text-cyan-300">15 Dəqiqə (900s)</strong>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate1v1Room}
              disabled={isCreating1v1}
              className="mt-6 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isCreating1v1 ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Otaq Yaradılır...</span>
                </>
              ) : (
                <>
                  <span>1vs1 Otaq Yarat</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* -----------------------------------------------------------------
              CARD 2: Kodla Otağa Gir
          ------------------------------------------------------------------ */}
          <div className="bg-[#0f172a]/90 border border-gray-800 hover:border-blue-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-200 group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Kodla Otağa Gir</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 font-bold">
                  TEZ GİRİŞ
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                Dostunuzun və ya turnir təşkilatçısının verdiyi 6 simvollu kodu daxil edərək istənilən
                1v1 duelə və ya turnirə dərhal qoşulun.
              </p>

              <form onSubmit={handleJoinByCode} className="mt-5 space-y-2">
                <label className="text-xs font-mono text-gray-300 font-medium">6 Simvollu Kod:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="MƏS: 8X4K9L"
                  className="w-full bg-[#111827] border border-gray-800 rounded-xl px-4 py-2.5 text-center text-base tracking-[0.25em] font-mono font-bold text-cyan-300 uppercase placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </form>
            </div>

            <button
              onClick={handleJoinByCode}
              disabled={joinCode.trim().length !== 6}
              className="mt-6 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/60 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Otağa Daxil Ol</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* -----------------------------------------------------------------
              CARD 3: Yarış Qur (Custom Tournament)
          ------------------------------------------------------------------ */}
          <div className="bg-[#0f172a]/90 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-200 group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-105 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Yarış Qur (Turnir)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 font-bold">
                  XÜSUSİ TURNİR
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                İstədiyiniz müddəti təyin edin, öz xüsusi Python suallarınızı tək-tək əlavə edin və
                100-ə qədər iştirakçı üçün turnir təşkil edin.
              </p>

              <div className="mt-5 bg-[#111827] border border-gray-800/80 rounded-xl p-3 space-y-1 text-xs font-mono text-gray-400">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Əlavə edilən suallar:</span>
                  <strong className="text-purple-300">{tournamentQuestions.length} Sual</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Maksimum oyunçu:</span>
                  <strong className="text-purple-300">100 Nəfər</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTournamentBuilder((prev) => !prev)}
              className="mt-6 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-950/60 transition-all flex items-center justify-center space-x-2"
            >
              <span>{showTournamentBuilder ? 'Konfiquratoru Gizlə' : 'Turnir Suallarını Təyin Et'}</span>
              {showTournamentBuilder ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* =====================================================================
            CARD 3 EXPANDED: INTERACTIVE TOURNAMENT BUILDER PANEL
        ====================================================================== */}
        {showTournamentBuilder && (
          <div className="mt-8 bg-[#0f172a] border border-purple-500/40 rounded-2xl p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-extrabold text-white">Xüsusi Turnir Yaradıcısı</h3>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Yarış Müddəti (Dəqiqə):</span>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-16 bg-[#111827] border border-gray-700 rounded px-2 py-1 text-center text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
              {/* Form to add questions one-by-one */}
              <div className="lg:col-span-7 bg-[#111827] border border-gray-800/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4" />
                    <span>Yeni Sual Əlavə Et</span>
                  </h4>
                  <span className="text-[11px] font-mono text-gray-500">Python 3</span>
                </div>

                {/* Sualın başlığı */}
                <div>
                  <label className="text-[11px] font-mono text-gray-300 font-medium">Sualın Başlığı:</label>
                  <input
                    type="text"
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                    placeholder="Məs: Ədədlərin Cəmi və ya Two Sum"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white font-mono mt-1 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Məsələnin şərti (Preserves newlines cleanly) */}
                <div>
                  <label className="text-[11px] font-mono text-gray-300 font-medium">
                    Məsələnin Şərti (Problem Statement):
                  </label>
                  <textarea
                    rows={5}
                    value={qStatement}
                    onChange={(e) => setQStatement(e.target.value)}
                    placeholder="Məsələnin mətnini, qaydalarını, giriş-çıxış tələblərini və məhdudiyyətlərini qeyd edin..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-200 mt-1 focus:outline-none focus:border-purple-500 font-sans whitespace-pre-wrap resize-y leading-relaxed"
                  />
                </div>

                {/* Başlanğıc kod */}
                <div>
                  <label className="text-[11px] font-mono text-gray-300 font-medium">
                    Başlanğıc Kodu (Boilerplate):
                  </label>
                  <textarea
                    rows={2}
                    value={qBaseCode}
                    onChange={(e) => setQBaseCode(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-cyan-300 font-mono mt-1 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Yoxlama Testləri (Input & Expected Output rows) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono text-gray-300 font-semibold flex items-center space-x-1.5">
                      <Code2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Yoxlama Testləri ({qTestCases.length}):</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddTestCase}
                      className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center space-x-1 px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/30 hover:border-purple-500/60 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Test Əlavə Et</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                    {qTestCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5">
                          <span className="text-[11px] font-mono text-purple-300 font-bold flex items-center space-x-1">
                            <span>Test #{idx + 1}</span>
                          </span>
                          {qTestCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-gray-500 hover:text-rose-400 p-1 transition-colors rounded"
                              title="Testi sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-mono text-gray-400 mb-1 block">
                              Giriş (Input):
                            </label>
                            <textarea
                              rows={3}
                              value={tc.input}
                              onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                              placeholder={`5\n1 2 3 4 5`}
                              className="w-full bg-gray-900 border border-gray-700/80 rounded-lg p-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500 whitespace-pre resize-y"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-gray-400 mb-1 block">
                              Gözlənilən Çıxış (Expected Output):
                            </label>
                            <textarea
                              rows={3}
                              value={tc.expectedOutput}
                              onChange={(e) =>
                                handleUpdateTestCase(idx, 'expectedOutput', e.target.value)
                              }
                              placeholder={`15`}
                              className="w-full bg-gray-900 border border-gray-700/80 rounded-lg p-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-purple-500 whitespace-pre resize-y"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestionToTournament}
                  className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 transition-colors flex items-center justify-center space-x-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Sualı Turnir Siyahısına Əlavə Et</span>
                </button>
              </div>

              {/* Added Questions List & Final Launch Button */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 pb-2 border-b border-gray-800 flex items-center justify-between">
                    <span>Əlavə Olunmuş Suallar</span>
                    <span className="text-cyan-400 font-mono">{tournamentQuestions.length} Sual</span>
                  </h4>

                  {tournamentQuestions.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-xs font-mono">
                      Hələ sual əlavə edilməyib. Soldakı form vasitəsilə ən azı 1 sual daxil edin.
                    </div>
                  ) : (
                    <div className="space-y-2.5 mt-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                      {tournamentQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          className="bg-[#111827] border border-gray-800 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">
                              #{idx + 1}. {q.title}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">
                              {q.test_cases?.length || 0} Test Nümunəsi
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromTournament(idx)}
                            className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateTournament}
                  disabled={isCreatingTournament || tournamentQuestions.length === 0}
                  className="mt-6 w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-xl shadow-purple-950/60 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
                >
                  {isCreatingTournament ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Turnir Yaradılır...</span>
                    </>
                  ) : (
                    <>
                      <span>Yarışı Yarat ({tournamentQuestions.length} Sual ilə)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-[#0b0f19] py-3 px-6 text-center text-xs text-gray-500 font-mono">
        Code Clash • 1vs1 Duels & Custom Tournament Arena
      </footer>
    </div>
  );
}