import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Sparkles,
  HelpCircle,
  FileCode,
  Layers,
  Send,
  AlertCircle,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const API_BASE_URL = API_URL;

const STARTER_PYTHON_CODE = `def solution(nums, target):
    # Write your Python 3 algorithm here
    pass
`;

export default function TeacherLibrary() {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [problemStatement, setProblemStatement] = useState('');
  const [baseCode, setBaseCode] = useState(STARTER_PYTHON_CODE);

  // Dynamic Test Cases Builder: [{ input: '', expectedOutput: '' }]
  const [testCases, setTestCases] = useState([
    { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
    { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
  ]);

  // Current Teacher Identity from localStorage
  const user = JSON.parse(localStorage.getItem('codeclash_user') || '{}');

  // ---------------------------------------------------------------------------
  // 1. FETCH QUESTIONS LIBRARY
  // ---------------------------------------------------------------------------
  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/questions`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. DYNAMIC TEST CASE BUILDER HELPERS
  // ---------------------------------------------------------------------------
  const handleAddTestCase = () => {
    setTestCases((prev) => [...prev, { input: '', expectedOutput: '' }]);
  };

  const handleUpdateTestCase = (index, field, value) => {
    setTestCases((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length <= 1) {
      alert('A question must contain at least one test case for automated validation.');
      return;
    }
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------------
  // 3. SUBMIT NEW QUESTION
  // ---------------------------------------------------------------------------
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!title.trim() || !problemStatement.trim()) {
      setErrorMessage('Please fill in both the Title and the Problem Statement.');
      return;
    }

    const validTestCases = testCases.filter(
      (tc) => tc.input.trim() !== '' && tc.expectedOutput.trim() !== ''
    );

    if (validTestCases.length === 0) {
      setErrorMessage('Please configure at least one complete test case (Input and Expected Output).');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`${API_URL}/api/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          difficulty,
          problem_statement: problemStatement.trim(),
          base_code: baseCode,
          test_cases: validTestCases,
          created_by: user.id || null,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        setSuccessMessage(`Question "${title}" successfully added to the library!`);
        // Reset form
        setTitle('');
        setDifficulty('medium');
        setProblemStatement('');
        setBaseCode(STARTER_PYTHON_CODE);
        setTestCases([
          { input: '', expectedOutput: '' },
          { input: '', expectedOutput: '' },
        ]);
        // Refresh question list
        await fetchQuestions();
      } else {
        setErrorMessage(data?.error || 'Failed to save question.');
      }
    } catch (err) {
      setErrorMessage(`Network error while saving question: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans select-none">
      {/* =====================================================================
          HEADER & NAVIGATION
      ====================================================================== */}
      <header className="border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors flex items-center space-x-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lobby</span>
          </button>
          <div className="h-5 w-[1px] bg-gray-700" />
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                Teacher Question Library
              </h1>
              <p className="text-[10px] text-gray-400 font-mono">
                Curate problems & automated test cases for exams & tournaments
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-gray-400 bg-[#111827] px-3.5 py-1.5 rounded-full border border-gray-800">
          Total Problems: <span className="text-cyan-400 font-bold">{questions.length}</span>
        </div>
      </header>

      {/* =====================================================================
          MAIN SPLIT VIEW: Form (Left) & Existing Library (Right)
      ====================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* -------------------------------------------------------------------
            LEFT COLUMN (5 cols): CREATE QUESTION FORM
        -------------------------------------------------------------------- */}
        <section className="lg:col-span-5 bg-[#0f172a]/90 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-800">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Create New Python Problem
              </h2>
            </div>

            {/* Notification Badges */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              {/* Title & Difficulty */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-mono text-gray-300 font-medium">Problem Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Reverse Linked List"
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-gray-300 font-medium">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono mt-1"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Problem Statement */}
              <div>
                <label className="text-xs font-mono text-gray-300 font-medium">
                  Problem Description (Markdown / Plain Text)
                </label>
                <textarea
                  rows={4}
                  required
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="Explain the problem rules, edge cases, and expected return type..."
                  className="w-full bg-[#111827] border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-sans mt-1 leading-relaxed"
                />
              </div>

              {/* Starter Code */}
              <div>
                <label className="text-xs font-mono text-gray-300 font-medium flex items-center justify-between">
                  <span>Starter Boilerplate (Python 3)</span>
                  <span className="text-[10px] text-gray-500">Function Signature</span>
                </label>
                <textarea
                  rows={3}
                  value={baseCode}
                  onChange={(e) => setBaseCode(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-800 rounded-lg p-2.5 text-xs text-cyan-300 focus:outline-none focus:border-purple-500 font-mono mt-1"
                />
              </div>

              {/* Dynamic Test Cases Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-gray-300 font-medium flex items-center space-x-1">
                    <span>Validation Test Cases</span>
                    <span className="text-purple-400 font-bold">({testCases.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="flex items-center space-x-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Test Case</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                  {testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="bg-[#111827] border border-gray-800 rounded-lg p-2.5 flex items-center space-x-2"
                    >
                      <span className="text-[10px] font-mono text-gray-500 font-bold w-4">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={tc.input}
                          onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                          placeholder="Input: [2, 7], 9"
                          className="bg-gray-900 border border-gray-700/60 rounded px-2 py-1 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-purple-500"
                        />
                        <input
                          type="text"
                          required
                          value={tc.expectedOutput}
                          onChange={(e) => handleUpdateTestCase(idx, 'expectedOutput', e.target.value)}
                          placeholder="Expected: [0, 1]"
                          className="bg-gray-900 border border-gray-700/60 rounded px-2 py-1 text-[11px] font-mono text-emerald-400 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete test case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-950/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Save Question to Library</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            RIGHT COLUMN (7 cols): EXISTING QUESTIONS CATALOG
        -------------------------------------------------------------------- */}
        <section className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Available Questions in Database</span>
            </h2>
            <button
              onClick={fetchQuestions}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Refresh List
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-3" />
              <span className="text-xs font-mono">Loading question catalog...</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-[#0f172a]/50 border border-gray-800 rounded-2xl p-10 text-center text-gray-500">
              <Code2 className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-semibold">No questions found in library.</p>
              <p className="text-xs text-gray-500 mt-1">
                Use the form on the left to add your first coding challenge.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-170px)] pr-2 scrollbar-thin scrollbar-thumb-gray-800">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-[#0f172a]/80 border border-gray-800 hover:border-gray-700 rounded-xl p-4 shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white tracking-wide">{q.title}</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase border ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                          : q.difficulty === 'hard'
                          ? 'bg-rose-950/70 text-rose-400 border-rose-500/30'
                          : 'bg-amber-950/70 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {q.problem_statement}
                  </p>

                  <div className="bg-[#111827] rounded-lg p-2 font-mono text-[11px] text-cyan-300 border border-gray-800/80 overflow-x-auto">
                    <code>{q.base_code || 'def solution(): pass'}</code>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1">
                    <span>
                      Created: {new Date(q.created_at || Date.now()).toLocaleDateString()}
                    </span>
                    <span className="text-gray-400">UUID: {q.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}