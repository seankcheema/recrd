// lib/genres.ts
import { useEffect, useState } from 'react';
import { apiJson } from './session';
import { cached, LONG_TTL_MS, peekCached } from './cache';

/**
 * Coarse genres for a set of albums, keyed by album id.
 *
 * The backend folds Spotify's very fine-grained genres into the buckets the
 * app shows, and an album can sit in more than one. Results come back empty
 * until the lookup lands, so callers should treat "no genres yet" as "don't
 * filter anything out".
 */
export function useAlbumGenres(albumIds: string[]): Record<string, string[]> {
  // A joined key, so the effect only re-runs when the actual ids change.
  const key = albumIds.join(',');
  // An album's genre does not move — the server holds these for a day — so a
  // list you have already opened needs no lookup at all.
  const [genres, setGenres] = useState<Record<string, string[]>>(
    () => peekCached<Record<string, string[]>>(`genres:${key}`) ?? {}
  );

  useEffect(() => {
    if (!key) {
      setGenres({});
      return;
    }
    let cancelled = false;
    cached<Record<string, string[]>>(
      `genres:${key}`,
      () =>
        apiJson<Record<string, string[]>>(
          `/album_genres/?albumIds=${encodeURIComponent(key)}`
        ),
      LONG_TTL_MS
    )
      .then((data) => {
        if (!cancelled) setGenres(data || {});
      })
      .catch(() => {
        // A genre lookup failing just means no filter chips; not worth an error.
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return genres;
}
