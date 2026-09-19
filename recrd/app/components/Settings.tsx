// app/components/Settings.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import Screen, { SectionHeader } from '@/lib/Screen';
import { useAuth } from '@/lib/session';
import { colors, font, goldGlow, radius, spacing } from '@/lib/theme';

export default function SettingsPage() {
  const router = useRouter();
  const { me, signOut, changePassword, deleteAccount } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const savePassword = async () => {
    setPwError(null);
    setPwDone(false);
    if (!current || !next) {
      setPwError('Fill in both your current and new password.');
      return;
    }
    if (next.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setPwDone(true);
    } catch (e: any) {
      setPwError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    // A second, explicit yes: this one cannot be undone.
    Alert.alert(
      'delete account?',
      'This permanently removes your account, your rankings, your reviews and your list. It cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'delete', style: 'destructive', onPress: runDelete },
      ]
    );
  };

  const runDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      // Deleting signs you out, and the root layout sends you to login.
      router.replace('/components/Login');
    } catch (e: any) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen title="settings" showBack>
      <>
        <View style={styles.account}>
          <GlobalText style={styles.accountLabel}>signed in as</GlobalText>
          <GlobalText style={styles.accountValue}>{me?.email ?? me?.name}</GlobalText>
        </View>

        <SectionHeader>change password</SectionHeader>

        <GlobalText style={styles.label}>current password</GlobalText>
        <TextInput
          style={styles.input}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          textContentType="password"
        />

        <GlobalText style={[styles.label, { marginTop: spacing.lg }]}>
          new password
        </GlobalText>
        <TextInput
          style={styles.input}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          placeholder="at least 6 characters"
          placeholderTextColor={colors.textFaint}
          textContentType="newPassword"
        />

        <GlobalText style={[styles.label, { marginTop: spacing.lg }]}>
          confirm new password
        </GlobalText>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          textContentType="newPassword"
          onSubmitEditing={savePassword}
          returnKeyType="go"
        />

        {pwError ? <GlobalText style={styles.error}>{pwError}</GlobalText> : null}
        {pwDone ? <GlobalText style={styles.notice}>password changed.</GlobalText> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
          onPress={savePassword}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <GlobalText style={styles.buttonText}>save password</GlobalText>
          )}
        </Pressable>

        <SectionHeader>account</SectionHeader>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          onPress={signOut}
        >
          <Feather name="log-out" size={18} color={colors.text} />
          <GlobalText style={styles.rowLabel}>log out</GlobalText>
          <Feather name="chevron-right" size={18} color={colors.textFaint} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          onPress={() => setShowDelete((v) => !v)}
        >
          <Feather name="trash-2" size={18} color={colors.danger} />
          <GlobalText style={[styles.rowLabel, { color: colors.danger }]}>
            delete account
          </GlobalText>
          <Feather
            name={showDelete ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={colors.textFaint}
          />
        </Pressable>

        {showDelete && (
          <View style={styles.deleteBox}>
            <GlobalText style={styles.deleteCopy}>
              This permanently removes your account, your rankings, your reviews and
              your list. It cannot be undone.
            </GlobalText>
            <TextInput
              style={styles.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="confirm your password"
              placeholderTextColor={colors.textFaint}
              textContentType="password"
            />
            {deleteError ? (
              <GlobalText style={styles.error}>{deleteError}</GlobalText>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.85 }]}
              onPress={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <GlobalText style={styles.deleteButtonText}>
                  delete my account
                </GlobalText>
              )}
            </Pressable>
          </View>
        )}
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: {
    paddingTop: spacing.sm,
    gap: 2,
  },
  accountLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  accountValue: {
    color: colors.text,
    fontSize: 16,
    fontFamily: font.bold,
  },
  label: {
    fontFamily: font.regular,
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
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.md,
  },
  notice: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 12,
    marginTop: spacing.md,
  },
  button: {
    marginTop: spacing.xl,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontFamily: font.bold,
  },
  deleteBox: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  deleteCopy: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteButton: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.danger,
  },
});
