import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, TextInput, FlatList, Share, Linking } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from '@/components/Toast';
import { Post, Comment, getPost, listComments, addComment, likePost, reportPost, timeAgo } from '@/lib/community';

const C = { bg: '#ffffff', text: '#0f172a', sub: '#475569', border: '#e5e7eb', primary: '#2563eb', primaryText: '#ffffff', muted: '#64748b', gold: '#f59e0b' };

function ImageGrid({ uris }: { uris: string[] }) {
  if (!uris?.length) return null;
  const radius = 10;
  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      {uris.length === 1 ? (
        <Image source={{ uri: uris[0] }} style={{ width: '100%', height: 220, borderRadius: radius, backgroundColor: '#f8fafc' }} contentFit="cover" />
      ) : (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {uris.slice(0, 2).map((u, i) => (
            <Image key={i} source={{ uri: u }} style={{ flex: 1, height: 200, borderRadius: radius, backgroundColor: '#f8fafc' }} contentFit="cover" />
          ))}
        </View>
      )}
    </View>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [text, setText] = useState('');

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const p = await getPost(id);
      const c = await listComments(id);
      setPost(p);
      setComments(c);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, [id]);

  const openLinksInline = (body: string) => {
    const re = /((https?:\/\/|www\.)\S+)/gi;
    const m = re.exec(body);
    if (m) Linking.openURL(m[1].startsWith('http') ? m[1] : `https://${m[1]}`);
  };

  const toggleLike = async () => {
    if (!post) return;
    const want = !post.likedByMe;
    setPost({ ...post, likedByMe: want, likes: Math.max(0, post.likes + (want ? 1 : -1)) });
    try {
      const updated = await likePost(post.id, want);
      if (updated) setPost(updated);
    } catch {
      setToast('Failed to update like');
    }
  };

  const submitComment = async () => {
    const body = text.trim();
    if (!body || !post) return;
    setText('');
    Haptics.selectionAsync();
    try {
      const c = await addComment(post.id, body);
      setComments((prev) => [c, ...prev]);
      setPost((p) => (p ? { ...p, comments: p.comments + 1 } : p));
    } catch {
      setToast('Could not comment');
    }
  };

  const onShare = () => { if (post) Share.share({ message: `studentitbuddy://community/${post.id}` }); };
  const onReport = async () => { if (post) setToast((await reportPost(post.id, 'inappropriate')).ok ? 'Reported' : 'Failed to report'); };

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted }}>{loading ? 'Loading…' : 'Post not found'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
            <Text style={{ color: C.primary, fontWeight: '800' }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', flex: 1 }}>Post</Text>
          <TouchableOpacity onPress={onShare} style={{ padding: 8 }}>
            <Text style={{ color: C.text }}>↗ Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReport} style={{ padding: 8 }}>
            <Text style={{ color: '#ef4444' }}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Post */}
      <View style={{ padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: C.text, fontWeight: '800', marginRight: 6 }}>@{post.author.handle}</Text>
            <Text style={{ color: C.muted }}>{timeAgo(post.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => openLinksInline(post.body)}>
            <Text style={{ color: C.text, marginTop: 6 }}>{post.body}</Text>
          </TouchableOpacity>
          <ImageGrid uris={post.images || []} />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity onPress={toggleLike} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: post.likedByMe ? C.gold : C.text }}>{post.likedByMe ? '★' : '☆'} {post.likes}</Text>
            </TouchableOpacity>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.text }}>💬 {post.comments}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Comment composer */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10 }}>
          <TextInput
            placeholder="Write a reply…"
            placeholderTextColor={C.muted}
            value={text}
            onChangeText={setText}
            multiline
            style={{ minHeight: 50, color: C.text }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={submitComment} style={{ backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}>
              <Text style={{ color: C.primaryText, fontWeight: '700' }}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Comments */}
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={{ color: C.muted, textAlign: 'center', marginTop: 18 }}>No replies yet</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ color: C.text, fontWeight: '800', marginRight: 6 }}>@{item.author.handle}</Text>
              <Text style={{ color: C.muted }}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={{ color: C.text, marginTop: 6 }}>{item.body}</Text>
          </View>
        )}
      />

      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </SafeAreaView>
  );
}