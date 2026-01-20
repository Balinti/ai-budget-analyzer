'use client';

import { useEffect, useState } from 'react';

// Hardcoded Supabase configuration (NOT env vars as per requirements)
const SUPABASE_URL = 'https://api.srv936332.hstgr.cloud';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const APP_SLUG = 'ai-budget-analyzer';

let supabaseClient = null;

export default function GoogleAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Load Supabase client dynamically via CDN
  useEffect(() => {
    const loadSupabase = async () => {
      if (typeof window !== 'undefined' && !window.supabase) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = () => {
          initializeSupabase();
        };
        document.head.appendChild(script);
      } else if (window.supabase) {
        initializeSupabase();
      }
    };

    const initializeSupabase = () => {
      if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabaseReady(true);
      }
    };

    loadSupabase();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    if (!supabaseReady || !supabaseClient) return;

    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await trackUserLogin(session.user);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabaseReady]);

  // Track user login - upsert to user_tracking table
  const trackUserLogin = async (user) => {
    if (!supabaseClient || !user) return;

    try {
      const { error } = await supabaseClient
        .from('user_tracking')
        .upsert(
          {
            user_id: user.id,
            email: user.email,
            app: APP_SLUG,
            last_login_ts: new Date().toISOString(),
            login_cnt: 1
          },
          {
            onConflict: 'user_id,app',
            ignoreDuplicates: false
          }
        );

      if (error) {
        // If upsert with increment doesn't work, try manual approach
        const { data: existing } = await supabaseClient
          .from('user_tracking')
          .select('login_cnt')
          .eq('user_id', user.id)
          .eq('app', APP_SLUG)
          .single();

        if (existing) {
          await supabaseClient
            .from('user_tracking')
            .update({
              login_cnt: (existing.login_cnt || 0) + 1,
              last_login_ts: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('app', APP_SLUG);
        } else {
          await supabaseClient
            .from('user_tracking')
            .insert({
              user_id: user.id,
              email: user.email,
              app: APP_SLUG,
              last_login_ts: new Date().toISOString(),
              login_cnt: 1
            });
        }
      }
    } catch (err) {
      console.error('Error tracking user login:', err);
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    if (!supabaseClient) return;

    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Error signing in with Google:', error.message);
      }
    } catch (err) {
      console.error('Error signing in:', err);
    }
  };

  // Sign out
  const signOut = async () => {
    if (!supabaseClient) return;

    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading || !supabaseReady) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
          {user.email}
        </span>
        <button
          onClick={signOut}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
