// app/components/session.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API_URL } from './api';

const ACCESS_KEY = 'recrd.accessToken';
const REFRESH_KEY = 'recrd.refreshToken';

export interface Me {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface AuthValue {
  me: Me | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// Kept outside React state so authFetch can read it without a re-render.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

async function persistTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (access && refresh) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, access],
      [REFRESH_KEY, refresh],
    ]);
  } else {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const resp = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    await persistTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * fetch() with the bearer token attached. On a 401 it refreshes the session
 * once and replays the request; if that fails the user is signed out.
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

  let resp = await send();
  if (resp.status === 401 || resp.status === 403) {
    if (await tryRefresh()) {
      resp = await send();
    } else {
      onUnauthorized?.();
    }
  }
  return resp;
}

/**
 * Turn FastAPI's `detail` into something worth showing a person.
 *
 * It is a string for our own HTTPExceptions but a list of
 * `{loc, msg, type}` objects for request-validation failures, which stringify
 * to "[object Object]" if handed straight to Error().
 */
export function errorMessage(data: any, fallback: string): string {
  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
        const msg = item?.msg;
        if (!msg) return null;
        return field && field !== 'body' ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('\n');
  }

  if (detail && typeof detail === 'object') {
    const msg = (detail as any).msg ?? (detail as any).message;
    if (typeof msg === 'string') return msg;
  }

  return fallback;
}

/** authFetch + JSON parsing + error messages lifted out of FastAPI's `detail`. */
export async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await authFetch(path, init);
  const text = await resp.text();

  // An error page can come back as plain text, so never let parsing throw.
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!resp.ok) {
    throw new Error(errorMessage(data, `request failed (${resp.status})`));
  }
  return data as T;
}

async function readJson(resp: Response): Promise<any> {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadMe = useCallback(async () => {
    if (!accessToken) {
      if (mounted.current) setMe(null);
      return;
    }
    try {
      const data = await apiJson<Me>('/auth/me');
      if (mounted.current) setMe(data);
    } catch {
      if (mounted.current) setMe(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    await persistTokens(null, null);
    if (mounted.current) setMe(null);
  }, []);

  // Restore a saved session on cold start.
  useEffect(() => {
    onUnauthorized = () => {
      persistTokens(null, null);
      if (mounted.current) setMe(null);
    };
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
        accessToken = pairs[0][1];
        refreshToken = pairs[1][1];
        if (accessToken) {
          await loadMe();
        }
      } finally {
        if (mounted.current) setReady(true);
      }
    })();
    return () => {
      onUnauthorized = null;
    };
  }, [loadMe]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await readJson(resp);
      if (!resp.ok) throw new Error(errorMessage(data, 'Login failed'));
      await persistTokens(data.accessToken, data.refreshToken);
      await loadMe();
    },
    [loadMe]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const resp = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await readJson(resp);
      if (!resp.ok) throw new Error(errorMessage(data, 'Sign up failed'));

      // Supabase only hands back a session when email confirmation is off.
      if (!data.accessToken) return { needsConfirmation: true };

      await persistTokens(data.accessToken, data.refreshToken);
      await loadMe();
      return { needsConfirmation: false };
    },
    [loadMe]
  );

  const value = useMemo(
    () => ({ me, ready, signIn, signUp, signOut, refreshMe: loadMe }),
    [me, ready, signIn, signUp, signOut, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
