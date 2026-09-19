// app/components/User/[userId].tsx
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ProfileView from '@/lib/ProfileView';
import { useAuth } from '@/lib/session';

export default function UserPage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { me } = useAuth();

  // Tapping your own name anywhere should feel like your own profile.
  return <ProfileView userId={userId} self={me?.uid === userId} showBack />;
}
