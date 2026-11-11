   console.log('AUTH V2 LOADED');

import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

// ---------------------------------------------------------------------------
// Shared auth state (one source of truth for the whole app)
// ---------------------------------------------------------------------------
let state: AuthState = { session: null, user: null, loading: true };
let gotEvent = false;
const listeners = new Set<() => void>();

function setAuth(session: Session | null) {
  state = { session, user: session?.user ?? null, loading: false };
  listeners.forEach((l) => l());
}

// Always mirror what Supabase says, including SIGNED_OUT.
supabase.auth.onAuthStateChange((_event, session) => {
  gotEvent = true;
  setAuth(session);
});

// Fallback for versions that don't emit INITIAL_SESSION.
// Never overwrites a newer event with a stale session.
supabase.auth
  .getSession()
  .then(({ data }) => {
    if (!gotEvent) setAuth(data.session);
  })
  .catch(() => {
    if (!gotEvent) setAuth(null);
  });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => state;

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------
export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: profile?.full_name ?? '',
        role: profile?.role ?? 'student',
      },
    },
  });

  if (error) return { data, error };

  if (data.session?.user && profile) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.session.user.id,
      email: email.trim(),
      full_name: profile.full_name,
      role: profile.role,
    });

    if (profileError) {
      console.error('[PROFILE INSERT ERROR]', profileError.message);
    }
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[SIGN OUT ERROR]', error.message);
  }

  return { error: error?.message ?? null };
}