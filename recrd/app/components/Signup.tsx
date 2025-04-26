// app/SignUp.tsx
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

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || 'Sign up failed');
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.container}
      >
        <View style={styles.form}>
          <GlobalText style={styles.heading}>create account</GlobalText>

          <GlobalText style={styles.label}>username</GlobalText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder=""
            placeholderTextColor="#FFFAF0A0"
            autoCapitalize="words"
            textContentType="name"
          />

          <GlobalText style={[styles.label, { marginTop: 20 }]}>email</GlobalText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#FFFAF0A0"
            keyboardType="email-address"
            autoCapitalize="none"
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
            textContentType="newPassword"
          />

          <GlobalText style={[styles.label, { marginTop: 20 }]}>confirm password</GlobalText>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
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
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <GlobalText style={styles.buttonText}>sign up</GlobalText>
            )}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
            <GlobalText style={{ color: '#FFFAF0', fontFamily: 'Nunito-Regular' }}>
              Already have an account?{' '}
            </GlobalText>
            <TouchableOpacity onPress={() => router.push('/components/Login')}>
              <GlobalText style={{ color: '#E7BC10', fontFamily: 'Nunito-Bold' }}>
                log in
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
    fontSize: 28,
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
