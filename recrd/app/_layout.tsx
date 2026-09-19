// app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Nav from '@/lib/Nav';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/session';
import { colors } from '@/lib/theme';

// Keep splash visible until we manually hide it
SplashScreen.preventAutoHideAsync();

const AUTH_ROUTES = ['/components/Login', '/components/Signup'];

function AppShell() {
  const { me, ready } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const onAuthScreen = AUTH_ROUTES.includes(pathname);

  // Send signed-out visitors to the login screen, and signed-in ones away
  // from it. Waits for `ready` so a restored session doesn't flash Login.
  useEffect(() => {
    if (!ready) return;
    if (!me && !onAuthScreen) {
      router.replace('/components/Login');
    } else if (me && onAuthScreen) {
      router.replace('/');
    }
  }, [ready, me, onAuthScreen, segments, router]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',  // default no-animation for main pages
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Main pages: swipe-back disabled */}
        <Stack.Screen
          name="index"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="components/List"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="components/AddNew"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="components/Trending"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="components/Profile"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="components/Login"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="components/Signup"
          options={{ gestureEnabled: false }}
        />

        {/* Detail pages: keep default gestures, with slide animation */}
        <Stack.Screen
          name="components/Album/[albumId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/Genre/[genreName]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/Artist/[artistId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/User/[userId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/Entry/[entryId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/Connections/[userId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/EditProfile"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      {/* Fixed Nav bar outside the Stack, hidden while signed out */}
      {me && !onAuthScreen && (
        <View>
          <Nav />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Bold':    require('../assets/fonts/Nunito-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
