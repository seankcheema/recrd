import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty, SectionHeader } from '@/lib/Screen';
import { SkeletonList } from '@/lib/Skeleton';
import { Glass } from '@/lib/Glass';
import { API_URL } from '@/lib/api';
import { apiJson } from '@/lib/session';
import { colors, font, radius, spacing } from '@/lib/theme';

const GENRES = [
  { name: 'rap', color: '#5810E7' },
  { name: 'pop', color: '#E75F10' },
  { name: 'r&b', color: '#E71022' },
  { name: 'indie', color: '#E7B510' },
  { name: 'country', color: '#107CE7' },
  { name: 'hip-hop', color: '#CE10E7' },
  { name: 'rock', color: '#10E77C' },
  { name: 'jazz', color: '#993B3B' },
  { name: 'soul', color: '#3B6499' },
  { name: 'metal', color: '#6D3B99' },
  { name: 'house', color: '#E710B5' },
  { name: 'folk', color: '#45993B' },
];

interface Rating {
  average: number;
  count: number;
}

export default function Trending() {
  const router = useRouter();
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [loading, setLoading] = useState(true);
  const [showAllGenres, setShowAllGenres] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/trending_albums/`)
      .then((r) => r.json())
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, []);

  // Overlay recrd's own averages on the chart.
  useEffect(() => {
    if (!albums?.length) return;
    const ids = albums.map((a) => a.id).join(',');
    apiJson<Record<string, Rating>>(`/ratings?albumIds=${encodeURIComponent(ids)}`)
      .then(setRatings)
      .catch(() => setRatings({}));
  }, [albums]);

  const visibleGenres = showAllGenres ? GENRES : GENRES.slice(0, 6);

  return (
    <Screen title="trending">
      <SectionHeader style={{ marginTop: spacing.lg }}>top albums</SectionHeader>

      {loading ? (
        <SkeletonList count={5} />
      ) : !albums || albums.length === 0 ? (
        <Empty>couldn't load the chart right now. pull to try again.</Empty>
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

      <SectionHeader
        action={
          <Pressable onPress={() => setShowAllGenres((v) => !v)} hitSlop={8}>
            <GlobalText style={styles.toggle}>
              {showAllGenres ? 'show less' : 'view all'}
            </GlobalText>
          </Pressable>
        }
      >
        by genre
      </SectionHeader>

      <View style={styles.genreGrid}>
        {visibleGenres.map((genre) => (
          <Pressable
            key={genre.name}
            onPress={() =>
              router.push({
                pathname: '/components/Genre/[genreName]',
                params: { genreName: genre.name },
              })
            }
            style={({ pressed }) => [styles.genreTile, pressed && { opacity: 0.75 }]}
          >
            <LinearGradient
              colors={[genre.color, `${genre.color}33`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Glass style={styles.genreSheen} cornerRadius={radius.md} tone="clear" />
            <GlobalText style={styles.genreLabel}>{genre.name}</GlobalText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const screenWidth = Dimensions.get('window').width;
const genreTileWidth = (screenWidth - 40 - 20) / 3;

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
  toggle: {
    color: colors.gold,
    fontSize: 13,
    fontFamily: font.bold,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreTile: {
    width: genreTileWidth,
    height: genreTileWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
  },
  genreSheen: {
    ...StyleSheet.absoluteFill,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  genreLabel: {
    fontSize: 17,
    fontFamily: font.bold,
    color: colors.text,
    textAlign: 'right',
  },
});
