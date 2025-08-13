// app/messages/[id].tsx
import { getThread, Message, sendMessage } from '@/lib/community';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const C = { bg: '#fff', text: '#0f172a', sub: '#64748b', border: '#e5e7eb', primary: '#2563eb' };

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');

  async function load() {
    if (!id) return;
    const { thread, messages } = await getThread(String(id));
    setTitle(`@${thread.other.handle}`);
    setMsgs(messages.sort((a, b) => a.createdAt - b.createdAt));
  }
  useEffect(() => { load(); }, [id]);

  const onSend = async () => {
    if (!text.trim() || !id) return;
    const { thread } = await getThread(String(id));
    const m = await sendMessage(String(id), thread.other, text.trim());
    setMsgs((prev) => [...prev, m]);
    setText('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* header */}
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: C.primary, fontWeight: '800' }}>Back</Text></TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{title}</Text>
      </View>

      {/* messages */}
      <FlatList
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const mine = item.from.handle === 'you';
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? '#e0f2fe' : '#f1f5f9', borderRadius: 12, padding: 10, marginBottom: 8, maxWidth: '80%' }}>
              {item.body ? <Text style={{ color: C.text }}>{item.body}</Text> : null}
            </View>
          );
        }}
      />

      {/* composer */}
      <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#fff', flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Message…"
          placeholderTextColor={C.sub}
          value={text}
          onChangeText={setText}
          style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, color: C.text }}
        />
        <TouchableOpacity onPress={onSend} disabled={!text.trim()} style={{ backgroundColor: text.trim() ? C.primary : '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
