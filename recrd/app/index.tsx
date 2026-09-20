import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import ActivityPost from '@/lib/ActivityPost';
import Screen, { Empty, SectionHeader } from '@/lib/Screen';
import SearchField from '@/lib/SearchField';
import { SkeletonFeed, SkeletonList } from '@/lib/Skeleton';
import { Glass, GlassButton } from '@/lib/Glass';
import { apiJson } from '@/lib/session';
import { peekCached, storeCached } from '@/lib/cache';
import { API_URL } from '@/lib/api';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { Entry, PersonRow } from '@/lib/types';

interface SpotifyHit {
  id: string;
  name: string;
  images?: { url: string }[];
  artists?: { name: string }[];
}

const FEED_KEY = 'feed';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  // The feed you were last shown, so coming back to the tab picks up where
  // it left off instead of going blank while it reloads behind you.
  const heldFeed = peekCached<Entry[]>(FEED_KEY);
  const [feed, setFeed] = useState<Entry[]>(heldFeed ?? []);
  const [loading, setLoading] = useState(heldFeed === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searching, setSearching] = useState(false);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [albums, setAlbums] = useState<SpotifyHit[]>([]);
  const [artists, setArtists] = useState<SpotifyHit[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const rows = await apiJson<Entry[]>('/feed');
      setFeed(rows);
      storeCached(FEED_KEY, rows);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh whenever the tab regains focus so new rankings show up.
  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  // Debounced search across people, albums and artists.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setPeople([]);
      setAlbums([]);
      setArtists([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const [users, spotify] = await Promise.all([
          apiJson<PersonRow[]>(`/users/search?q=${encodeURIComponent(q)}&limit=5`).catch(() => []),
          fetch(`${API_URL}/search/?q=${encodeURIComponent(q)}&limit=4`)
            .then((r) => (r.ok ? r.json() : { albums: [], artists: [] }))
            .catch(() => ({ albums: [], artists: [] })),
        ]);
        if (cancelled) return;
        setPeople(users);
        setAlbums(spotify.albums || []);
        setArtists(spotify.artists || []);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const showResults = searchQuery.trim().length >= 2;

  const replaceEntry = (updated: Entry) =>
    setFeed((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));

  return (
    <Screen
      title="recrd"
      onRefresh={() => {
        setRefreshing(true);
        loadFeed();
      }}
      refreshing={refreshing}
      belowHeader={
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="album, artist, or friend"
        />
      }
    >
      {showResults ? (
        <View>
          {searching ? (
            <>
              <SectionHeader first>friends</SectionHeader>
              <SkeletonList count={2} size={42} circle />
              <SectionHeader>albums</SectionHeader>
              <SkeletonList count={3} size={46} />
              <SectionHeader>artists</SectionHeader>
              <SkeletonList count={2} size={42} circle />
            </>
          ) : (
            <>
              <SectionHeader first>friends</SectionHeader>
              {people.length > 0 ? (
                people.map((person) => (
                  <Pressable
                    key={person.id}
                    style={styles.row}
                    onPress={() => router.push(`/components/User/${person.id}`)}
                  >
                    <Image
                      source={
                        person.avatarUrl
                          ? { uri: person.avatarUrl }
                          : require('@/assets/images/artist-placeholder.png')
                      }
                      style={styles.pfp}
                    />
                    <View style={{ flex: 1 }}>
                      <GlobalText style={styles.rowTitle} numberOfLines={1}>
                        {person.name}
                      </GlobalText>
                      <GlobalText style={styles.rowSub} numberOfLines={1}>
                        {[person.username ? `@${person.username}` : null,
                          person.isFollowing ? 'following' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </GlobalText>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Empty>no people found</Empty>
              )}

              <SectionHeader>albums</SectionHeader>
              {albums.length > 0 ? (
                albums.map((album) => (
                  <Pressable
                    key={album.id}
                    style={styles.row}
                    onPress={() => router.push(`/components/Album/${album.id}`)}
                  >
                    <Image
                      source={
                        album.images?.length
                          ? { uri: album.images[0].url }
                          : require('@/assets/images/album-placeholder.png')
                      }
                      style={styles.cover}
                    />
                    <View style={{ flex: 1 }}>
                      <GlobalText style={styles.rowTitle} numberOfLines={1}>
                        {album.name}
                      </GlobalText>
                      <GlobalText style={styles.rowSub} numberOfLines={1}>
                        {(album.artists || []).map((a) => a.name).join(', ')}
                      </GlobalText>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Empty>no albums found</Empty>
              )}

              <SectionHeader>artists</SectionHeader>
              {artists.length > 0 ? (
                artists.map((artist) => (
                  <Pressable
                    key={artist.id}
                    style={styles.row}
                    onPress={() => router.push(`/components/Artist/${artist.id}`)}
                  >
                    <Image
                      source={
                        artist.images?.length
                          ? { uri: artist.images[0].url }
                          : require('@/assets/images/artist-placeholder.png')
                      }
                      style={styles.pfp}
                    />
                    <GlobalText style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                      {artist.name}
                    </GlobalText>
                  </Pressable>
                ))
              ) : (
                <Empty>no artists found</Empty>
              )}
            </>
          )}
        </View>
      ) : (
        <>
          <SectionHeader first style={styles.activityHeader}>
            activity
          </SectionHeader>

          {loading ? (
            <SkeletonFeed count={3} />
          ) : error && feed.length === 0 ? (
            <Empty>{error}</Empty>
          ) : feed.length === 0 ? (
            <Glass style={styles.emptyCard} cornerRadius={radius.lg} tone="clear">
              <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.md }}>
                <GlobalText style={styles.emptyTitle}>it's quiet in here</GlobalText>
                <GlobalText style={styles.emptyBody}>
                  rank an album, or follow someone to see what they're listening to.
                </GlobalText>
                <GlassButton
                  style={{ marginTop: spacing.xs }}
                  onPress={() => router.push('/components/AddNew')}
                >
                  <View style={styles.ctaInner}>
                    <GlobalText style={styles.ctaText}>find an album</GlobalText>
                  </View>
                </GlassButton>
              </View>
            </Glass>
          ) : (
            feed.map((entry) => (
              <ActivityPost
                key={entry.id}
                entry={entry}
                onChange={replaceEntry}
                onChanged={loadFeed}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  activityHeader: {
    // A post carries its own top padding, which the album grid and the saved
    // rows below their headings do not. Trimming the heading's gap by that
    // much leaves the same distance under "activity" as under every other
    // title on the page.
    marginBottom: spacing.md - spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pfp: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
  },
  cover: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.bgLift,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  emptyCard: {
    marginTop: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: font.bold,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaInner: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    borderRadius: radius.pill,
  },
  ctaText: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 14,
  },
});
