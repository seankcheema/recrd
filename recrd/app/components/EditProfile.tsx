// app/components/EditProfile.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen from '@/lib/Screen';
import { apiJson, useAuth } from '@/lib/session';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { Profile } from '@/lib/types';

export default function EditProfile() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiJson<Profile>('/users/me');
        setName(profile.name);
        setBio(profile.bio ?? '');
        setAvatarUrl(profile.avatarUrl ?? '');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) {
      setError('Your name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiJson('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });
      await refreshMe();
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="edit profile" showBack>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            <View style={styles.avatarWrap}>
              <Image
                source={
                  avatarUrl.trim()
                    ? { uri: avatarUrl.trim() }
                    : require('@/assets/images/placeholder_album.png')
                }
                style={styles.pfp}
              />
            </View>

            <GlobalText style={styles.label}>username</GlobalText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="your name"
              placeholderTextColor={colors.textFaint}
              maxLength={40}
            />

            <GlobalText style={[styles.label, { marginTop: spacing.xl }]}>bio</GlobalText>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="tell people what you're into"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={200}
            />

            <GlobalText style={[styles.label, { marginTop: spacing.xl }]}>
              profile picture url
            </GlobalText>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="url"
            />

            {error ? <GlobalText style={styles.error}>{error}</GlobalText> : null}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <GlobalText style={styles.buttonText}>save</GlobalText>
              )}
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  pfp: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
    backgroundColor: colors.bgLift,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 15,
  },
  multiline: {
    height: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xxl,
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
});
