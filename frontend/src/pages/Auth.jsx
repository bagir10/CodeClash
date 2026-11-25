import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Flame,
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function Auth() {
  const isRedirecting =
    typeof window !== 'undefined' &&
    window.location.hash &&
    window.location.hash.includes('access_token=');

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(isRedirecting);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(
    isRedirecting ? 'Giriş təsdiqlənir, zəhmət olmasa gözləyin...' : ''
  );

  // ---------------------------------------------------------------------------
  // ERROR TRANSLATION HELPER (AZERBAIJANI)
  // ---------------------------------------------------------------------------
  const translateError = (msg) => {
    if (!msg) return 'Bilinməyən xəta baş verdi.';
    if (msg.includes('Invalid login credentials')) {
      return 'E-poçt və ya şifrə yanlışdır.';
    }
    if (msg.includes('User already registered') || msg.includes('already exists')) {
      return 'Bu e-poçt ünvanı ilə artıq qeydiyyatdan keçilib.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Şifrə ən azı 6 simvoldan ibarət olmalıdır.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Zəhmət olmasa e-poçt ünvanınızı yoxlayaraq təsdiqləyin.';
    }
    if (msg.includes('rate limit') || msg.includes('Too many requests')) {
      return 'Çox sayda cəhd edildi. Zəhmət olmasa bir qədər gözləyin.';
    }
    return msg;
  };

  // ---------------------------------------------------------------------------
  // GOOGLE OAUTH LOGIN
  // ---------------------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      setGoogleLoading(true);

      const redirectUrl =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : 'https://codeclash.online';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
    } catch (err) {
      setErrorMsg(translateError(err.message));
      setGoogleLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EMAIL / PASSWORD SUBMIT (SIGN IN OR SIGN UP)
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanUser = username.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Zəhmət olmasa bütün tələb olunan sahələri doldurun.');
      return;
    }

    if (isSignUp && !cleanUser) {
      setErrorMsg('Zəhmət olmasa istifadəçi adınızı (ləqəb) daxil edin.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg('Şifrə ən azı 6 simvoldan ibarət olmalıdır.');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        // Sign Up with custom username stored in metadata
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              username: cleanUser,
            },
          },
        });

        if (error) throw error;

        if (data?.user && !data?.session) {
          setSuccessMsg(
            'Qeydiyyat uğurla tamamlandı! Hesabınızı aktivləşdirmək üçün e-poçt ünvanınıza göndərilən təsdiq linkinə keçin.'
          );
        } else {
          setSuccessMsg('Qeydiyyat uğurla tamamlandı!');
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });

        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f172a]/90 backdrop-blur-xl border border-gray-800/80 rounded-3xl p-8 shadow-2xl relative z-10 transition-all duration-300 hover:border-cyan-500/30">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-900/40 mb-4 animate-pulse">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            CODE CLASH
          </h1>
          <p className="text-xs text-gray-400 font-mono tracking-wider mt-1">
            REAL-TIME PYTHON BATTLE ARENA
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex p-1 bg-[#111827] border border-gray-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Daxil ol
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isSignUp
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Qeydiyyat
          </button>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-2.5 px-4 bg-[#111827] hover:bg-gray-800/80 border border-gray-700/80 hover:border-cyan-500/40 rounded-xl text-xs font-bold text-gray-200 transition-all flex items-center justify-center space-x-3 mb-6 shadow-sm disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Google ilə davam et</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-gray-800 w-full" />
          <span className="bg-[#0f172a] px-3 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
            və ya e-poçt ilə
          </span>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-mono text-gray-300 mb-1.5 font-medium">
                İstifadəçi adı (Ləqəb):
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required={isSignUp}
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Məs: ProCoder42"
                  className="w-full bg-[#111827] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-mono text-gray-300 mb-1.5 font-medium">
              E-poçt ünvanı:
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adiniz@example.com"
                className="w-full bg-[#111827] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-mono text-gray-300 mb-1.5 font-medium">
              Şifrə:
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111827] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              />
            </div>
            {isSignUp && (
              <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                Minimum 6 simvol tələb olunur
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Qeydiyyatdan Keç</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Daxil Ol</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <p className="mt-6 text-center text-[11px] text-gray-500 font-mono">
          Code Clash ilə yarışaraq Python bacarıqlarınızı inkişaf etdirin.
        </p>
      </div>
    </div>
  );
}