// app/components/EditProfile.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen from '@/lib/Screen';
import { Skeleton } from '@/lib/Skeleton';
import UsernameField, { UsernameState } from '@/lib/UsernameField';
import { apiJson, authFetch, errorMessage, useAuth } from '@/lib/session';
import { colors, font, goldGlow, radius, spacing } from '@/lib/theme';
import type { Profile } from '@/lib/types';

/** Guess a content type from the file name the picker hands back. */
function contentTypeFor(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export default function EditProfile() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [usernameState, setUsernameState] = useState<UsernameState>('empty');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiJson<Profile>('/users/me');
        setName(profile.name);
        setUsername(profile.username ?? '');
        setCurrentUsername(profile.username);
        setBio(profile.bio ?? '');
        setAvatarUrl(profile.avatarUrl ?? '');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickAvatar = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('recrd needs access to your photos to set a picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploading(true);
    // Show the local file straight away; the upload swaps in the hosted one.
    setAvatarUrl(asset.uri);
    try {
      const body = new FormData();
      body.append('file', {
        uri: asset.uri,
        name: asset.fileName || `avatar.${asset.uri.split('.').pop() || 'jpg'}`,
        type: asset.mimeType || contentTypeFor(asset.uri),
      } as any);

      // Not apiJson: FormData has to set its own multipart boundary.
      const resp = await authFetch('/users/me/avatar', { method: 'POST', body });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(errorMessage(data, 'Upload failed'));

      setAvatarUrl(data.avatarUrl);
      await refreshMe();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (saving) return;
    if (!name.trim()) {
      setError('Your name cannot be empty.');
      return;
    }
    if (usernameState === 'taken') {
      setError('That username is taken — pick another.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiJson('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase() || undefined,
          bio: bio.trim(),
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
      <>
        {loading ? (
          <View style={styles.loading}>
            <Skeleton width={96} height={96} circle style={{ alignSelf: 'center' }} />
            <Skeleton width={90} height={13} />
            <Skeleton width="100%" height={50} borderRadius={radius.md} />
            <Skeleton width={40} height={13} />
            <Skeleton width="100%" height={96} borderRadius={radius.md} />
          </View>
        ) : (
          <>
            <View style={styles.avatarWrap}>
              <Pressable
                onPress={pickAvatar}
                disabled={uploading}
                style={({ pressed }) => pressed && { opacity: 0.8 }}
              >
                <Image
                  source={
                    avatarUrl.trim()
                      ? { uri: avatarUrl.trim() }
                      : require('@/assets/images/placeholder_album.png')
                  }
                  style={styles.pfp}
                />
                <View style={styles.avatarBadge}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.bg} />
                  ) : (
                    <Feather name="camera" size={15} color={colors.bg} />
                  )}
                </View>
              </Pressable>
              <Pressable onPress={pickAvatar} disabled={uploading} hitSlop={8}>
                <GlobalText style={styles.avatarHint}>
                  {uploading ? 'uploading…' : 'change photo'}
                </GlobalText>
              </Pressable>
            </View>

            <GlobalText style={styles.label}>name</GlobalText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="your name"
              placeholderTextColor={colors.textFaint}
              maxLength={40}
            />

            <GlobalText style={[styles.label, { marginTop: spacing.xl }]}>
              username
            </GlobalText>
            <UsernameField
              value={username}
              onChangeText={setUsername}
              currentUsername={currentUsername}
              onStateChange={setUsernameState}
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
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  pfp: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
    backgroundColor: colors.bgLift,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  avatarHint: {
    color: colors.gold,
    fontSize: 13,
    fontFamily: font.bold,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
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
  loading: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  button: {
    marginTop: spacing.xxl,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: goldGlow,
  },
  buttonText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.bg,
  },
});
