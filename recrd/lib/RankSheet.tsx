// app/components/RankSheet.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlobalText from './GlobalText';
import { Glass } from './Glass';
import { apiJson } from './session';
import { TIERS, TIER_COLORS, TIER_DEFAULT_RANK, Tier, tierForRank } from './tiers';
import { colors, font, radius, spacing } from './theme';
import type { Entry } from './types';

interface Album {
  id: string;
  name: string;
  artistName: string;
  coverUrl?: string | null;
}

interface Props {
  visible: boolean;
  album: Album | null;
  existing?: Entry | null;
  /** Dominant colour of the cover, washed through the sheet. */
  accent?: string;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
  onDeleted?: (entryId: string) => void;
}

export default function RankSheet({
  visible,
  album,
  existing,
  accent,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const insets = useSafeAreaInsets();
  const [tier, setTier] = useState<Tier>('B');
  const [review, setReview] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setTier(existing ? tierForRank(existing.rank) : 'B');
    setReview(existing?.review ?? '');
    setIsPrivate(existing?.visibility === 'private');
    setError(null);
  }, [visible, existing]);

  const save = async () => {
    if (!album || saving) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await apiJson<Entry>('/entries', {
        method: 'POST',
        body: JSON.stringify({
          spotifyAlbumId: album.id,
          albumName: album.name,
          artistName: album.artistName,
          coverUrl: album.coverUrl ?? null,
          rank: TIER_DEFAULT_RANK[tier],
          review: review.trim() || null,
          visibility: isPrivate ? 'private' : 'public',
        }),
      });
      onSaved(entry);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/entries/${existing.id}`, { method: 'DELETE' });
      onDeleted?.(existing.id);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.scrim} />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.sheetWrapper}
        pointerEvents="box-none"
      >
        <Glass
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          cornerRadius={radius.xl}
          tone="regular"
          tint={accent ? `${accent}1F` : undefined}
        >
          <View style={styles.grabber} />

          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <GlobalText style={styles.title}>
                {existing ? 'edit ranking' : 'rank this album'}
              </GlobalText>
              <GlobalText style={styles.subtitle} numberOfLines={1}>
                {album?.name}
              </GlobalText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.tierRow}>
            {TIERS.map((t) => {
              const active = tier === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTier(t)}
                  style={({ pressed }) => [
                    styles.tierButton,
                    { backgroundColor: TIER_COLORS[t] },
                    active ? styles.tierButtonActive : styles.tierButtonIdle,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <GlobalText style={styles.tierLetter}>{t}</GlobalText>
                </Pressable>
              );
            })}
          </View>

          <GlobalText style={styles.label}>review (optional)</GlobalText>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="what did you think?"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            maxLength={500}
          />

          <Pressable style={styles.privacyRow} onPress={() => setIsPrivate((p) => !p)}>
            <Feather
              name={isPrivate ? 'lock' : 'globe'}
              size={16}
              color={isPrivate ? colors.gold : colors.textMuted}
            />
            <GlobalText
              style={[styles.privacyText, isPrivate && { color: colors.gold }]}
            >
              {isPrivate ? 'only me' : 'visible to everyone'}
            </GlobalText>
          </Pressable>

          {error ? <GlobalText style={styles.error}>{error}</GlobalText> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <GlobalText style={styles.buttonText}>
                {existing ? 'save changes' : 'add to my list'}
              </GlobalText>
            )}
          </Pressable>

          {existing ? (
            <Pressable onPress={remove} disabled={saving} style={{ marginTop: spacing.lg }}>
              <GlobalText style={styles.remove}>remove from my list</GlobalText>
            </Pressable>
          ) : null}
        </Glass>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000073',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.edgeStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    fontSize: 19,
    fontFamily: font.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  close: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.glassStrong,
  },
  tierRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  tierButton: {
    flex: 1,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierButtonIdle: {
    opacity: 0.35,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierButtonActive: {
    borderWidth: 2,
    borderColor: colors.text,
    transform: [{ scale: 1.04 }],
  },
  tierLetter: {
    fontSize: 19,
    fontFamily: font.bold,
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 76,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  privacyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 14px rgba(231, 188, 16, 0.35)',
  },
  buttonText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.bg,
  },
  remove: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 14,
  },
});
