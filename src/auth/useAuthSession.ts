import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export function useAuthSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !sessionData.session) {
          if (mounted) setSession(null);
          return;
        }

        // Validate session with Supabase server to detect deleted/merged users
        const { error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          console.warn('Stale/invalid auth session detected (401/403), clearing session:', userErr);
          await supabase.auth.signOut();
          if (mounted) setSession(null);
          return;
        }

        if (mounted) setSession(sessionData.session);
      } catch (e) {
        console.warn('Auth check error:', e);
        if (mounted) setSession(null);
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return session;
}
