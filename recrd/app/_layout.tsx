// app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  DarkTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
  usePathname,
} from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import Nav from '@/lib/Nav';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/session';
import { colors } from '@/lib/theme';

// Keep splash visible until we manually hide it
SplashScreen.preventAutoHideAsync();

// The window behind the navigator, which is white until told otherwise. It
// shows during a swipe-back, in the strip the outgoing screen has left and
// the one underneath has not covered yet. app.json sets this for a build, but
// that is native config and does nothing in Expo Go.
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {
  // Nothing to do about it; the flash is cosmetic.
});

// React Navigation paints the space around a screen mid-transition from its
// theme, not from any screen's own style — and its default theme is a light
// one. That is the white edge that shows while a page slides away.
const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg },
};

const AUTH_ROUTES = [
  '/components/Login',
  '/components/Signup',
  '/components/ForgotPassword',
];

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
        <Stack.Screen
          name="components/ForgotPassword"
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
        <Stack.Screen
          name="components/Rankings/[userId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/Settings"
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
      <ThemeProvider value={navigationTheme}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Anything the navigator is not covering at that moment is page colour,
    // not white.
    backgroundColor: colors.bg,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
