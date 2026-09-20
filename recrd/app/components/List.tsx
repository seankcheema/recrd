import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty } from '@/lib/Screen';
import RankingsView from '@/lib/RankingsView';
import SearchField from '@/lib/SearchField';
import { Skeleton, SkeletonList } from '@/lib/Skeleton';
import { GlassButton } from '@/lib/Glass';
import { apiJson } from '@/lib/session';
import { peekCached, storeCached } from '@/lib/cache';
import { TIERS } from '@/lib/tiers';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { Entry } from '@/lib/types';

const LIST_KEY = 'list:entries';

export default function List() {
  const router = useRouter();
  // Your own rankings, as last loaded. They reload on every visit anyway, so
  // there is no reason to stare at a skeleton while that happens.
  const held = peekCached<Entry[]>(LIST_KEY);
  const [entries, setEntries] = useState<Entry[]>(held ?? []);
  const [loading, setLoading] = useState(held === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Held here rather than inside RankingsView, so the field can sit in the
  // header and stay put while the list scrolls under it.
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await apiJson<Entry[]>('/entries/me');
      setEntries(rows);
      storeCached(LIST_KEY, rows);
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
      belowHeader={
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="search your list"
        />
      }
    >
      {loading ? (
        <View>
          {TIERS.slice(0, 3).map((tier, i) => (
            <View key={tier} style={{ marginTop: i === 0 ? 0 : spacing.xl }}>
              <View style={styles.tierHeader}>
                <Skeleton width={78} height={26} borderRadius={radius.sm} />
                <View style={styles.tierRule} />
              </View>
              <SkeletonList count={2} />
            </View>
          ))}
        </View>
      ) : error && entries.length === 0 ? (
        <Empty>{error}</Empty>
      ) : (
        <RankingsView
          entries={entries}
          owner
          onChanged={load}
          query={query}
          onQueryChange={setQuery}
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
