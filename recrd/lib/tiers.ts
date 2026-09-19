// app/components/tiers.ts
// album_entries.rank is a 1-10 score; the app shows it as a tier letter.
// Keep these bounds in step with TIER_BOUNDS in backend/social.py.

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

export const TIER_COLORS: Record<Tier, string> = {
  S: '#6D3B99',
  A: '#993B3B',
  B: '#99573B',
  C: '#45993B',
  D: '#3B6499',
};

export function tierForRank(rank: number): Tier {
  if (rank >= 9) return 'S';
  if (rank >= 7) return 'A';
  if (rank >= 5) return 'B';
  if (rank >= 3) return 'C';
  return 'D';
}

/** The score written to the database when someone taps a tier. */
export const TIER_DEFAULT_RANK: Record<Tier, number> = {
  S: 10,
  A: 8,
  B: 6,
  C: 4,
  D: 2,
};

export function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;
  return `${Math.floor(days / 365)}y`;
}
