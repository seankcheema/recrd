// app/components/Artist/[artistId].tsx
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty, SectionHeader } from '@/lib/Screen';
import { Skeleton, SkeletonHeading, SkeletonList } from '@/lib/Skeleton';
import { API_URL } from '@/lib/api';
import { apiJson } from '@/lib/session';
import { colors, font, radius, spacing } from '@/lib/theme';

const { width } = Dimensions.get('window');
const COVER_SIZE = width - 96;

interface Album {
  id: string;
  name: string;
  images: { url: string }[];
}

interface ArtistData {
  id: string;
  name: string;
  images: { url: string }[];
  albums: Album[];
  dominant_color: string;
}

interface Rating {
  average: number;
  count: number;
}

export default function ArtistPage() {
  const router = useRouter();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});

  useEffect(() => {
    fetch(`${API_URL}/artists/${artistId}`)
      .then((res) => res.json())
      .then((data) => setArtist(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [artistId]);

  // Pull recrd's own average rating for each album in one batch.
  useEffect(() => {
    if (!artist?.albums?.length) return;
    const ids = artist.albums.slice(0, 60).map((a) => a.id).join(',');
    apiJson<Record<string, Rating>>(`/ratings?albumIds=${encodeURIComponent(ids)}`)
      .then(setRatings)
      .catch(() => setRatings({}));
  }, [artist]);

  if (loading) {
    return (
      <Screen showBack>
        <View style={styles.coverWrapper}>
          <Skeleton width={COVER_SIZE} height={COVER_SIZE} borderRadius={radius.pill} />
        </View>
        <View style={styles.loadingMeta}>
          <Skeleton width="55%" height={24} />
          <Skeleton width="35%" height={12} />
        </View>
        <SkeletonHeading width={80} />
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (!artist) {
    return (
      <Screen showBack>
        <Empty>Artist not found.</Empty>
      </Screen>
    );
  }

  const accent = artist.dominant_color || '#000000';
  const rankedCount = artist.albums.filter((a) => ratings[a.id]).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[`${accent}66`, `${accent}14`, colors.bg]}
        style={styles.backdrop}
        pointerEvents="none"
      />

      <Screen showBack>
        <View style={styles.coverWrapper}>
          <View style={[styles.coverShadow, { boxShadow: `0px 12px 28px ${accent}8C` }]}>
            <Image
              source={
                artist.images?.length
                  ? { uri: artist.images[0].url }
                  : require('@/assets/images/artist-placeholder.png')
              }
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <GlobalText style={styles.title}>{artist.name}</GlobalText>
        <View style={styles.metaRow}>
          <GlobalText style={styles.meta}>{artist.albums.length} albums</GlobalText>
          {rankedCount > 0 && (
            <>
              <GlobalText style={styles.metaDot}>∙</GlobalText>
              <GlobalText style={styles.meta}>{rankedCount} ranked on recrd</GlobalText>
            </>
          )}
        </View>

        <SectionHeader>albums</SectionHeader>
        {artist.albums.map((album) => {
          const rating = ratings[album.id];
          return (
            <Pressable
              key={album.id}
              style={styles.albumRow}
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
                <GlobalText style={styles.albumName} numberOfLines={1}>
                  {album.name}
                </GlobalText>
                <GlobalText style={styles.albumSub} numberOfLines={1}>
                  {rating
                    ? `${rating.count} ${rating.count === 1 ? 'listener' : 'listeners'}`
                    : 'not ranked yet'}
                </GlobalText>
              </View>
              {rating && <GlobalText style={styles.score}>{rating.average}</GlobalText>}
            </Pressable>
          );
        })}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  loadingMeta: {
    alignItems: 'center',
    gap: spacing.md,
  },
  coverWrapper: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  coverShadow: {
    flex: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
    elevation: 14,
  },
  coverImage: {
    flex: 1,
    borderRadius: radius.pill,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: font.bold,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaDot: {
    color: colors.textFaint,
    fontSize: 12,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
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
  albumSub: {
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
