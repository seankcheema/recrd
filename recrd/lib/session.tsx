// app/components/session.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, UploadType } from 'expo-file-system';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Linking from 'expo-linking';
import { API_URL } from './api';
import { clearCache } from './cache';

const ACCESS_KEY = 'recrd.accessToken';
const REFRESH_KEY = 'recrd.refreshToken';

export interface Me {
  uid: string;
  name: string;
  username: string | null;
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
    username: string,
    email: string,
    password: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  /** Email a recovery code. Resolves the same way whether or not the
   *  address has an account. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Spend a recovery code on a new password and sign in. */
  resetPassword: (email: string, code: string, next: string) => Promise<void>;
  /** Deletes the account for good, then signs out. */
  deleteAccount: (password: string) => Promise<void>;
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
  // FormData carries its own multipart content type, boundary and all.
  // Forcing JSON onto it leaves the server with a body it cannot parse, so
  // uploads have to be left alone here.
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
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
 * Upload a local file to the API, with the bearer token attached.
 *
 * Not authFetch: expo's fetch replaces the global one and its FormData takes
 * only strings and blobs, so React Native's `{ uri }` file part — the usual
 * way to upload from a picker — dies on the way out as "Unsupported
 * FormDataPart implementation". The native uploader takes the file straight
 * off disk instead, which also keeps a large photo out of JS memory.
 */
export async function authUpload(
  path: string,
  fileUri: string,
  { mimeType, fieldName = 'file' }: { mimeType?: string; fieldName?: string } = {}
): Promise<any> {
  const send = () =>
    new File(fileUri).upload(`${API_URL}${path}`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName,
      mimeType,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

  let result = await send();
  if (result.status === 401 || result.status === 403) {
    if (await tryRefresh()) {
      result = await send();
    } else {
      onUnauthorized?.();
    }
  }

  let data: any = null;
  try {
    data = result.body ? JSON.parse(result.body) : null;
  } catch {
    data = null;
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(errorMessage(data, `upload failed (${result.status})`));
  }
  return data;
}

/**
 * Turn FastAPI's `detail` into something worth showing a person.
 *
 * It is a string for our own HTTPExceptions but a list of
 * `{loc, msg, type}` objects for request-validation failures, which stringify
 * to "[object Object]" if handed straight to Error().
 */
/** True for a string that is really a serialised object or array. */
function looksLikeRawData(text: string): boolean {
  const trimmed = text.trim();
  return /^[[{]/.test(trimmed) || trimmed.startsWith("{'");
}

export function errorMessage(data: any, fallback: string): string {
  const detail = data?.detail;
  // A failure deep in the server can arrive as whatever the driver printed —
  // a dict of constraint names and hints. That is not something to show
  // somebody who was only trying to sign up.
  if (typeof detail === 'string' && detail.trim()) {
    return looksLikeRawData(detail) ? fallback : detail;
  }

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
    // Nothing of this account is left for whoever signs in next.
    clearCache();
    if (mounted.current) setMe(null);
  }, []);

  // Restore a saved session on cold start.
  useEffect(() => {
    onUnauthorized = () => {
      persistTokens(null, null);
      clearCache();
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
    async (name: string, username: string, email: string, password: string) => {
      const resp = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim(),
          password,
          // Whatever address this copy of the app answers to: a recrd:// link
          // in a build, an exp:// one in Expo Go. Either opens the app from
          // the phone's mail client, which a localhost link cannot.
          redirectTo: Linking.createURL('/components/Login'),
        }),
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

  const requestPasswordReset = useCallback(async (email: string) => {
    const resp = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!resp.ok) {
      throw new Error(errorMessage(await readJson(resp), 'Could not send that email'));
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, next: string) => {
      const resp = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: next,
        }),
      });
      const data = await readJson(resp);
      if (!resp.ok) throw new Error(errorMessage(data, 'Could not reset your password'));
      await persistTokens(data.accessToken, data.refreshToken);
      await loadMe();
    },
    [loadMe]
  );

  const changePassword = useCallback(async (current: string, next: string) => {
    await apiJson('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
  }, []);

  const deleteAccount = useCallback(
    async (password: string) => {
      await apiJson('/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      await signOut();
    },
    [signOut]
  );

  const value = useMemo(
    () => ({
      me,
      ready,
      signIn,
      signUp,
      signOut,
      refreshMe: loadMe,
      changePassword,
      requestPasswordReset,
      resetPassword,
      deleteAccount,
    }),
    [
      me,
      ready,
      signIn,
      signUp,
      signOut,
      loadMe,
      changePassword,
      requestPasswordReset,
      resetPassword,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
