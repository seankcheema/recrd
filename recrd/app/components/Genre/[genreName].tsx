// app/components/Genre/[genreName].tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty } from '@/lib/Screen';
import { API_URL } from '@/lib/api';
import { apiJson } from '@/lib/session';
import { colors, font, radius, spacing } from '@/lib/theme';

interface Rating {
  average: number;
  count: number;
}

export default function GenrePage() {
  const router = useRouter();
  const { genreName } = useLocalSearchParams<{ genreName: string }>();
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});

  useEffect(() => {
    fetch(`${API_URL}/trending_albums/?limit=10&genre=${encodeURIComponent(genreName)}`)
      .then((r) => r.json())
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, [genreName]);

  useEffect(() => {
    if (!albums.length) return;
    const ids = albums.map((a) => a.id).join(',');
    apiJson<Record<string, Rating>>(`/ratings?albumIds=${encodeURIComponent(ids)}`)
      .then(setRatings)
      .catch(() => setRatings({}));
  }, [albums]);

  return (
    <Screen title={genreName} subtitle="popular right now" showBack>
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      ) : albums.length === 0 ? (
        <Empty>no albums found for this genre.</Empty>
      ) : (
        albums.map((album: any, index: number) => (
          <Pressable
            key={album.id}
            style={styles.albumRow}
            onPress={() => router.push(`/components/Album/${album.id}`)}
          >
            <GlobalText style={styles.rank}>{index + 1}</GlobalText>
            <Image
              source={
                album.images?.length
                  ? { uri: album.images[0].url }
                  : require('@/assets/images/album-placeholder.png')
              }
              style={styles.cover}
            />
            <View style={{ flex: 1 }}>
              <GlobalText style={styles.albumName} numberOfLines={1}>
                {album.name}
              </GlobalText>
              <GlobalText style={styles.artistName} numberOfLines={1}>
                {(album.artists || []).map((a: { name: string }) => a.name).join(', ')}
              </GlobalText>
            </View>
            {ratings[album.id] && (
              <GlobalText style={styles.score}>{ratings[album.id].average}</GlobalText>
            )}
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rank: {
    width: 18,
    color: colors.textFaint,
    fontSize: 14,
    fontFamily: font.bold,
    textAlign: 'center',
  },
  cover: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.bgLift,
  },
  albumName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  artistName: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  score: {
    color: colors.gold,
    fontSize: 14,
    fontFamily: font.bold,
  },
});
