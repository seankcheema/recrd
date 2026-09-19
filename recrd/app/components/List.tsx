import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty, SectionHeader } from '@/lib/Screen';
import { Glass, GlassButton } from '@/lib/Glass';
import { apiJson } from '@/lib/session';
import { TIERS, TIER_COLORS, Tier } from '@/lib/tiers';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { Entry, SavedAlbum } from '@/lib/types';

export default function List() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saved, setSaved] = useState<SavedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, watchlist] = await Promise.all([
        apiJson<Entry[]>('/entries/me'),
        apiJson<SavedAlbum[]>('/watchlist'),
      ]);
      setEntries(mine);
      setSaved(watchlist);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byTier = (tier: Tier) => entries.filter((e) => e.tier === tier);

  return (
    <Screen
      title="my list"
      subtitle={
        loading
          ? undefined
          : `${entries.length} ranked · ${saved.length} to be listened`
      }
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      refreshing={refreshing}
    >
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      ) : error ? (
        <Empty>{error}</Empty>
      ) : (
        <View>
          {entries.length === 0 && (
            <Glass style={{ marginTop: spacing.sm }} cornerRadius={radius.lg} tone="clear">
              <View style={styles.emptyCard}>
                <GlobalText style={styles.emptyTitle}>no rankings yet</GlobalText>
                <GlobalText style={styles.emptyBody}>
                  find an album and give it a tier — it'll show up here.
                </GlobalText>
                <GlassButton onPress={() => router.push('/components/AddNew')}>
                  <View style={styles.ctaInner}>
                    <GlobalText style={styles.ctaText}>rank your first album</GlobalText>
                  </View>
                </GlassButton>
              </View>
            </Glass>
          )}

          {TIERS.map((tier) => {
            const tierEntries = byTier(tier);
            return (
              <View key={tier} style={{ marginTop: spacing.xl }}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[tier] }]}>
                    <GlobalText style={styles.tierLabel}>{tier}-Tier</GlobalText>
                  </View>
                  <View style={styles.tierRule} />
                  <GlobalText style={styles.tierCount}>{tierEntries.length}</GlobalText>
                </View>

                {tierEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
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
                    {entry.visibility === 'private' && (
                      <Feather name="lock" size={15} color={colors.textFaint} />
                    )}
                  </Pressable>
                ))}
              </View>
            );
          })}

          <SectionHeader>to be listened</SectionHeader>

          {saved.length === 0 ? (
            <Empty>
              nothing saved. tap the bookmark on an album to come back to it later.
            </Empty>
          ) : (
            saved.map((album) => (
              <Pressable
                key={album.albumId}
                style={styles.albumRow}
                onPress={() => router.push(`/components/Album/${album.albumId}`)}
              >
                <Image
                  source={
                    album.coverUrl
                      ? { uri: album.coverUrl }
                      : require('@/assets/images/album-placeholder.png')
                  }
                  style={styles.cover}
                />
                <View style={{ flex: 1 }}>
                  <GlobalText style={styles.albumName} numberOfLines={1}>
                    {album.albumName}
                  </GlobalText>
                  <GlobalText style={styles.artistName} numberOfLines={1}>
                    {album.artistName}
                  </GlobalText>
                </View>
                <Feather name="bookmark" size={18} color={colors.gold} />
              </Pressable>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  tierBadge: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
  },
  tierLabel: {
    fontSize: 13,
    fontFamily: font.bold,
    color: colors.text,
  },
  tierRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.edge,
  },
  tierCount: {
    color: colors.textFaint,
    fontSize: 13,
    fontFamily: font.bold,
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
  artistName: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
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
