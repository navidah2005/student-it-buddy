// app/(tabs)/chat.tsx
import { getReply } from '@/lib/kb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Button,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Role = 'user' | 'bot';
type Message = { id: string; role: Role; text: string };

const STORAGE_KEY = 'chatMessagesV1';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      text:
        'Hi! I’m your Student IT Buddy. Ask about Wi-Fi, VPN, email, Python, printers, or slow laptops. (Demo KB)',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  // Load saved history on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Message[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
        }
      } catch (e) {
        console.warn('Failed to load history', e);
      }
    })();
  }, []);

  // Save history whenever messages change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: String(Date.now()), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    scrollToEnd();

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getReply(text);
      const botMsg: Message = { id: String(Date.now() + 1), role: 'bot', text: reply };
      setMessages(prev => [...prev, botMsg]);
      scrollToEnd();
    }, 500);
  };

  const clearHistory = () => {
    Alert.alert('Clear chat?', 'This will remove all messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const seed: Message[] = [{ id: 'seed', role: 'bot', text: 'Cleared. How can I help now?' }];
          setMessages(seed);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        },
      },
    ]);
  };

  // Quick suggestion chips
  const Quick = ({ label }: { label: string }) => (
    <TouchableOpacity
      onPress={() => setInput(prev => (prev ? prev + ' ' + label : label))}
      style={styles.chip}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          )}
          onContentSizeChange={scrollToEnd}
        />

        {isTyping && (
          <View style={[styles.typingRow, { marginBottom: insets.bottom }]}>
            <Text style={{ fontStyle: 'italic' }}>Buddy is typing…</Text>
          </View>
        )}

        {/* Big, visible Clear Chat button (above input area) */}
        <View
          style={{
            padding: 12,
            backgroundColor: 'white',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: '#ddd',
          }}
        >
          <TouchableOpacity
            onPress={clearHistory}
            style={{
              backgroundColor: '#ffdddd',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: '#990000', fontWeight: 'bold' }}>🗑 Clear Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Quick suggestions */}
        <View style={styles.quickRow}>
          <Quick label="wifi not connecting" />
          <Quick label="vpn setup" />
          <Quick label="email not syncing" />
          <Quick label="install python" />
        </View>

        {/* Input row */}
        <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your question…"
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Button title="Send" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#e8f0ff' },
  bot: { alignSelf: 'flex-start', backgroundColor: '#f2f2f2' },
  text: { fontSize: 16 },
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
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eef2ff' },
  chipText: { fontSize: 12 },
});