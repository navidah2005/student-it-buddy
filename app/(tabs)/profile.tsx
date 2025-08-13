// app/(tabs)/profile.tsx
import { useAuth } from '@/lib/auth';
import { Link, router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fc' }}>
        <View style={{ padding: 16, flex: 1, justifyContent: 'center' }}>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.sub}>You’re not signed in.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Link href='/(auth)/signin' asChild>
              <TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></TouchableOpacity>
            </Link>
            <Link href='/(auth)/signup' asChild>
              <TouchableOpacity style={styles.grayBtn}><Text>Create account</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${session.firstName ?? ''} ${session.lastName ?? ''}`.trim() || 'Friend';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fc' }}>
      <View style={{ padding: 16, gap: 14 }}>
        {/* Header */}
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.sub}>View your info. To make changes, use Settings.</Text>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            {session.avatarUri ? (
              <Image source={{ uri: session.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}><Text style={{ fontSize: 28 }}>🧑‍💻</Text></View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{fullName}</Text>
              {session.city ? <Text style={styles.meta}>📍 {session.city}</Text> : null}
              {session.email ? <Text style={styles.meta}>✉️ {session.email}</Text> : null}
              {session.phone ? <Text style={styles.meta}>📞 {session.phone}</Text> : null}
            </View>
          </View>
        </View>

        {/* Actions */}
        <Link href="/settings" asChild>
          <TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Edit in Settings</Text></TouchableOpacity>
        </Link>

        <View style={styles.rowGap}>
          <Link href='/(tabs)/chat' asChild>
            <TouchableOpacity style={styles.grayBtn}><Text>💬 Open Chat</Text></TouchableOpacity>
          </Link>
          <Link href='/(tabs)/community' asChild>
            <TouchableOpacity style={styles.grayBtn}><Text>👥 Community</Text></TouchableOpacity>
          </Link>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={async () => { await signOut(); router.replace('/(auth)/signin'); }}
        >
          <Text style={styles.dangerText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  sub: { color: '#555' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eaf3', borderRadius: 14, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 8 },

  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#ddd' },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },

  name: { fontSize: 18, fontWeight: '800', color: '#111' },
  meta: { color: '#444', marginTop: 2 },

  primary: { backgroundColor: '#2b6ef2', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: '700' },
  grayBtn: { backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center', flex: 1 },

  divider: { height: 1, backgroundColor: '#e9ecf3', marginVertical: 14 },

  dangerBtn: { backgroundColor: '#ffe8e8', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  dangerText: { color: '#c00', fontWeight: '800' },
});