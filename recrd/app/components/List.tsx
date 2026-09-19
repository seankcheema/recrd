import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty } from '@/lib/Screen';
import RankingsView from '@/lib/RankingsView';
import { Skeleton, SkeletonList } from '@/lib/Skeleton';
import { GlassButton } from '@/lib/Glass';
import { apiJson } from '@/lib/session';
import { TIERS } from '@/lib/tiers';
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

  return (
    <Screen
      title="my list"
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      refreshing={refreshing}
    >
      {loading ? (
        <View>
          <Skeleton width="100%" height={48} borderRadius={radius.md} />
          {TIERS.slice(0, 3).map((tier) => (
            <View key={tier} style={{ marginTop: spacing.xl }}>
              <View style={styles.tierHeader}>
                <Skeleton width={78} height={26} borderRadius={radius.sm} />
                <View style={styles.tierRule} />
              </View>
              <SkeletonList count={2} />
            </View>
          ))}
        </View>
      ) : error ? (
        <Empty>{error}</Empty>
      ) : (
        <RankingsView
          entries={entries}
          saved={saved}
          owner
          onChanged={load}
          searchPlaceholder="search your list"
          emptyState={
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
          }
        />
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
  tierRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.edge,
  },
  emptyCard: {
    paddingTop: spacing.xxl,
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
