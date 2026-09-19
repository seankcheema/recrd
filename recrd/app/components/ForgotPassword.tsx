// app/components/ForgotPassword.tsx
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import AuthShell, { authStyles as s } from '@/lib/AuthShell';
import { useAuth } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

type Step = 'email' | 'code';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep('code');
      // Deliberately not "we found your account" — the server does not say
      // whether the address exists, and neither should this.
      setNotice('If that email has an account, a 6-digit code is on its way.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!code.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code, password);
      // The code bought a session, so they are already signed in.
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="reset password"
      tagline={
        step === 'email'
          ? "we'll email you a code"
          : 'enter the code and pick a new password'
      }
    >
      <GlobalText style={s.label}>email</GlobalText>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        editable={step === 'email'}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={colors.textFaint}
        textContentType="emailAddress"
        onSubmitEditing={step === 'email' ? sendCode : undefined}
        returnKeyType="go"
      />

      {step === 'code' && (
        <>
          <GlobalText style={[s.label, { marginTop: spacing.xl }]}>code</GlobalText>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            maxLength={10}
            textContentType="oneTimeCode"
          />

          <GlobalText style={[s.label, { marginTop: spacing.xl }]}>
            new password
          </GlobalText>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="at least 6 characters"
            placeholderTextColor={colors.textFaint}
            textContentType="newPassword"
          />

          <GlobalText style={[s.label, { marginTop: spacing.xl }]}>
            confirm new password
          </GlobalText>
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            textContentType="newPassword"
            onSubmitEditing={submit}
            returnKeyType="go"
          />
        </>
      )}

      {error ? <GlobalText style={s.error}>{error}</GlobalText> : null}
      {notice ? <GlobalText style={s.notice}>{notice}</GlobalText> : null}

      <Pressable
        style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}
        onPress={step === 'email' ? sendCode : submit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <GlobalText style={s.buttonText}>
            {step === 'email' ? 'send code' : 'set new password'}
          </GlobalText>
        )}
      </Pressable>

      <View style={s.footer}>
        {step === 'code' ? (
          <>
            <GlobalText style={s.footerText}>didn't get it?</GlobalText>
            <Pressable onPress={sendCode} hitSlop={8} disabled={loading}>
              <GlobalText style={s.footerLink}>send again</GlobalText>
            </Pressable>
          </>
        ) : (
          <>
            <GlobalText style={s.footerText}>remembered it?</GlobalText>
            <Pressable onPress={() => router.replace('/components/Login')} hitSlop={8}>
              <GlobalText style={s.footerLink}>log in</GlobalText>
            </Pressable>
          </>
        )}
      </View>
    </AuthShell>
  );
}
