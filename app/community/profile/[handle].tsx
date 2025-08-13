import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getProfile, toggleFollow, timeAgo, Post } from '@/lib/community';

const C = { bg: '#ffffff', text: '#0f172a', sub: '#475569', border: '#e5e7eb', primary: '#2563eb', primaryText: '#ffffff', muted: '#64748b' };

function Avatar({ handle, color = '#94a3b8', size = 64 }: { handle: string; color?: string; size?: number }) {
  const initial = (handle?.[0] || '?').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: 'white', fontSize: 28, fontWeight: '800' }}>{initial}</Text>
    </View>
  );
}

export default function Profile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [name, setName] = useState<string>('');
  const [color, setColor] = useState<string>('#94a3b8');
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);

  async function load() {
    if (!handle) return;
    const { user, posts, isFollowing } = await getProfile(handle);
    setName(user.name || user.handle);
    setColor(user.avatarColor || '#94a3b8');
    setIsFollowing(isFollowing);
    setPosts(posts);
  }
  useEffect(() => { load(); }, [handle]);

  const onToggleFollow = async () => {
    const want = !isFollowing;
    setIsFollowing(want);
    await toggleFollow(String(handle), want);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: C.primary, fontWeight: '800' }}>Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Avatar handle={String(handle)} color={color} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>@{handle}</Text>
            <Text style={{ color: C.sub }}>{name}</Text>
          </View>
          <TouchableOpacity onPress={onToggleFollow} style={{ backgroundColor: isFollowing ? '#e2e8f0' : C.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
            <Text style={{ color: isFollowing ? C.text : '#fff', fontWeight: '700' }}>{isFollowing ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={{ color: C.muted, textAlign: 'center', marginTop: 20 }}>No posts yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/community/${item.id}`)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text style={{ color: C.text }}>{item.body}</Text>
            <Text style={{ color: C.muted, marginTop: 6 }}>{timeAgo(item.createdAt)} · ♥ {item.likes} · 💬 {item.comments}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
