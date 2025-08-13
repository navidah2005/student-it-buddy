// app/_layout.tsx
import { AuthProvider, useAuth } from '@/lib/auth';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

function Gate() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments(); // e.g. ['(auth)','signin'] or ['(tabs)','index']

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) router.replace('/(auth)/signin');
    if (session && inAuth) router.replace('/(tabs)/index');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}