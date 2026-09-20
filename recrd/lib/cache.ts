// lib/cache.ts
/**
 * A small in-memory cache for things the server has already told us.
 *
 * Screens are re-mounted every time you navigate to them, so without this,
 * stepping into an album and back out asks again for a record that has not
 * changed since — and spends the server's Spotify budget doing it.
 *
 * It lives for as long as the app is open and is never written to disk: it
 * saves repeat trips within a session, and a cold start starts cold.
 */

/** Long enough to cover a session of browsing, short enough to stay current. */
const DEFAULT_TTL_MS = 10 * 60 * 1000;
/** For what does not change: an album's tracks, an artist's name. */
export const LONG_TTL_MS = 60 * 60 * 1000;

const entries = new Map<string, { at: number; value: unknown; ttl: number }>();
// Two screens asking for the same thing at once should make one request.
const inFlight = new Map<string, Promise<unknown>>();

/** What we already hold for `key`, or null. Safe to render immediately. */
export function peekCached<T>(key: string): T | null {
  const hit = entries.get(key);
  if (!hit || Date.now() - hit.at > hit.ttl) return null;
  return hit.value as T;
}

/**
 * Put a value in by hand.
 *
 * For screens that reload themselves anyway — your feed, your profile, your
 * list — where the point is not to skip the request but to have something to
 * show while it runs.
 */
export function storeCached(key: string, value: unknown, ttl: number = DEFAULT_TTL_MS): void {
  entries.set(key, { at: Date.now(), value, ttl });
}

/**
 * Forget everything.
 *
 * Signing out has to leave nothing of the last person behind for the next
 * one — their feed, their profile, their list.
 */
export function clearCache(): void {
  entries.clear();
  inFlight.clear();
}

/** `load()`, unless a fresh answer is already in hand or on its way. */
export function cached<T>(
  key: string,
  load: () => Promise<T>,
  ttl: number = DEFAULT_TTL_MS
): Promise<T> {
  const hit = peekCached<T>(key);
  if (hit !== null) return Promise.resolve(hit);

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = load()
    .then((value) => {
      entries.set(key, { at: Date.now(), value, ttl });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}
