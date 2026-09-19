// app/SignUp.tsx
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import AuthShell, { authStyles as s } from '@/lib/AuthShell';
import UsernameField, { UsernameState } from '@/lib/UsernameField';
import { useAuth } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameState>('empty');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    setNotice(null);
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Your username needs at least 3 characters.');
      return;
    }
    if (usernameState === 'taken') {
      setError('That username is taken — pick another.');
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
      const { needsConfirmation } = await signUp(name, username, email, password);
      if (needsConfirmation) {
        // Email confirmation is on for this Supabase project, so there is no
        // session yet — the account is real, it just has to be verified first.
        setNotice('Check your email to confirm your account, then log in.');
        return;
      }
      // on success, perhaps go to login or home
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell heading="create account" tagline="start your list">
      <GlobalText style={s.label}>name</GlobalText>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="what should we call you?"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="words"
        textContentType="name"
      />

      <GlobalText style={[s.label, { marginTop: spacing.xl }]}>username</GlobalText>
      <UsernameField
        value={username}
        onChangeText={setUsername}
        onStateChange={setUsernameState}
      />

      <GlobalText style={[s.label, { marginTop: spacing.xl }]}>email</GlobalText>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textFaint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />

      <GlobalText style={[s.label, { marginTop: spacing.xl }]}>password</GlobalText>
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="at least 6 characters"
        placeholderTextColor={colors.textFaint}
        textContentType="newPassword"
      />

      <GlobalText style={[s.label, { marginTop: spacing.xl }]}>confirm password</GlobalText>
      <TextInput
        style={s.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={colors.textFaint}
        textContentType="password"
        onSubmitEditing={handleSignUp}
        returnKeyType="go"
      />

      {error ? <GlobalText style={s.error}>{error}</GlobalText> : null}
      {notice ? <GlobalText style={s.notice}>{notice}</GlobalText> : null}

      <Pressable
        style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <GlobalText style={s.buttonText}>sign up</GlobalText>
        )}
      </Pressable>

      <View style={s.footer}>
        <GlobalText style={s.footerText}>Already have an account?</GlobalText>
        <Pressable onPress={() => router.replace('/components/Login')} hitSlop={8}>
          <GlobalText style={s.footerLink}>log in</GlobalText>
        </Pressable>
      </View>
    </AuthShell>
  );
}
