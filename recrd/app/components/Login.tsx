// app/Login.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import GlobalText from '../components/GlobalText';
import { useRouter } from 'expo-router';
import { HOST_IP } from '@env';

const API_URL = `http://${HOST_IP}:8000`;

export default function LoginPage() {
  const router = useRouter();
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
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      // on success, navigate home (or wherever)
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.container}
      >
        <View style={styles.form}>
          <GlobalText style={styles.heading}>recrd</GlobalText>

          <GlobalText style={styles.label}>email</GlobalText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#FFFAF0A0"
            textContentType="emailAddress"
          />

          <GlobalText style={[styles.label, { marginTop: 20 }]}>password</GlobalText>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#FFFAF0A0"
            textContentType="password"
          />

          {error ? (
            <GlobalText style={styles.error}>{error}</GlobalText>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <GlobalText style={styles.buttonText}>log in</GlobalText>
            )}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
            <GlobalText style={{ color: '#FFFAF0', fontFamily: 'Nunito-Regular' }}>
              Don't have an account?{' '}
            </GlobalText>
            <TouchableOpacity onPress={() => router.push('/components/Signup')}>
              <GlobalText style={{ color: '#E7BC10', fontFamily: 'Nunito-Bold' }}>
                sign up
              </GlobalText>
            </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  form: {

  },
  heading: {
    fontFamily: 'Nunito-Bold',
    fontSize: 48,
    color: '#E7BC10',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: '#FFFAF0',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: '#FFFAF0',
    fontFamily: 'Nunito-Regular',
  },
  error: {
    color: '#E71022',
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#E7BC10',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#111111',
  },
});
