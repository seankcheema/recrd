// app/components/Album/[albumId].tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty, SectionHeader } from '@/lib/Screen';
import TierChip from '@/lib/TierChip';
import RankSheet from '@/lib/RankSheet';
import { Skeleton, SkeletonHeading, SkeletonList } from '@/lib/Skeleton';
import { Glass } from '@/lib/Glass';
import { API_URL } from '@/lib/api';
import { apiJson } from '@/lib/session';
import { relativeTime } from '@/lib/tiers';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { Entry } from '@/lib/types';

const { width } = Dimensions.get('window');
const COVER_SIZE = width - 96;

interface AlbumData {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string }[];
  release_date: string;
  tracks: { items: { duration_ms: number }[] };
  dominant_color: string;
}

interface AlbumSocial {
  average: number | null;
  ratingCount: number;
  myEntry: Entry | null;
  saved: boolean;
  friends: Entry[];
  everyone: Entry[];
}

const EMPTY_SOCIAL: AlbumSocial = {
  average: null,
  ratingCount: 0,
  myEntry: null,
  saved: false,
  friends: [],
  everyone: [],
};

export default function AlbumPage() {
  const router = useRouter();
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [social, setSocial] = useState<AlbumSocial>(EMPTY_SOCIAL);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  const loadSocial = useCallback(async () => {
    try {
      setSocial(await apiJson<AlbumSocial>(`/albums/${albumId}/social`));
    } catch {
      setSocial(EMPTY_SOCIAL);
    }
  }, [albumId]);

  useEffect(() => {
    fetch(`${API_URL}/albums/${albumId}`)
      .then((r) => r.json())
      .then((data) => setAlbum(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [albumId]);

  useEffect(() => {
    loadSocial();
  }, [loadSocial]);

  const toggleBookmark = async () => {
    if (!album || savingBookmark) return;
    setSavingBookmark(true);
    const next = !social.saved;
    setSocial((s) => ({ ...s, saved: next }));
    try {
      if (next) {
        await apiJson('/watchlist', {
          method: 'POST',
          body: JSON.stringify({
            spotifyAlbumId: album.id,
            albumName: album.name,
            artistName: album.artists.map((a) => a.name).join(', '),
            coverUrl: album.images[0]?.url ?? null,
          }),
        });
      } else {
        await apiJson(`/watchlist/${album.id}`, { method: 'DELETE' });
      }
    } catch {
      setSocial((s) => ({ ...s, saved: !next }));
    } finally {
      setSavingBookmark(false);
    }
  };

  if (loading) {
    return (
      <Screen showBack>
        <View style={styles.loadingCover}>
          <Skeleton width={COVER_SIZE} height={COVER_SIZE} borderRadius={radius.md} />
        </View>
        <View style={styles.loadingMeta}>
          <Skeleton width="65%" height={24} />
          <Skeleton width="40%" height={13} />
        </View>
        <SkeletonHeading width={90} />
        <SkeletonList count={5} size={40} circle />
      </Screen>
    );
  }

  if (!album) {
    return (
      <Screen showBack>
        <Empty>Album not found.</Empty>
      </Screen>
    );
  }

  const totalMs = album.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0);
  const minutes = Math.floor(totalMs / 60000);
  const releaseYear = album.release_date.split('-')[0];
  const artistNames = album.artists.map((a) => a.name).join(', ');
  const accent = album.dominant_color || '#000000';

  const rankingRow = (entry: Entry) => (
    <Pressable
      key={entry.id}
      style={styles.rankingRow}
      onPress={() => router.push(`/components/Entry/${entry.id}`)}
    >
      <Image
        source={
          entry.author.avatarUrl
            ? { uri: entry.author.avatarUrl }
            : require('@/assets/images/placeholder_album.png')
        }
        style={styles.pfp}
      />
      <View style={{ flex: 1 }}>
        <GlobalText style={styles.personName} numberOfLines={1}>
          {entry.author.name}
        </GlobalText>
        {entry.review ? (
          <GlobalText style={styles.review} numberOfLines={2}>
            {entry.review}
          </GlobalText>
        ) : (
          <GlobalText style={styles.time}>{relativeTime(entry.createdAt)}</GlobalText>
        )}
      </View>
      <TierChip tier={entry.tier} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* A wash of the cover's dominant colour behind the whole page. */}
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
                album.images?.length
                  ? { uri: album.images[0].url }
                  : require('@/assets/images/album-placeholder.png')
              }
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>

          <Glass style={styles.albumActions} cornerRadius={radius.pill} tone="regular">
            <View style={styles.actionsRow}>
              <Pressable onPress={() => setSheetOpen(true)} hitSlop={6} style={styles.action}>
                <Feather
                  name={social.myEntry ? 'check-circle' : 'plus-circle'}
                  size={24}
                  color={social.myEntry ? colors.gold : colors.text}
                />
              </Pressable>
              <View style={styles.actionDivider} />
              <Pressable onPress={toggleBookmark} hitSlop={6} style={styles.action}>
                <Feather
                  name="bookmark"
                  size={22}
                  color={social.saved ? colors.gold : colors.text}
                />
              </Pressable>
            </View>
          </Glass>
        </View>

        <GlobalText style={styles.title}>{album.name}</GlobalText>
        <Pressable onPress={() => router.push(`/components/Artist/${album.artists[0].id}`)}>
          <GlobalText style={styles.artists}>{artistNames}</GlobalText>
        </Pressable>

        <View style={styles.metaRow}>
          <GlobalText style={styles.meta}>{releaseYear}</GlobalText>
          <GlobalText style={styles.metaDot}>∙</GlobalText>
          <GlobalText style={styles.meta}>{minutes} min</GlobalText>
          {social.average !== null && (
            <>
              <GlobalText style={styles.metaDot}>∙</GlobalText>
              <GlobalText style={styles.score}>{social.average}</GlobalText>
              <GlobalText style={styles.meta}>
                from {social.ratingCount} {social.ratingCount === 1 ? 'listener' : 'listeners'}
              </GlobalText>
            </>
          )}
        </View>

        {social.myEntry && (
          <>
            <SectionHeader>your ranking</SectionHeader>
            {rankingRow(social.myEntry)}
          </>
        )}

        <SectionHeader>friends' rankings</SectionHeader>
        {social.friends.length > 0 ? (
          social.friends.map(rankingRow)
        ) : (
          <Empty>nobody you follow has ranked this yet.</Empty>
        )}

        {social.everyone.length > 0 && (
          <>
            <SectionHeader>everyone else</SectionHeader>
            {social.everyone.map(rankingRow)}
          </>
        )}
      </Screen>

      <RankSheet
        visible={sheetOpen}
        album={{
          id: album.id,
          name: album.name,
          artistName: artistNames,
          coverUrl: album.images[0]?.url ?? null,
        }}
        existing={social.myEntry}
        accent={accent}
        onClose={() => setSheetOpen(false)}
        onSaved={loadSocial}
        onDeleted={loadSocial}
      />
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
  loadingCover: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
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
    marginBottom: spacing.xxl,
  },
  coverShadow: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.bgLift,
    elevation: 14,
  },
  coverImage: {
    flex: 1,
    borderRadius: radius.md,
  },
  albumActions: {
    position: 'absolute',
    bottom: -18,
    alignSelf: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: spacing.xs,
  },
  action: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: colors.edge,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: font.bold,
    letterSpacing: -0.4,
  },
  artists: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaDot: {
    color: colors.textFaint,
    fontSize: 12,
  },
  score: {
    color: colors.gold,
    fontSize: 13,
    fontFamily: font.bold,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pfp: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
  },
  personName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  review: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
    lineHeight: 18,
  },
  time: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 1,
  },
});
