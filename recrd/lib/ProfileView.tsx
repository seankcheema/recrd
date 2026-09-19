// app/components/ProfileView.tsx
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import GlobalText from './GlobalText';
import ActivityPost from './ActivityPost';
import Screen, { Empty, SectionHeader } from './Screen';
import { Skeleton, SkeletonFeed, SkeletonHeading, SkeletonProfile } from './Skeleton';
import { apiJson } from './session';
import { colors, font, radius, spacing } from './theme';
import type { Entry, Profile, SavedAlbum } from './types';

interface Props {
  userId: string | null;
  /** Owning the profile unlocks edit + log out; otherwise you get follow. */
  self: boolean;
  /** The tab-bar copy has nowhere to go back to; pushed copies do. */
  showBack?: boolean;
}

export default function ProfileView({ userId, self, showBack = false }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saved, setSaved] = useState<SavedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, e, w] = await Promise.all([
        apiJson<Profile>(self ? '/users/me' : `/users/${userId}`),
        apiJson<Entry[]>(`/users/${userId}/entries`),
        apiJson<SavedAlbum[]>(`/users/${userId}/watchlist`),
      ]);
      setProfile(p);
      setEntries(e);
      setSaved(w);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, self]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleFollow = async () => {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    const next = !profile.isFollowing;
    setProfile({
      ...profile,
      isFollowing: next,
      followers: profile.followers + (next ? 1 : -1),
    });
    try {
      const data = await apiJson<{ isFollowing: boolean; followers: number }>(
        `/users/${profile.id}/follow`,
        { method: next ? 'POST' : 'DELETE' }
      );
      setProfile((p) => (p ? { ...p, ...data } : p));
    } catch {
      setProfile((p) =>
        p ? { ...p, isFollowing: !next, followers: p.followers + (next ? -1 : 1) } : p
      );
    } finally {
      setFollowBusy(false);
    }
  };

  const replaceEntry = (updated: Entry) =>
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));

  if (loading) {
    return (
      <Screen
        showBack={showBack}
        titlePlaceholder={!showBack}
        headerRight={self ? <View style={styles.iconButton} /> : undefined}
      >
        <SkeletonProfile />
        <SkeletonHeading width={110} />
        <View style={styles.albumGrid}>
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              width={albumTileWidth}
              height={albumTileWidth}
              borderRadius={radius.sm}
            />
          ))}
        </View>
        <SkeletonHeading width={80} />
        <SkeletonFeed count={2} showAuthor={false} />
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen showBack={showBack}>
        <Empty>{error || 'Profile not found.'}</Empty>
      </Screen>
    );
  }

  // "Favorites" are simply the highest-ranked albums on the list; the full
  // ranking lives behind the "full list" link.
  const favorites = entries.slice(0, 6);

  return (
    <Screen
      title={profile.username ?? profile.name}
      showBack={showBack}
      headerRight={
        self ? (
          <Pressable
            onPress={() => router.push('/components/Settings')}
            hitSlop={10}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          >
            <Feather name="settings" size={20} color={colors.textMuted} />
          </Pressable>
        ) : undefined
      }
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      refreshing={refreshing}
    >
      <View style={styles.identity}>
        <View style={styles.identityRow}>
          <Image
            source={
              profile.avatarUrl
                ? { uri: profile.avatarUrl }
                : require('@/assets/images/placeholder_album.png')
            }
            style={styles.pfp}
          />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <GlobalText style={styles.name} numberOfLines={2}>
              {profile.name}
            </GlobalText>
            <View style={styles.statsRow}>
              <Pressable
                style={styles.stat}
                onPress={() =>
                  router.push(`/components/Connections/${profile.id}?tab=followers`)
                }
              >
                <GlobalText style={styles.statValue}>
                  {profile.followers.toLocaleString()}
                </GlobalText>
                <GlobalText style={styles.statLabel}>followers</GlobalText>
              </Pressable>
              <View style={styles.statDivider} />
              <Pressable
                style={styles.stat}
                onPress={() =>
                  router.push(`/components/Connections/${profile.id}?tab=following`)
                }
              >
                <GlobalText style={styles.statValue}>
                  {profile.following.toLocaleString()}
                </GlobalText>
                <GlobalText style={styles.statLabel}>following</GlobalText>
              </Pressable>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <GlobalText style={styles.statValue}>{profile.rankingCount}</GlobalText>
                <GlobalText style={styles.statLabel}>ranked</GlobalText>
              </View>
            </View>
          </View>
        </View>

        <GlobalText style={[styles.bio, !profile.bio && { color: colors.textFaint }]}>
          {profile.bio || (self ? 'no bio yet — add one from edit profile' : 'no bio yet')}
        </GlobalText>

        <View style={styles.buttonRow}>
          {self ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/components/EditProfile')}
              >
                <Feather name="edit-2" size={14} color={colors.text} />
                <GlobalText style={styles.actionText}>edit profile</GlobalText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/components/AddNew')}
              >
                <Feather name="plus" size={14} color={colors.gold} />
                <GlobalText style={[styles.actionText, { color: colors.gold }]}>
                  add album
                </GlobalText>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.followButton,
                profile.isFollowing && styles.followingButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={toggleFollow}
              disabled={followBusy}
            >
              <Feather
                name={profile.isFollowing ? 'check' : 'plus'}
                size={15}
                color={profile.isFollowing ? colors.text : colors.bg}
              />
              <GlobalText
                style={[
                  styles.followText,
                  profile.isFollowing && { color: colors.text },
                ]}
              >
                {profile.isFollowing ? 'following' : 'follow'}
              </GlobalText>
            </Pressable>
          )}
        </View>

      </View>

      <SectionHeader
        action={
          entries.length > 0 ? (
            <Pressable
              onPress={() => router.push(`/components/Rankings/${profile.id}`)}
              hitSlop={8}
            >
              <GlobalText style={styles.toggle}>full list</GlobalText>
            </Pressable>
          ) : undefined
        }
      >
        top albums
      </SectionHeader>

      {favorites.length === 0 ? (
        <Empty>{self ? "you haven't ranked anything yet" : 'no rankings yet'}</Empty>
      ) : (
        <View style={styles.albumGrid}>
          {favorites.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => router.push(`/components/Album/${entry.albumId}`)}
            >
              <Image
                source={
                  entry.coverUrl
                    ? { uri: entry.coverUrl }
                    : require('@/assets/images/album-placeholder.png')
                }
                style={styles.albumTile}
              />
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader>to be listened</SectionHeader>

      {saved.length === 0 ? (
        <Empty>
          {self
            ? 'nothing saved. tap the bookmark on an album to come back to it later.'
            : 'nothing saved yet'}
        </Empty>
      ) : (
        saved.slice(0, 5).map((album) => (
          <Pressable
            key={album.albumId}
            style={styles.savedRow}
            onPress={() => router.push(`/components/Album/${album.albumId}`)}
          >
            <Image
              source={
                album.coverUrl
                  ? { uri: album.coverUrl }
                  : require('@/assets/images/album-placeholder.png')
              }
              style={styles.savedCover}
            />
            <View style={{ flex: 1 }}>
              <GlobalText style={styles.savedName} numberOfLines={1}>
                {album.albumName}
              </GlobalText>
              <GlobalText style={styles.savedArtist} numberOfLines={1}>
                {album.artistName}
              </GlobalText>
            </View>
            <Feather name="bookmark" size={16} color={colors.gold} />
          </Pressable>
        ))
      )}

      {saved.length > 5 && (
        <Pressable
          onPress={() => router.push(`/components/Rankings/${profile.id}`)}
          hitSlop={8}
        >
          <GlobalText style={styles.seeMore}>
            see all {saved.length}
          </GlobalText>
        </Pressable>
      )}

      <SectionHeader>activity</SectionHeader>

      {entries.length === 0 ? (
        <Empty>no activity yet</Empty>
      ) : (
        entries.map((entry) => (
          <ActivityPost
            key={entry.id}
            entry={entry}
            showAuthor={false}
            onChange={replaceEntry}
            onChanged={load}
          />
        ))
      )}
    </Screen>
  );
}

const screenWidth = Dimensions.get('window').width;
const albumTileWidth = (screenWidth - 40 - 20) / 3;

const styles = StyleSheet.create({
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    // Not a card — the header just sits in the page's own column.
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  pfp: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
    backgroundColor: colors.bgLift,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontFamily: font.bold,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: colors.edge,
  },
  bio: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: font.bold,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
  },
  followText: {
    color: colors.bg,
    fontSize: 14,
    fontFamily: font.bold,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  savedCover: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.bgLift,
  },
  savedName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  savedArtist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  seeMore: {
    color: colors.gold,
    fontSize: 13,
    fontFamily: font.bold,
  },
  toggle: {
    color: colors.gold,
    fontSize: 13,
    fontFamily: font.bold,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  albumTile: {
    width: albumTileWidth,
    height: albumTileWidth,
    borderRadius: radius.sm,
    backgroundColor: colors.bgLift,
  },
});
