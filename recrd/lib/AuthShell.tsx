// app/components/AuthShell.tsx
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlobalText from './GlobalText';
import { Glass } from './Glass';
import { colors, font, radius, spacing } from './theme';

/** Shared chrome for the login and sign up screens. */
export default function AuthShell({
  heading,
  tagline,
  children,
}: {
  heading: string;
  tagline?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E7BC1033', '#E7BC1008', colors.bg]}
        style={styles.glow}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <GlobalText style={styles.heading}>{heading}</GlobalText>
            {tagline ? <GlobalText style={styles.tagline}>{tagline}</GlobalText> : null}

            <Glass style={styles.card} cornerRadius={radius.xl} tone="regular">
              <View style={styles.cardInner}>{children}</View>
            </Glass>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  label: {
    fontFamily: font.regular,
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
  error: {
    color: colors.danger,
    fontFamily: font.regular,
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  notice: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: spacing.xxl,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 5px 16px rgba(231, 188, 16, 0.35)',
  },
  buttonText: {
    fontFamily: font.bold,
    fontSize: 16,
    color: colors.bg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 4,
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: 14,
  },
  footerLink: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 48,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 44,
    color: colors.gold,
    textAlign: 'center',
    letterSpacing: -1,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.xxl,
  },
  cardInner: {
    padding: spacing.xl,
  },
});
