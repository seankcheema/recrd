import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty, SectionHeader } from '@/lib/Screen';
import SearchField from '@/lib/SearchField';
import { apiJson } from '@/lib/session';
import { API_URL } from '@/lib/api';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { PersonRow } from '@/lib/types';

const RECENTS_KEY = 'recrd.recentSearches';
const MAX_RECENTS = 8;

interface SpotifyHit {
  id: string;
  name: string;
  images?: { url: string }[];
  artists?: { name: string }[];
}

export default function AddNew() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [albums, setAlbums] = useState<SpotifyHit[]>([]);
  const [artists, setArtists] = useState<SpotifyHit[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  // Recent searches live on the device, not the server.
  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY)
      .then((raw) => setRecents(raw ? JSON.parse(raw) : []))
      .catch(() => setRecents([]));
  }, []);

  const rememberSearch = (term: string) => {
    const cleaned = term.trim().toLowerCase();
    if (cleaned.length < 2) return;
    setRecents((prev) => {
      const next = [cleaned, ...prev.filter((r) => r !== cleaned)].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const clearRecents = () => {
    setRecents([]);
    AsyncStorage.removeItem(RECENTS_KEY).catch(() => {});
  };

  // Debounce the fetch so we don't fire on every keystroke
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setAlbums([]);
      setArtists([]);
      setPeople([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const [spotify, users] = await Promise.all([
          fetch(`${API_URL}/search/?q=${encodeURIComponent(q)}&limit=6`)
            .then((r) => (r.ok ? r.json() : { albums: [], artists: [] }))
            .catch(() => ({ albums: [], artists: [] })),
          apiJson<PersonRow[]>(`/users/search?q=${encodeURIComponent(q)}&limit=4`).catch(
            () => [] as PersonRow[]
          ),
        ]);
        if (cancelled) return;
        setAlbums(spotify.albums || []);
        setArtists(spotify.artists || []);
        setPeople(users);
        setHasSearched(true);
        rememberSearch(q);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  return (
    <Screen title="add new" subtitle="rank an album you've listened to">
      <SearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="search an album or artist"
      />

      {!hasSearched && !loading && (
        <>
          <SectionHeader
            action={
              recents.length > 0 ? (
                <Pressable onPress={clearRecents} hitSlop={8}>
                  <GlobalText style={styles.clear}>clear</GlobalText>
                </Pressable>
              ) : undefined
            }
          >
            recent searches
          </SectionHeader>
          {recents.length === 0 ? (
            <Empty>search an album or artist to add it to your list.</Empty>
          ) : (
            recents.map((term) => (
              <Pressable
                key={term}
                style={styles.recentRow}
                onPress={() => setSearchQuery(term)}
              >
                <Feather name="clock" size={16} color={colors.textFaint} />
                <GlobalText style={styles.recentText}>{term}</GlobalText>
                <Feather name="arrow-up-left" size={16} color={colors.textFaint} />
              </Pressable>
            ))
          )}
        </>
      )}

      {loading && !hasSearched && (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      )}

      {hasSearched && (
        <View>
          <SectionHeader>albums</SectionHeader>
          {albums.length > 0 ? (
            albums.map((item) => (
              <Pressable
                key={item.id}
                style={styles.row}
                onPress={() => router.push(`/components/Album/${item.id}`)}
              >
                <Image
                  source={
                    item.images?.length
                      ? { uri: item.images[0].url }
                      : require('@/assets/images/album-placeholder.png')
                  }
                  style={styles.cover}
                />
                <View style={{ flex: 1 }}>
                  <GlobalText style={styles.rowTitle} numberOfLines={1}>
                    {item.name}
                  </GlobalText>
                  <GlobalText style={styles.rowSub} numberOfLines={1}>
                    {(item.artists || []).map((a) => a.name).join(', ')}
                  </GlobalText>
                </View>
                <Feather name="plus-circle" size={20} color={colors.gold} />
              </Pressable>
            ))
          ) : (
            <Empty>no albums found</Empty>
          )}

          <SectionHeader>artists</SectionHeader>
          {artists.length > 0 ? (
            artists.map((item) => (
              <Pressable
                key={item.id}
                style={styles.row}
                onPress={() => router.push(`/components/Artist/${item.id}`)}
              >
                <Image
                  source={
                    item.images?.length
                      ? { uri: item.images[0].url }
                      : require('@/assets/images/artist-placeholder.png')
                  }
                  style={styles.pfp}
                />
                <GlobalText style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                  {item.name}
                </GlobalText>
              </Pressable>
            ))
          ) : (
            <Empty>no artists found</Empty>
          )}

          {people.length > 0 && (
            <>
              <SectionHeader>people</SectionHeader>
              {people.map((person) => (
                <Pressable
                  key={person.id}
                  style={styles.row}
                  onPress={() => router.push(`/components/User/${person.id}`)}
                >
                  <Image
                    source={
                      person.avatarUrl
                        ? { uri: person.avatarUrl }
                        : require('@/assets/images/placeholder_album.png')
                    }
                    style={styles.pfp}
                  />
                  <GlobalText style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                    {person.name}
                  </GlobalText>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clear: {
    color: colors.textMuted,
    fontSize: 13,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  recentText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.bgLift,
  },
  pfp: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
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
});
