// app/Login.tsx
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import GlobalText from '@/lib/GlobalText';
import AuthShell, { authStyles as s } from '@/lib/AuthShell';
import { useAuth } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // on success, navigate home (or wherever)
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell heading="recrd" tagline="rank the albums you've listened to">
      <GlobalText style={s.label}>email</GlobalText>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={colors.textFaint}
        textContentType="emailAddress"
      />

      <GlobalText style={[s.label, { marginTop: spacing.xl }]}>password</GlobalText>
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={colors.textFaint}
        textContentType="password"
        onSubmitEditing={handleLogin}
        returnKeyType="go"
      />

      {error ? <GlobalText style={s.error}>{error}</GlobalText> : null}

      <Pressable
        style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <GlobalText style={s.buttonText}>log in</GlobalText>
        )}
      </Pressable>

      <View style={s.footer}>
        <GlobalText style={s.footerText}>Don't have an account?</GlobalText>
        <Pressable onPress={() => router.replace('/components/Signup')} hitSlop={8}>
          <GlobalText style={s.footerLink}>sign up</GlobalText>
        </Pressable>
      </View>
    </AuthShell>
  );
}
