// app/_layout.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Nav from './components/Nav';

// Keep splash visible until we manually hide it
SplashScreen.preventAutoHideAsync();

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
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',  // default no-animation for main pages
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

        {/* Detail pages: keep default gestures, with slide animation */}
        <Stack.Screen
          name="components/Album/[albumId]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="components/Genre/[genreName]"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>

      {/* Fixed Nav bar outside the Stack */}
      <View style={styles.navWrapper}>
        <Nav />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
