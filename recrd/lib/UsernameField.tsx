// lib/UsernameField.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlobalText from './GlobalText';
import { API_URL } from './api';
import { colors, font, radius, spacing } from './theme';

export type UsernameState = 'empty' | 'checking' | 'free' | 'taken';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  /** The handle the account already has; re-typing it is not "taken". */
  currentUsername?: string | null;
  onStateChange?: (state: UsernameState) => void;
  style?: any;
}

/**
 * The @handle input, with a live "is this free?" check.
 *
 * Handles are unique, so the only thing worse than being told at submit time
 * is being told after the account was created. The check is debounced and
 * advisory — the server checks again when the form is actually submitted.
 */
export default function UsernameField({
  value,
  onChangeText,
  currentUsername,
  onStateChange,
}: Props) {
  const [state, setState] = useState<UsernameState>('empty');
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const handle = value.trim().toLowerCase();

    if (!handle) {
      setState('empty');
      setReason(null);
      return;
    }
    if (currentUsername && handle === currentUsername.toLowerCase()) {
      setState('free');
      setReason(null);
      return;
    }

    setState('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `${API_URL}/auth/username-available?username=${encodeURIComponent(handle)}`
        );
        const data = await resp.json();
        if (cancelled) return;
        setState(data.available ? 'free' : 'taken');
        setReason(data.available ? null : data.reason || 'That username is taken.');
      } catch {
        // Offline: let the submit decide rather than blocking on a guess.
        if (!cancelled) {
          setState('free');
          setReason(null);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, currentUsername]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return (
    <View>
      <View
        style={[
          styles.field,
          state === 'taken' && { borderColor: colors.danger },
          state === 'free' && value.trim() ? { borderColor: colors.gold } : null,
        ]}
      >
        <GlobalText style={styles.at}>@</GlobalText>
        <TextInput
          style={styles.input}
          value={value}
          // Handles are always lowercase, so fix it up as they type rather
          // than rejecting it afterwards.
          onChangeText={(text) => onChangeText(text.trim().toLowerCase().replace('@', ''))}
          placeholder="yourhandle"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        {state === 'checking' && <ActivityIndicator size="small" color={colors.textMuted} />}
        {state === 'free' && value.trim() ? (
          <Feather name="check" size={18} color={colors.gold} />
        ) : null}
        {state === 'taken' && <Feather name="x" size={18} color={colors.danger} />}
      </View>
      {reason ? <GlobalText style={styles.reason}>{reason}</GlobalText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
  },
  at: {
    color: colors.textMuted,
    fontSize: 15,
    fontFamily: font.bold,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 15,
  },
  reason: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
