// app/community/search.tsx
import { Post, searchPosts, timeAgo } from '@/lib/community';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const C = { bg: '#fff', text: '#0f172a', sub: '#64748b', border: '#e5e7eb', primary: '#2563eb' };

export default function CommunitySearch() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const r = await searchPosts(q);
    setRows(r);
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Search</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="Search posts or #hashtags…"
            placeholderTextColor={C.sub}
            autoCapitalize="none"
            value={q}
            onChangeText={setQ}
            style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, color: C.text }}
          />
          <TouchableOpacity onPress={run} disabled={loading || !q.trim()} style={{ backgroundColor: q.trim() ? C.primary : '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '800' }}>{loading ? '…' : 'Search'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={{ color: C.sub, textAlign: 'center', marginTop: 24 }}>No results yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/community/${item.id}`)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text style={{ color: C.text }} numberOfLines={3}>{item.body || '(no text)'}</Text>
            <Text style={{ color: C.sub, marginTop: 6 }}>{timeAgo(item.createdAt)} · ♥ {item.likes} · 💬 {item.comments}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
