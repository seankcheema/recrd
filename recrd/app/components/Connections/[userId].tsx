// app/components/Connections/[userId].tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen, { Empty } from '@/lib/Screen';
import { SkeletonList } from '@/lib/Skeleton';
import { Glass } from '@/lib/Glass';
import { apiJson } from '@/lib/session';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { PersonRow } from '@/lib/types';

type Tab = 'followers' | 'following';

export default function ConnectionsPage() {
  const router = useRouter();
  const { userId, tab } = useLocalSearchParams<{ userId: string; tab?: string }>();
  const [active, setActive] = useState<Tab>(tab === 'following' ? 'following' : 'followers');
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPeople(await apiJson<PersonRow[]>(`/users/${userId}/${active}`));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, active]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async (person: PersonRow) => {
    const next = !person.isFollowing;
    setPeople((prev) =>
      prev.map((p) => (p.id === person.id ? { ...p, isFollowing: next } : p))
    );
    try {
      await apiJson(`/users/${person.id}/follow`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setPeople((prev) =>
        prev.map((p) => (p.id === person.id ? { ...p, isFollowing: !next } : p))
      );
    }
  };

  return (
    <Screen showBack title="people">
      <Glass style={styles.tabBar} cornerRadius={radius.md} tone="clear">
        <View style={styles.tabRow}>
          {(['followers', 'following'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, active === t && styles.tabActive]}
              onPress={() => setActive(t)}
            >
              <GlobalText
                style={[styles.tabLabel, active === t && { color: colors.bg }]}
              >
                {t}
              </GlobalText>
            </Pressable>
          ))}
        </View>
      </Glass>

      {loading ? (
        <SkeletonList count={6} size={44} circle />
      ) : error ? (
        <Empty>{error}</Empty>
      ) : people.length === 0 ? (
        <Empty>
          {active === 'followers' ? 'no followers yet' : 'not following anyone yet'}
        </Empty>
      ) : (
        people.map((person) => (
          <View key={person.id} style={styles.row}>
            <Pressable
              style={styles.rowMain}
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
                <GlobalText style={styles.name} numberOfLines={1}>
                  {person.name}
                </GlobalText>
                {person.username ? (
                  <GlobalText style={styles.bio} numberOfLines={1}>
                    @{person.username}
                  </GlobalText>
                ) : person.bio ? (
                  <GlobalText style={styles.bio} numberOfLines={1}>
                    {person.bio}
                  </GlobalText>
                ) : null}
              </View>
            </Pressable>

            {!person.isMe && (
              <Pressable
                style={({ pressed }) => [
                  styles.followButton,
                  person.isFollowing && styles.followingButton,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => toggleFollow(person)}
              >
                <GlobalText
                  style={[
                    styles.followText,
                    person.isFollowing && { color: colors.text },
                  ]}
                >
                  {person.isFollowing ? 'following' : 'follow'}
                </GlobalText>
              </Pressable>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    marginBottom: spacing.xl,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.gold,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: font.bold,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  pfp: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  bio: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  followButton: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
  },
  followText: {
    fontSize: 13,
    fontFamily: font.bold,
    color: colors.bg,
  },
});
