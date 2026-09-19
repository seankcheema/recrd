// app/components/types.ts
import type { Tier } from './tiers';

export interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Entry {
  id: string;
  userId: string;
  albumId: string;
  albumName: string;
  artistName: string;
  coverUrl: string | null;
  rank: number;
  tier: Tier;
  review: string | null;
  visibility: 'public' | 'private';
  createdAt: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  followers: number;
  following: number;
  rankingCount: number;
  savedCount: number;
  isFollowing: boolean;
  isMe: boolean;
}

export interface PersonRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isFollowing: boolean;
  isMe?: boolean;
}

export interface SavedAlbum {
  albumId: string;
  albumName: string;
  artistName: string;
  coverUrl: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  author: Author;
}
