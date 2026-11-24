import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Auth from './pages/Auth';
import Lobby from './pages/Lobby';
import Arena from './components/Arena';
import { Flame } from 'lucide-react';

/**
 * Helper to sync user profile data to BOTH sessionStorage and localStorage
 * under the key 'codeclash_user' for seamless Arena & Lobby integration.
 */
function syncUserSession(user) {
  if (!user) {
    sessionStorage.removeItem('codeclash_user');
    localStorage.removeItem('codeclash_user');
    return;
  }

  const username =
    user.user_metadata?.username ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : `Oyunçu_${Math.floor(1000 + Math.random() * 9000)}`);

  const identity = {
    id: user.id,
    username: username,
    email: user.email || '',
  };

  sessionStorage.setItem('codeclash_user', JSON.stringify(identity));
  localStorage.setItem('codeclash_user', JSON.stringify(identity));
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial session check on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        setSession(initialSession);
        syncUserSession(initialSession?.user);
      })
      .catch((err) => {
        console.error('Supabase session load error:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Real-time auth state listener (Sign In, Sign Out, Token Refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      syncUserSession(currentSession?.user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sleek dark loading splash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/50 animate-pulse">
          <Flame className="w-7 h-7 text-white" />
        </div>
        <p className="text-xs font-mono text-gray-400 tracking-wider animate-pulse">
          CODE CLASH YÜKLƏNİR...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!session ? (
        <Auth />
      ) : (
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Arena />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}