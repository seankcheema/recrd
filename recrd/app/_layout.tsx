import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Nunito': require('@/assets/fonts/Nunito-VariableFont_wght.ttf'),
  });

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hides the header for all screens by default
        animation: 'none', // Optional: Set a default transition animation
      }}
    >
      {/* Home Screen */}
      <Stack.Screen name="index" />
      
      {/* List Screen */}
      <Stack.Screen name="list" />

      {/* Add New Screen */}
      <Stack.Screen name="add-new" />

      {/* Trending Screen */}
      <Stack.Screen name="trending" />

      {/* Profile Screen */}
      <Stack.Screen name="profile" />
    </Stack>
  );
}
