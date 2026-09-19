// app/components/Rankings/[userId].tsx
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Screen, { Empty } from '@/lib/Screen';
import RankingsView from '@/lib/RankingsView';
import { Skeleton, SkeletonList } from '@/lib/Skeleton';
import { apiJson, useAuth } from '@/lib/session';
import { TIERS } from '@/lib/tiers';
import { colors, radius, spacing } from '@/lib/theme';
import type { Entry, Profile, SavedAlbum } from '@/lib/types';

/** Anyone's full ranked list, tier by tier. */
export default function RankingsPage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { me } = useAuth();
  const self = me?.uid === userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saved, setSaved] = useState<SavedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, e, w] = await Promise.all([
        apiJson<Profile>(self ? '/users/me' : `/users/${userId}`),
        apiJson<Entry[]>(`/users/${userId}/entries`),
        apiJson<SavedAlbum[]>(`/users/${userId}/watchlist`),
      ]);
      setProfile(p);
      setEntries(e);
      setSaved(w);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, self]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen
      showBack
      title={profile ? (self ? 'my list' : `${profile.name}'s list`) : undefined}
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
          owner={self}
          onChanged={load}
          searchPlaceholder={self ? 'search your list' : 'search this list'}
          emptyState={<Empty>{self ? "you haven't ranked anything yet" : 'nothing ranked yet'}</Empty>}
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
});
