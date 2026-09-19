import React from 'react';
import { useRouter } from 'expo-router';
import ProfileView from '@/lib/ProfileView';
import { useAuth } from '@/lib/session';

export default function Profile() {
  const { me, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/components/Login');
  };

  return <ProfileView userId={me?.uid ?? null} self onSignOut={handleSignOut} />;
}
