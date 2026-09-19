import React from 'react';
import ProfileView from '@/lib/ProfileView';
import { useAuth } from '@/lib/session';

export default function Profile() {
  const { me } = useAuth();

  return <ProfileView userId={me?.uid ?? null} self />;
}
