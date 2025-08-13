// app/(tabs)/chat.tsx
import { LiteMessage, smartReply } from '@/lib/ai';
import { getProfile } from '@/lib/profile';
import { PROFILES, SchoolProfile, getProfileById } from '@/lib/profiles';
import {
    createSession,
    deleteSession,
    listSessions,
    loadSessionMessages,
    renameSession,
    saveSessionMessages,
    type SessionMeta
} from '@/lib/sessions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as Clipboard from 'expo-clipboard';
import { Link, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated, Dimensions,
    FlatList, KeyboardAvoidingView,
    Linking,
    NativeSyntheticEvent,
    Platform, StyleSheet,
    Text, TextInput,
    TextInputSubmitEditingEventData,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Role = 'user' | 'bot';
type Message = { id: string; role: Role; text: string; ts: number };

const STORAGE_KEY_LEGACY = 'chatMessagesV3';
const PROFILE_KEY = 'selectedProfileId';
const SCREEN_W = Dimensions.get('window').width;

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function linkifyParts(text: string) {
  const parts: Array<{ t: string; link?: string }> = [];
  const urlRe = /(https?:\/\/[^\s]+)/gi;
  let lastIndex = 0; let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text))) {
    if (m.index > lastIndex) parts.push({ t: text.slice(lastIndex, m.index) });
    parts.push({ t: m[0], link: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push({ t: text.slice(lastIndex) });
  return parts;
}

export default function ChatScreen() {
  // profile (name/photo)
  const [displayName, setDisplayName] = useState('Guest');
  const [avatarUri, setAvatarUri] = useState('');

  // school profile for KB
  const [profileId, setProfileId] = useState<string>('generic');
  const [profile, setProfile] = useState<SchoolProfile | undefined>(PROFILES[0]);

  // conversations
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);

  // ui state
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollToEnd, setShowScrollToEnd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarX = useRef(new Animated.Value(-Math.min(300, SCREEN_W * 0.82))).current;
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();

  // load user profile + school profile + sessions
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setDisplayName(p.name);
      setAvatarUri(p.avatarUri);

      const rawPid = await AsyncStorage.getItem(PROFILE_KEY);
      if (rawPid) {
        setProfileId(rawPid);
        setProfile(getProfileById(rawPid));
      }

      // migrate legacy
      const legacy = await AsyncStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy) {
        const first = await createSession('First chat');
        setCurrentId(first.meta.id);
        const parsed = JSON.parse(legacy) as any[];
        const migrated: Message[] = Array.isArray(parsed)
          ? parsed.map((m: any) => ({
              id: String(m.id ?? Date.now()),
              role: m.role === 'user' ? 'user' : 'bot',
              text: String(m.text ?? ''),
              ts: typeof m.ts === 'number' ? m.ts : Date.now(),
            }))
          : [];
        await saveSessionMessages(first.meta.id, migrated);
        await AsyncStorage.removeItem(STORAGE_KEY_LEGACY);
      }

      const idx = await listSessions();
      if (idx.length === 0) {
        const { meta } = await createSession('Welcome');
        setCurrentId(meta.id);
        setSessions([meta]);
        const seed: Message[] = [{ id: 'seed', role: 'bot', text: 'Hi! Create new chats from the sidebar. Ask about Wi-Fi, VPN, email, Windows, printers…', ts: Date.now() }];
        setMessages(seed);
        await saveSessionMessages(meta.id, seed);
      } else {
        setSessions(idx);
        setCurrentId(idx[0].id);
        const msgs = await loadSessionMessages(idx[0].id);
        setMessages(msgs);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(PROFILE_KEY, profileId).catch(() => {});
    setProfile(getProfileById(profileId));
  }, [profileId]);

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(sidebarX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };
  const closeSidebar = () => {
    Animated.timing(sidebarX, { toValue: -Math.min(300, SCREEN_W * 0.82), duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSidebarOpen(false);
    });
  };

  const scrollToEnd = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  const saveMessages = async (next: Message[]) => {
    setMessages(next);
    if (currentId) await saveSessionMessages(currentId, next);
  };

  const ensureSession = async () => {
    if (!currentId) {
      const { meta } = await createSession();
      setCurrentId(meta.id);
      setSessions(prev => [meta, ...prev]);
    }
  };

  const doSend = async (textRaw?: string) => {
    const text = (textRaw ?? input).trim();
    if (!text) return;
    await ensureSession();
    const now = Date.now();

    if (messages.length === 0) {
      await renameSession(currentId, text.slice(0, 40));
      setSessions(prev => prev.map(s => (s.id === currentId ? { ...s, title: text.slice(0, 40) } : s)));
    }

    const userMsg: Message = { id: String(now), role: 'user', text, ts: now };
    await saveMessages([...messages, userMsg]);
    setInput('');
    scrollToEnd();

    // SMART REPLY (cloud if configured, else local)
    setIsTyping(true);
    try {
      const historyLite: LiteMessage[] = [...messages, userMsg].map((m) => ({ role: m.role, text: m.text }));
      const replyText = await smartReply(text, historyLite, profile);
      const botMsg: Message = { id: String(Date.now() + 1), role: 'bot', text: replyText, ts: Date.now() };
      const next = [...messages, userMsg, botMsg];
      await saveMessages(next);
      scrollToEnd();
    } catch (e: any) {
      const botMsg: Message = { id: String(Date.now() + 1), role: 'bot', text: 'Sorry, I had trouble answering. Please try again.', ts: Date.now() };
      await saveMessages([...messages, userMsg, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const q = typeof params.q === 'string' ? params.q.trim() : '';
    if (!q) return;
    const t = setTimeout(() => doSend(q), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  const onSubmitEditing = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => doSend();

  const onScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
    setShowScrollToEnd(!atBottom);
  };

  const renderMsg = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={async () => { await Clipboard.setStringAsync(item.text); Alert.alert('Copied'); }}
        style={[styles.row, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}
      >
        {!isUser && <View style={[styles.avatar, { backgroundColor: '#e5ecff' }]}><Text>🤖</Text></View>}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble, styles.shadow]}>
          <Text>
            {linkifyParts(item.text).map((p, i) =>
              p.link ? (
                <Text key={i} style={{ color: '#2b6ef2', textDecorationLine: 'underline' }} onPress={() => Linking.openURL(p.link!)}>{p.t}</Text>
              ) : <Text key={i}>{p.t}</Text>
            )}
          </Text>
          <Text style={styles.time}>{fmtTime(item.ts)}</Text>
        </View>
        {isUser && <View style={[styles.avatar, { backgroundColor: '#ffead5' }]}><Text>🙂</Text></View>}
      </TouchableOpacity>
    );
  };

  const loadSession = async (id: string) => {
    setCurrentId(id);
    const msgs = await loadSessionMessages(id);
    setMessages(msgs);
    closeSidebar();
    setTimeout(scrollToEnd, 60);
  };

  const newChat = async () => {
    const { meta } = await createSession('New chat');
    setSessions(prev => [meta, ...prev]);
    setCurrentId(meta.id);
    const seed: Message[] = [{ id: 'seed', role: 'bot', text: 'New chat created. How can I help?', ts: Date.now() }];
    await saveSessionMessages(meta.id, seed);
    setMessages(seed);
    closeSidebar();
  };

  const removeChat = async (id: string) => {
    Alert.alert('Delete chat?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteSession(id);
          const rest = sessions.filter(s => s.id !== id);
          setSessions(rest);
          if (id === currentId && rest[0]) {
            await loadSession(rest[0].id);
          } else if (rest.length === 0) {
            await newChat();
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Text style={{ fontSize: 20 }}>☰</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{displayName}</Text>
          <Text style={styles.headerSub}>AI Tech Buddy</Text>
        </View>
        <Link href='/(tabs)/index' asChild>
          <TouchableOpacity style={styles.iconBtn}><Text style={{ fontSize: 16 }}>🏠</Text></TouchableOpacity>
        </Link>
        <Link href='/(tabs)/profile' asChild>
          <TouchableOpacity style={[styles.avatarSm, { marginLeft: 6 }]}><Text>👤</Text></TouchableOpacity>
        </Link>
      </View>

      {/* SCHOOL PICKER */}
      <View style={styles.profileRow}>
        <Text style={styles.profileLabel}>School</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={profileId} onValueChange={(val) => setProfileId(String(val))} style={styles.picker} dropdownIconColor="#333">
            {PROFILES.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
          </Picker>
        </View>
      </View>

      {/* MESSAGES */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMsg}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
        {/* INPUT */}
        <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your question…"
            style={styles.input}
            onSubmitEditing={(_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => doSend()}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => doSend()}>
            <Text style={{ color: 'white', fontWeight: '700' }}>Send</Text>
          </TouchableOpacity>
        </View>
        {/* ↓ button */}
        {showScrollToEnd && (
          <TouchableOpacity style={styles.fab} onPress={scrollToEnd}><Text style={{ color: 'white', fontWeight: '800' }}>↓</Text></TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <TouchableOpacity style={styles.overlay} onPress={closeSidebar} activeOpacity={1} />
      )}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarX }] }]}>
        <View style={styles.sidebarHeader}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>Conversations</Text>
          <TouchableOpacity onPress={newChat} style={styles.newBtn}><Text style={{ color: 'white', fontWeight: '700' }}>+ New</Text></TouchableOpacity>
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <View style={styles.sessionRow}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => loadSession(item.id)}>
                <Text numberOfLines={1} style={[styles.sessionTitle, item.id === currentId && { color: '#2b6ef2', fontWeight: '800' }]}>{item.title}</Text>
                <Text style={styles.sessionTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeChat(item.id)}><Text style={{ color: '#c00' }}>🗑️</Text></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ padding: 12, color: '#666' }}>No conversations yet.</Text>}
        />

        <View style={styles.sidebarFooter}>
          <Link href='/(tabs)/index' asChild><TouchableOpacity style={styles.sideLink}><Text>🏠 Home</Text></TouchableOpacity></Link>
          <Link href='/(tabs)/profile' asChild><TouchableOpacity style={styles.sideLink}><Text>👤 Profile</Text></TouchableOpacity></Link>
          <Link href='/(tabs)/community' asChild><TouchableOpacity style={styles.sideLink}><Text>👥 Community</Text></TouchableOpacity></Link>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e6e6e6',
    backgroundColor: '#f9fbff', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1d3b8b' },
  headerSub: { fontSize: 12, color: '#667' },
  iconBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  avatarSm: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4, backgroundColor: '#f9fbff' },
  profileLabel: { fontSize: 12, color: '#555', width: 46 },
  pickerWrap: { flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#d7defa', backgroundColor: 'white' },
  picker: { height: 36, width: '100%' },

  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  bubble: { padding: 10, borderRadius: 14, maxWidth: '78%' },
  userBubble: { backgroundColor: '#dff1ff', borderTopRightRadius: 4 },
  botBubble: { backgroundColor: '#ffffff', borderTopLeftRadius: 4 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  time: { marginTop: 4, fontSize: 11, color: '#666', alignSelf: 'flex-end' },

  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', backgroundColor: 'white' },
  input: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: 'white' },
  sendBtn: { backgroundColor: '#2b6ef2', paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', right: 16, bottom: 88, backgroundColor: '#2b6ef2', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.min(300, SCREEN_W * 0.82), backgroundColor: '#fff', paddingTop: 10, paddingHorizontal: 10 },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  newBtn: { backgroundColor: '#2b6ef2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  sessionTitle: { fontSize: 14 },
  sessionTime: { fontSize: 11, color: '#777' },
  sidebarFooter: { paddingVertical: 10, gap: 8 },
  sideLink: { paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#f4f7ff' },
});
