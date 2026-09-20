// app/components/ActivityPost.tsx
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlobalText from './GlobalText';
import RankSheet from './RankSheet';
import TierChip from './TierChip';
import { apiJson, useAuth } from './session';
import { relativeTime } from './tiers';
import { colors, font, radius, spacing } from './theme';
import type { Entry } from './types';

interface Props {
  entry: Entry;
  /** Hide the "user name listened to" header on a profile's own activity. */
  showAuthor?: boolean;
  onChange?: (entry: Entry) => void;
  /**
   * Called after you re-rank or remove your own ranking from here.
   * `removed` is true when the entry no longer exists.
   */
  onChanged?: (removed: boolean) => void;
}

export default function ActivityPost({
  entry,
  showAuthor = true,
  onChange,
  onChanged,
}: Props) {
  const router = useRouter();
  const { me } = useAuth();
  const [liked, setLiked] = useState(entry.likedByMe);
  const [likeCount, setLikeCount] = useState(entry.likeCount);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  // Your own ranking can be re-ranked or taken down from wherever it shows.
  const mine = me?.uid === entry.userId;

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
    <View style={styles.post}>
      {showAuthor && (
        <Pressable
          style={styles.authorRow}
          onPress={() => router.push(`/components/User/${entry.author.id}`)}
        >
          <Image
            source={
              entry.author.avatarUrl
                ? { uri: entry.author.avatarUrl }
                : require('@/assets/images/artist-placeholder.png')
            }
            style={styles.pfp}
          />
          <GlobalText style={styles.authorName} numberOfLines={1}>
            {entry.author.username ?? entry.author.name}
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

        {/* On a profile the author line is redundant — it is all one person
            — but the time it carried is not. It rides along at the end of
            this row rather than taking a line of its own. */}
        {!showAuthor && (
          <GlobalText style={styles.actionTime}>
            {relativeTime(entry.createdAt)}
          </GlobalText>
        )}

        {mine && (
          <Pressable
            onPress={() => setEditing(true)}
            hitSlop={8}
            // The timestamp already pushed everything right when it is
            // there; two claims on the same gap would split it.
            style={({ pressed }) => [
              showAuthor && styles.edit,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="more-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <RankSheet
        visible={editing}
        album={{
          id: entry.albumId,
          name: entry.albumName,
          artistName: entry.artistName,
          coverUrl: entry.coverUrl,
        }}
        existing={entry}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChanged?.(false);
        }}
        onDeleted={() => {
          setEditing(false);
          onChanged?.(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    // No card: the post sits on the page and a hairline carries the break.
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
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
  edit: {
    marginLeft: 'auto',
  },
  actionTime: {
    color: colors.textFaint,
    fontSize: 12,
    marginLeft: 'auto',
  },
});
