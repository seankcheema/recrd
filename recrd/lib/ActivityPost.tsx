// app/components/ActivityPost.tsx
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlobalText from './GlobalText';
import TierChip from './TierChip';
import { Glass } from './Glass';
import { apiJson } from './session';
import { relativeTime } from './tiers';
import { colors, font, radius, spacing } from './theme';
import type { Entry } from './types';

interface Props {
  entry: Entry;
  /** Hide the "user name listened to" header on a profile's own activity. */
  showAuthor?: boolean;
  onChange?: (entry: Entry) => void;
}

export default function ActivityPost({ entry, showAuthor = true, onChange }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(entry.likedByMe);
  const [likeCount, setLikeCount] = useState(entry.likeCount);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    // Optimistic: flip straight away, roll back if the request fails.
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const data = await apiJson<{ likedByMe: boolean; likeCount: number }>(
        `/entries/${entry.id}/like`,
        { method: next ? 'POST' : 'DELETE' }
      );
      setLiked(data.likedByMe);
      setLikeCount(data.likeCount);
      onChange?.({ ...entry, likedByMe: data.likedByMe, likeCount: data.likeCount });
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Glass style={styles.card} cornerRadius={radius.lg} tone="clear">
      <View style={styles.inner}>
        {showAuthor && (
          <Pressable
            style={styles.authorRow}
            onPress={() => router.push(`/components/User/${entry.author.id}`)}
          >
            <Image
              source={
                entry.author.avatarUrl
                  ? { uri: entry.author.avatarUrl }
                  : require('@/assets/images/placeholder_album.png')
              }
              style={styles.pfp}
            />
            <GlobalText style={styles.authorName} numberOfLines={1}>
              {entry.author.name}
            </GlobalText>
            <GlobalText style={styles.verb}>listened to</GlobalText>
            <GlobalText style={styles.time}>{relativeTime(entry.createdAt)}</GlobalText>
          </Pressable>
        )}

        <Pressable
          style={styles.albumRow}
          onPress={() => router.push(`/components/Album/${entry.albumId}`)}
        >
          <Image
            source={
              entry.coverUrl
                ? { uri: entry.coverUrl }
                : require('@/assets/images/album-placeholder.png')
            }
            style={styles.cover}
          />
          <View style={{ flex: 1 }}>
            <GlobalText style={styles.albumName} numberOfLines={1}>
              {entry.albumName}
            </GlobalText>
            <GlobalText style={styles.artistName} numberOfLines={1}>
              {entry.artistName}
            </GlobalText>
          </View>
          <TierChip tier={entry.tier} />
        </Pressable>

        {entry.review ? (
          <GlobalText style={styles.review}>{entry.review}</GlobalText>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={toggleLike} hitSlop={8} style={styles.action}>
            <Feather
              name="heart"
              size={20}
              color={liked ? colors.danger : colors.textMuted}
            />
            {likeCount > 0 && (
              <GlobalText style={[styles.count, liked && { color: colors.danger }]}>
                {likeCount}
              </GlobalText>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push(`/components/Entry/${entry.id}`)}
            hitSlop={8}
            style={styles.action}
          >
            <Feather name="message-circle" size={20} color={colors.textMuted} />
            {entry.commentCount > 0 && (
              <GlobalText style={styles.count}>{entry.commentCount}</GlobalText>
            )}
          </Pressable>
        </View>
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  inner: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pfp: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
  },
  authorName: {
    color: colors.text,
    fontSize: 14,
    fontFamily: font.bold,
    flexShrink: 1,
  },
  verb: {
    color: colors.textMuted,
    fontSize: 13,
  },
  time: {
    color: colors.textFaint,
    fontSize: 12,
    marginLeft: 'auto',
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.bgLift,
  },
  albumName: {
    color: colors.text,
    fontSize: 16,
    fontFamily: font.bold,
    letterSpacing: -0.2,
  },
  artistName: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  review: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: font.bold,
  },
});
