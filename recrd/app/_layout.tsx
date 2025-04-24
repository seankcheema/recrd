// app/_layout.tsx
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [loaded] = useFonts({ /* ... */ });
  if (!loaded) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="components/List" />
      <Stack.Screen name="components/AddNew" />
      <Stack.Screen name="components/Trending" />
      <Stack.Screen name="components/Profile" />

      <Stack.Screen name="components/Album/[albumId]" />
      <Stack.Screen name="components/Genre/[genreName]" />
    </Stack>
  );
}
