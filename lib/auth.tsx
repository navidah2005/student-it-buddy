// lib/auth.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// If later you add Supabase, you can import it here and merge sessions.
// import { supabase } from './supabase';

export type LocalUser = {
  id: string;           // timestamp id
  firstName: string;
  lastName: string;
  city: string;
  email?: string;
  phone?: string;
  avatarUri?: string;
};

type AuthCtx = {
  session: LocalUser | null;  // Local session object (treat truthy as "signed in")
  loading: boolean;
  signOut: () => Promise<void>;

  // Local sign up/in (works offline today)
  localSignUp: (u: Omit<LocalUser, 'id'>) => Promise<{ error?: string }>;
  localSignIn: (emailOrPhone: string) => Promise<{ error?: string }>;

  // Profile updates
  updateProfile: (patch: Partial<LocalUser>) => Promise<void>;
};

const LOCAL_SESSION_KEY = 'auth:local:session';
const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load local session on boot
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
        if (raw) setSession(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (user: LocalUser | null) => {
    setSession(user);
    if (user) await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(LOCAL_SESSION_KEY);
  };

  const localSignUp: AuthCtx['localSignUp'] = async (u) => {
    const id = String(Date.now());
    const user: LocalUser = { id, ...u };
    await persist(user);
    return {};
  };

  // naive local sign-in: match by email OR phone
  const localSignIn: AuthCtx['localSignIn'] = async (emailOrPhone) => {
    const raw = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return { error: 'No account found on this device. Please sign up.' };
    const user = JSON.parse(raw) as LocalUser;
    const ok =
      (user.email && user.email.trim().toLowerCase() === emailOrPhone.trim().toLowerCase()) ||
      (user.phone && user.phone.trim() === emailOrPhone.trim());
    if (!ok) return { error: 'Email/phone does not match the saved account on this device.' };
    await persist(user);
    return {};
  };

  const updateProfile: AuthCtx['updateProfile'] = async (patch) => {
    if (!session) return;
    const next = { ...session, ...patch };
    await persist(next);
  };

  const signOut = async () => {
    // If you add Supabase later: await supabase.auth.signOut();
    await persist(null);
  };

  const value: AuthCtx = {
    session,
    loading,
    signOut,
    localSignUp,
    localSignIn,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider/>');
  return v;
}