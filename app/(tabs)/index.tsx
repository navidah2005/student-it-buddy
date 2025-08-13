// app/(tabs)/index.tsx
import { useAuth } from '@/lib/auth';
import { listSessions, type SessionMeta } from '@/lib/sessions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList, Image,
  Modal, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const LEGACY_STORAGE_KEY = 'chatMessagesV3';

function greetingLine(name?: string) {
  const h = new Date().getHours();
  const who = name || 'Friend';
  if (h < 12) return `☀️ Good morning, ${who}`;
  if (h < 18) return `🌤️ Good afternoon, ${who}`;
  return `🌙 Good evening, ${who}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();

  const [displayName, setDisplayName] = useState<string | undefined>();
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [recentTitles, setRecentTitles] = useState<string[]>([]);
  const [greet, setGreet] = useState(greetingLine());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setDisplayName(session ? `${session.firstName || ''}`.trim() || undefined : undefined);
    setAvatarUri(session?.avatarUri || undefined);
  }, [session]);

  useEffect(() => {
    const id = setInterval(() => setGreet(greetingLine(displayName)), 60_000);
    return () => clearInterval(id);
  }, [displayName]);

  useEffect(() => {
    (async () => {
      const sessions: SessionMeta[] = await listSessions();
      if (sessions.length) {
        setRecentTitles(sessions.slice(0, 5).map(s => s.title || 'New chat'));
      } else {
        try {
          const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (raw) {
            const msgs = JSON.parse(raw);
            if (Array.isArray(msgs)) {
              const userMsgs = msgs
                .filter((m: any) => m && m.role === 'user' && typeof m.text === 'string')
                .slice(-5)
                .reverse()
                .map((m: any) => m.text);
              if (userMsgs.length) setRecentTitles(userMsgs);
            }
          }
        } catch {}
      }
    })();
  }, []);

  const quickActions = useMemo(() => [
    { label: 'Wi-Fi', emoji: '📶', query: 'wifi not connecting' },
    { label: 'VPN', emoji: '🔒', query: 'vpn setup' },
    { label: 'Email', emoji: '✉️', query: 'email not syncing' },
    { label: 'Printer', emoji: '🖨️', query: 'printer not working' },
  ], []);

  const tutorials = useMemo(() => [
    { id: 'windows11-install', title: 'Install Windows 11', emoji: '🎬' },
  ], []);

  const sendQuick = (query: string) => {
    if (!query.trim()) return;
    router.push({ pathname: '/(tabs)/chat', params: { q: query } });
  };

  const Header = (
    <View>
      {/* top row with hamburger */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.hamburger}>
          <Text style={{ fontSize: 18 }}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome card */}
      <View style={styles.welcome}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>{greet}</Text>
          <Text style={styles.appName}>Student IT Buddy</Text>
          <Text style={styles.sub}>Quick fixes, tutorials, and a helpful community — all in one place.</Text>
        </View>
        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avaPlaceholder]}><Text style={{ fontSize: 22 }}>🧑‍💻</Text></View>
            )}
          </TouchableOpacity>
        </Link>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          placeholder="Ask a quick question…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => sendQuick(search)}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={() => sendQuick(search)}>
          <Text style={styles.searchGo}>Go</Text>
        </TouchableOpacity>
      </View>

      {!session && (
        <View style={styles.card}>
          <Text style={{ fontWeight: '800', marginBottom: 4 }}>Sign in for more</Text>
          <Text style={{ color: '#555', marginBottom: 10 }}>Join the community to post, like, and sync on this device.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Link href='/(auth)/signin' asChild><TouchableOpacity style={styles.primaryBtn}><Text style={styles.primaryText}>Sign in</Text></TouchableOpacity></Link>
            <Link href='/(auth)/signup' asChild><TouchableOpacity style={styles.grayBtn}><Text>Create account</Text></TouchableOpacity></Link>
          </View>
        </View>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Help</Text>
      <View style={styles.quickRow}>
        {quickActions.map(a => (
          <TouchableOpacity key={a.label} style={styles.quickCard} onPress={() => sendQuick(a.query)}>
            <Text style={styles.quickEmoji}>{a.emoji}</Text>
            <Text style={styles.quickText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tutorials */}
      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Tutorials</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {tutorials.map(t => (
          <TouchableOpacity key={t.id} style={styles.tutorialCard} onPress={() => router.push(`/(tabs)/tutorial?id=${t.id}`)}>
            <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
            <Text style={styles.tutorialText}>{t.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {recentTitles.length > 0 && <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Recent Chats</Text>}
    </View>
  );

  const Footer = (
    <View style={{ paddingTop: 10, paddingBottom: 12 + insets.bottom }}>
      <Text style={styles.sectionTitle}>Explore</Text>
      <View style={styles.navRow}>
        <Link href='/(tabs)/chat' asChild><TouchableOpacity style={styles.navCard}><Text style={styles.navEmoji}>💬</Text><Text style={styles.navText}>Open Chat</Text></TouchableOpacity></Link>
        <Link href='/(tabs)/community' asChild><TouchableOpacity style={styles.navCard}><Text style={styles.navEmoji}>👥</Text><Text style={styles.navText}>Community</Text></TouchableOpacity></Link>
        <Link href='/(tabs)/profile' asChild><TouchableOpacity style={styles.navCard}><Text style={styles.navEmoji}>👤</Text><Text style={styles.navText}>Profile</Text></TouchableOpacity></Link>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={['top', 'bottom']}>
      {/* SHORTCUT MENU */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View />
        </Pressable>
        <View style={styles.menuSheet}>
          <Text style={styles.menuTitle}>Shortcuts</Text>

          {/* profile section */}
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>Profile</Text>
            <Link href='/(tabs)/profile' asChild><TouchableOpacity style={styles.menuItem}><Text>👤 View / Edit Profile</Text></TouchableOpacity></Link>
            {session ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => { await signOut(); setMenuOpen(false); router.replace('/(auth)/signin'); }}
              >
                <Text>🚪 Sign out</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Link href='/(auth)/signin' asChild><TouchableOpacity style={styles.menuItem}><Text>🔑 Sign in</Text></TouchableOpacity></Link>
                <Link href='/(auth)/signup' asChild><TouchableOpacity style={styles.menuItem}><Text>✨ Sign up</Text></TouchableOpacity></Link>
              </>
            )}
          </View>

          {/* app section */}
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>App</Text>
            <Link href='/settings' asChild><TouchableOpacity style={styles.menuItem}><Text>⚙️ Settings</Text></TouchableOpacity></Link>
            <Link href='/help' asChild><TouchableOpacity style={styles.menuItem}><Text>❓ Help</Text></TouchableOpacity></Link>
            <Link href='/(tabs)/chat' asChild><TouchableOpacity style={styles.menuItem}><Text>💬 Chat</Text></TouchableOpacity></Link>
            <Link href='/(tabs)/community' asChild><TouchableOpacity style={styles.menuItem}><Text>👥 Community</Text></TouchableOpacity></Link>
          </View>

          <TouchableOpacity style={styles.menuClose} onPress={() => setMenuOpen(false)}><Text>Close</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* MAIN LIST */}
      <FlatList
        data={recentTitles}
        keyExtractor={(item, idx) => idx.toString()}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.recentItem} onPress={() => sendQuick(item)}>
            <Text style={{ marginRight: 8 }}>🕘</Text>
            <Text style={{ flex: 1 }}>{item}</Text>
            <Text>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },

  topRow: { height: 32, marginBottom: 6, alignItems: 'flex-end' },
  hamburger: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eaf3' },

  welcome: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: '#eef6ff', alignItems: 'center', marginBottom: 12 },
  greet: { fontSize: 18, fontWeight: '800', color: '#123' },
  appName: { fontSize: 14, fontWeight: '700', color: '#2b6ef2', marginTop: 2 },
  sub: { color: '#445', marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ddd' },
  avaPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, marginBottom: 16, borderWidth: 1, borderColor: '#e3e6ee' },
  searchIcon: { fontSize: 18, marginRight: 6 },
  searchInput: { flex: 1, paddingHorizontal: 8, height: 40 },
  searchGo: { paddingHorizontal: 8, color: '#2b6ef2', fontWeight: '800' },

  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, color: '#111' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eaf3', borderRadius: 12, padding: 12, marginBottom: 12 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickCard: { backgroundColor: '#f1f5ff', padding: 12, borderRadius: 12, alignItems: 'center', width: '23%', borderWidth: 1, borderColor: '#e6ecff' },
  quickEmoji: { fontSize: 20 },
  quickText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#123' },

  tutorialCard: { backgroundColor: '#fff', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e6eaf3', minWidth: 180, justifyContent: 'center' },
  tutorialText: { marginTop: 6, fontWeight: '700' },

  recentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },

  navRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  navCard: { flex: 1, backgroundColor: '#2b6ef2', padding: 14, borderRadius: 12, alignItems: 'center' },
  navEmoji: { fontSize: 22, color: '#fff' },
  navText: { color: '#fff', fontWeight: '700', marginTop: 4 },

  /* menu */
  menuOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  menuSheet: {
    position: 'absolute', right: 12, top: 54,
    width: 260, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e6eaf3',
    padding: 12, gap: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 6
  },
  menuTitle: { fontWeight: '800', fontSize: 16, marginBottom: 2 },
  menuGroup: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee', paddingTop: 8, marginTop: 6, gap: 6 },
  menuGroupTitle: { fontSize: 12, color: '#666', fontWeight: '700' },
  menuItem: { backgroundColor: '#f5f8ff', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10 },
  menuClose: { alignSelf: 'center', marginTop: 8, backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});