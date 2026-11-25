import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Auth from './pages/Auth';
import Lobby from './pages/Lobby';
import Arena from './components/Arena';
import { Flame } from 'lucide-react';

/**
 * Safely removes OAuth access_token and refresh_token hash fragments
 * or code query params from the browser address bar.
 */
function cleanUrlAuthFragments() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;

  const hasAuthHash =
    window.location.hash &&
    (window.location.hash.includes('access_token=') ||
      window.location.hash.includes('refresh_token=') ||
      window.location.hash.includes('error=') ||
      window.location.hash.includes('error_description='));

  const hasAuthSearch =
    window.location.search &&
    (window.location.search.includes('code=') ||
      window.location.search.includes('error=') ||
      window.location.search.includes('error_description='));

  if (hasAuthHash || hasAuthSearch) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState(null, document.title || '', cleanUrl);
  }
}

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

  // Trigger optional backend sync with VITE_API_URL
  const rawApiUrl = import.meta.env.VITE_API_URL;
  if (rawApiUrl) {
    const apiUrl = rawApiUrl.replace(/\/+$/, '');
    fetch(`${apiUrl}/health`, { method: 'GET' }).catch(() => {});
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';

      // -----------------------------------------------------------------------
      // 1. Process Implicit Grant OAuth Redirect (#access_token=...&refresh_token=...)
      // -----------------------------------------------------------------------
      if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
        try {
          const hashClean = hash.startsWith('#') ? hash.substring(1) : hash;
          const params = new URLSearchParams(hashClean);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token') || '';
          const error = params.get('error') || params.get('error_description');

          if (error) {
            console.error('OAuth redirect error in URL hash:', error);
            cleanUrlAuthFragments();
          } else if (accessToken) {
            // A. Primary: Hand off to Supabase setSession
            try {
              const { data, error: setSessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!setSessionErr && data?.session) {
                if (!isMounted) return;
                setSession(data.session);
                syncUserSession(data.session.user);
                cleanUrlAuthFragments();
                setLoading(false);
                return;
              }
            } catch (setErr) {
              console.warn('supabase.auth.setSession error, trying manual fallback:', setErr);
            }

            // B. Direct Fallback: Validate with Supabase /auth/v1/user with explicit headers
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (supabaseUrl && supabaseAnonKey) {
              try {
                const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
                  headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${accessToken}`,
                  },
                });

                if (userRes.ok) {
                  const userData = await userRes.json();
                  const fallbackSession = {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    user: userData,
                    expires_in: Number(params.get('expires_in')) || 3600,
                  };
                  if (!isMounted) return;
                  setSession(fallbackSession);
                  syncUserSession(userData);
                  cleanUrlAuthFragments();
                  setLoading(false);
                  return;
                }
              } catch (fetchErr) {
                console.error('Direct /auth/v1/user validation error:', fetchErr);
              }
            }
          }
        } catch (err) {
          console.error('Error parsing OAuth hash fragment:', err);
        } finally {
          cleanUrlAuthFragments();
        }
      }

      // -----------------------------------------------------------------------
      // 2. Process PKCE OAuth Redirect (?code=...)
      // -----------------------------------------------------------------------
      if (search && search.includes('code=')) {
        try {
          const params = new URLSearchParams(search);
          const code = params.get('code');
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session) {
              if (!isMounted) return;
              setSession(data.session);
              syncUserSession(data.session.user);
              cleanUrlAuthFragments();
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error exchanging PKCE code:', err);
        } finally {
          cleanUrlAuthFragments();
        }
      }

      // -----------------------------------------------------------------------
      // 3. Fallback: Retrieve existing persistent session from Storage
      // -----------------------------------------------------------------------
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (existingSession && isMounted) {
          setSession(existingSession);
          syncUserSession(existingSession.user);
        }
      } catch (err) {
        console.error('Supabase session load error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // -------------------------------------------------------------------------
    // 4. Real-time auth state listener (SIGN IN, SIGN OUT, REFRESH)
    // -------------------------------------------------------------------------
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        syncUserSession(null);
        setLoading(false);
      } else if (currentSession) {
        setSession(currentSession);
        syncUserSession(currentSession.user);
        cleanUrlAuthFragments();
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
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
