// app/components/ProfileView.tsx
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { Glass, GlassButton } from './Glass';
import { apiJson } from './session';
import { colors, font, radius, spacing } from './theme';
import type { Entry, Profile } from './types';

interface Props {
  userId: string | null;
  /** Owning the profile unlocks edit + log out; otherwise you get follow. */
  self: boolean;
  /** The tab-bar copy has nowhere to go back to; pushed copies do. */
  showBack?: boolean;
  onSignOut?: () => void;
}

export default function ProfileView({ userId, self, showBack = false, onSignOut }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, e] = await Promise.all([
        apiJson<Profile>(self ? '/users/me' : `/users/${userId}`),
        apiJson<Entry[]>(`/users/${userId}/entries`),
      ]);
      setProfile(p);
      setEntries(e);
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
      <Screen showBack={showBack}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
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

  // "Favorites" are simply the highest-ranked albums on the list.
  const favorites = entries.slice(0, showAllFavorites ? 12 : 3);

  return (
    <Screen
      title={showBack ? undefined : profile.name}
      showBack={showBack}
      headerRight={
        self ? (
          <Pressable onPress={onSignOut} hitSlop={10}>
            <Glass style={styles.iconButton} cornerRadius={radius.pill}>
              <Feather name="log-out" size={18} color={colors.textMuted} />
            </Glass>
          </Pressable>
        ) : undefined
      }
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      refreshing={refreshing}
    >
      <Glass style={styles.card} cornerRadius={radius.lg} tone="clear">
        <View style={styles.cardInner}>
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
                <GlassButton
                  style={{ flex: 1 }}
                  cornerRadius={radius.md}
                  onPress={() => router.push('/components/EditProfile')}
                >
                  <View style={styles.actionButton}>
                    <Feather name="edit-2" size={14} color={colors.text} />
                    <GlobalText style={styles.actionText}>edit profile</GlobalText>
                  </View>
                </GlassButton>
                <GlassButton
                  style={{ flex: 1 }}
                  cornerRadius={radius.md}
                  onPress={() => router.push('/components/AddNew')}
                >
                  <View style={styles.actionButton}>
                    <Feather name="plus" size={14} color={colors.gold} />
                    <GlobalText style={[styles.actionText, { color: colors.gold }]}>
                      add album
                    </GlobalText>
                  </View>
                </GlassButton>
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

          {self && profile.savedCount > 0 && (
            <Pressable
              style={styles.watchlistHint}
              onPress={() => router.push('/components/List')}
            >
              <Feather name="bookmark" size={13} color={colors.gold} />
              <GlobalText style={styles.watchlistText}>
                {profile.savedCount} to be listened
              </GlobalText>
            </Pressable>
          )}
        </View>
      </Glass>

      <SectionHeader
        action={
          entries.length > 3 ? (
            <Pressable onPress={() => setShowAllFavorites((v) => !v)} hitSlop={8}>
              <GlobalText style={styles.toggle}>
                {showAllFavorites ? 'show less' : 'view all'}
              </GlobalText>
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
  card: {
    marginTop: spacing.xs,
  },
  cardInner: {
    padding: spacing.xl,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
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
  watchlistHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchlistText: {
    color: colors.gold,
    fontSize: 12,
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
