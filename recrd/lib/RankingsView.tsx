// lib/RankingsView.tsx
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlobalText from './GlobalText';
import RankSheet from './RankSheet';
import SearchField from './SearchField';
import { Empty, SectionHeader } from './Screen';
import { useAlbumGenres } from './genres';
import { TIERS, TIER_COLORS, Tier } from './tiers';
import { colors, font, radius, spacing } from './theme';
import type { Entry, SavedAlbum } from './types';

interface Props {
  entries: Entry[];
  /** When given, a "to be listened" section under the tiers. */
  saved?: SavedAlbum[];
  /** Shown in place of the tiers when the list is empty to begin with. */
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  /** Your own list: every row can be re-ranked or taken off. */
  owner?: boolean;
  /** Called after a row is re-ranked or removed, so the list can reload. */
  onChanged?: () => void;
}

const matches = (query: string, ...fields: (string | null | undefined)[]) =>
  fields.some((f) => (f || '').toLowerCase().includes(query));

/**
 * Someone's ranked albums, grouped into tiers, with a search box and a row of
 * genre chips. Used for both your own list and anyone else's.
 */
export default function RankingsView({
  entries,
  saved,
  emptyState,
  searchPlaceholder = 'search this list',
  owner = false,
  onChanged,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);

  const albumIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.albumId))).sort(),
    [entries]
  );
  const genresByAlbum = useAlbumGenres(albumIds);

  // Only offer chips for genres actually present in this list.
  const availableGenres = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of entries) {
      for (const g of genresByAlbum[entry.albumId] || []) seen.add(g);
    }
    return Array.from(seen).sort();
  }, [entries, genresByAlbum]);

  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      entries.filter((e) => {
        if (q && !matches(q, e.albumName, e.artistName)) return false;
        if (genre && !(genresByAlbum[e.albumId] || []).includes(genre)) return false;
        return true;
      }),
    [entries, q, genre, genresByAlbum]
  );

  // The watchlist has no genre of its own here, so only the search narrows it.
  const visibleSaved = useMemo(
    () => (saved || []).filter((a) => !q || matches(q, a.albumName, a.artistName)),
    [saved, q]
  );

  const filtering = Boolean(q || genre);

  if (entries.length === 0 && !(saved || []).length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <View>
      <SearchField value={query} onChangeText={setQuery} placeholder={searchPlaceholder} />

      {availableGenres.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="all" active={genre === null} onPress={() => setGenre(null)} />
          {availableGenres.map((g) => (
            <Chip
              key={g}
              label={g}
              active={genre === g}
              onPress={() => setGenre(genre === g ? null : g)}
            />
          ))}
        </ScrollView>
      )}

      {entries.length > 0 && visible.length === 0 && (
        <Empty>nothing here matches that.</Empty>
      )}

      {TIERS.map((tier) => {
        const tierEntries = visible.filter((e) => e.tier === tier);
        // While filtering, an empty tier is just noise.
        if (filtering && tierEntries.length === 0) return null;

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
                onLongPress={owner ? () => setEditing(entry) : undefined}
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
                {owner && (
                  <Pressable
                    onPress={() => setEditing(entry)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.rowAction, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="more-horizontal" size={20} color={colors.textMuted} />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        );
      })}

      {saved && (
        <>
          <SectionHeader>to be listened</SectionHeader>
          {visibleSaved.length === 0 ? (
            <Empty>
              {q
                ? 'nothing saved matches that.'
                : 'nothing saved. tap the bookmark on an album to come back to it later.'}
            </Empty>
          ) : (
            visibleSaved.map((album) => (
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
        </>
      )}

      <RankSheet
        visible={editing !== null}
        album={
          editing
            ? {
                id: editing.albumId,
                name: editing.albumName,
                artistName: editing.artistName,
                coverUrl: editing.coverUrl,
              }
            : null
        }
        existing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged?.();
        }}
        onDeleted={() => {
          setEditing(null);
          onChanged?.();
        }}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <GlobalText style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </GlobalText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipScroll: {
    marginTop: spacing.md,
    // Let the row bleed to both edges of the screen while it scrolls.
    marginHorizontal: -spacing.xl,
  },
  chipRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
    backgroundColor: colors.fill,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: font.bold,
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.bg,
  },
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
  rowAction: {
    paddingLeft: spacing.sm,
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
});
