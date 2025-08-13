// app/messages/index.tsx
import { listThreads, startThreadWith, Thread } from '@/lib/community';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const C = { bg: '#fff', text: '#0f172a', sub: '#64748b', border: '#e5e7eb', primary: '#2563eb' };

export default function MessagesHome() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setThreads(await listThreads());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const start = async () => {
    if (!handle.trim()) return;
    const t = await startThreadWith({ id: handle, handle });
    setHandle('');
    router.push(`/messages/${t.id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Messages</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="Start a DM with @handle"
            placeholderTextColor={C.sub}
            autoCapitalize="none"
            value={handle}
            onChangeText={setHandle}
            style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, color: C.text }}
          />
          <TouchableOpacity onPress={start} disabled={!handle.trim()} style={{ backgroundColor: handle.trim() ? C.primary : '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '800' }}>Go</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={threads}
        onRefresh={load}
        refreshing={loading}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={{ color: C.sub, textAlign: 'center', marginTop: 24 }}>No conversations yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/messages/${item.id}`)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text style={{ color: C.text, fontWeight: '700' }}>@{item.other.handle}</Text>
            <Text style={{ color: C.sub, marginTop: 4 }} numberOfLines={1}>{item.lastSnippet || 'Say hi!'}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
