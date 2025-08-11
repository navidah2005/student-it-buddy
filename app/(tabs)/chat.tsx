// app/(tabs)/chat.tsx
import { getReply } from '@/lib/kb';
import { PROFILES, SchoolProfile, getProfileById } from '@/lib/profiles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, FlatList, KeyboardAvoidingView, NativeSyntheticEvent, Platform, StyleSheet, Text, TextInput, TextInputSubmitEditingEventData, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Role = 'user' | 'bot';
type Message = { id: string; role: Role; text: string; ts: number };

const STORAGE_KEY = 'chatMessagesV3';
const PROFILE_KEY = 'selectedProfileId';

function fmtTime(ms: number) {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'seed', role: 'bot', text: 'Hi! Pick your school (top) to get tailored steps for Wi-Fi, VPN, email, printers, etc.', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profileId, setProfileId] = useState<string>('generic');
  const [profile, setProfile] = useState<SchoolProfile | undefined>(PROFILES[0]);
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  // Load saved history + profile
  useEffect(() => {
    (async () => {
      try {
        const [rawMsgs, rawPid] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        if (rawPid) {
          setProfileId(rawPid);
          setProfile(getProfileById(rawPid));
        }
        if (rawMsgs) {
          const parsed = JSON.parse(rawMsgs) as any[];
          if (Array.isArray(parsed) && parsed.length) {
            const migrated: Message[] = parsed.map((m: any) => ({
              id: String(m.id ?? Date.now()),
              role: m.role === 'user' ? 'user' : 'bot',
              text: String(m.text ?? ''),
              ts: typeof m.ts === 'number' ? m.ts : Date.now(),
            }));
            setMessages(migrated);
          }
        }
      } catch (e) {
        console.warn('Failed to load data', e);
      }
    })();
  }, []);

  // Save history whenever messages change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  // Save profile selection
  useEffect(() => {
    AsyncStorage.setItem(PROFILE_KEY, profileId).catch(() => {});
    setProfile(getProfileById(profileId));
  }, [profileId]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const doSend = (textRaw?: string) => {
    const text = (textRaw ?? input).trim();
    if (!text) return;

    const now = Date.now();
    const userMsg: Message = { id: String(now), role: 'user', text, ts: now };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    scrollToEnd();

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyText = getReply(text, profile);
      const botMsg: Message = { id: String(Date.now() + 1), role: 'bot', text: replyText, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      scrollToEnd();
    }, 450);
  };

  const onSubmitEditing = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    doSend();
  };

  const clearHistory = () => {
    Alert.alert('Clear chat?', 'This will remove all messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const seed: Message[] = [
            { id: 'seed', role: 'bot', text: 'Cleared. How can I help now?', ts: Date.now() },
          ];
          setMessages(seed);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        },
      },
    ]);
  };

  const Quick = ({ label }: { label: string }) => (
    <TouchableOpacity
      onPress={() => setInput((prev) => (prev ? prev + ' ' + label : label))}
      style={styles.chip}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      {/* Profile selector */}
      <View style={styles.profileBar}>
        <Text style={styles.profileLabel}>School:</Text>
        <Picker
          selectedValue={profileId}
          onValueChange={(val) => setProfileId(String(val))}
          style={styles.picker}
          dropdownIconColor="#333"
        >
          {PROFILES.map(p => (
            <Picker.Item key={p.id} label={p.name} value={p.id} />
          ))}
        </Picker>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
              <Text style={styles.text}>{item.text}</Text>
              <Text style={styles.time}>{fmtTime(item.ts)}</Text>
            </View>
          )}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={
            <View style={{ padding: 24 }}>
              <Text style={{ textAlign: 'center', color: '#666' }}>
                No messages yet. Try asking “vpn setup” or “printer stuck in queue”.
              </Text>
            </View>
          }
        />

        {isTyping && (
          <View style={[styles.typingRow, { marginBottom: insets.bottom }]}>
            <Text style={{ fontStyle: 'italic' }}>Buddy is typing…</Text>
          </View>
        )}

        {/* Quick suggestions */}
        <View style={styles.quickRow}>
          <Quick label="wifi not connecting" />
          <Quick label="vpn setup" />
          <Quick label="email not syncing" />
          <Quick label="install python" />
        </View>

        <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your question…"
            style={styles.input}
            onSubmitEditing={onSubmitEditing}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline={false}
          />
          <Button title="Send" onPress={() => doSend()} />
        </View>

        <View style={{ alignItems: 'center', paddingBottom: 8 }}>
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
            <Text style={{ fontSize: 12 }}>Clear chat</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  profileLabel: { fontSize: 14, fontWeight: '500' },
  picker: { flex: 1, height: 44 },

  bubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#e8f0ff' },
  bot: { alignSelf: 'flex-start', backgroundColor: '#f2f2f2' },
  text: { fontSize: 16 },
  time: { marginTop: 4, fontSize: 11, color: '#666', alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  typingRow: { paddingHorizontal: 16, paddingBottom: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eef2ff' },
  chipText: { fontSize: 12 },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#eee' },
});