// app/(tabs)/community.tsx
import { useAuth } from '@/lib/auth';
import { loadPosts, savePosts, type Comment, type Post } from '@/lib/community';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform, Share,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CommunityScreen() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>();
  const [commentFor, setCommentFor] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const insets = useSafeAreaInsets();

  // load posts
  useEffect(() => { (async () => setPosts(await loadPosts()))(); }, []);
  useEffect(() => { savePosts(posts); }, [posts]);

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo/video access.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.All,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      const asset = res.assets[0] as any;
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  };
  const clearComposer = () => { setText(''); setMediaUri(undefined); setMediaType(undefined); };

  const createPost = () => {
    if (!session) return;
    const body = text.trim();
    if (!body && !mediaUri) return;
    const now = Date.now();
    const post: Post = {
      id: String(now),
      authorName: `${session.firstName || 'Guest'} ${session.lastName || ''}`.trim(),
      authorAvatarUri: session.avatarUri,
      text: body,
      mediaUri,
      mediaType,
      ts: now,
      likes: 0,
      dislikes: 0,
      comments: [],
      reposts: 0,
    };
    setPosts(prev => [post, ...prev]);
    clearComposer();
  };

  const toggleLikePost = (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = { ...p };
      if (next.likedByMe) { next.likedByMe = false; next.likes = Math.max(0, next.likes - 1); }
      else { next.likedByMe = true; next.likes++; if (next.dislikedByMe) { next.dislikedByMe = false; next.dislikes = Math.max(0, next.dislikes - 1); } }
      return next;
    }));
  };
  const toggleDislikePost = (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = { ...p };
      if (next.dislikedByMe) { next.dislikedByMe = false; next.dislikes = Math.max(0, next.dislikes - 1); }
      else { next.dislikedByMe = true; next.dislikes++; if (next.likedByMe) { next.likedByMe = false; next.likes = Math.max(0, next.likes - 1); } }
      return next;
    }));
  };
  const sharePost = async (p: Post) => { try { await Share.share({ message: `${p.authorName}: ${p.text || ''}` }); } catch {} };
  const repost = (p: Post) => {
    if (!session) return;
    const now = Date.now();
    setPosts(prev => {
      const updated = prev.map(item => item.id === p.id ? { ...item, reposts: item.reposts + 1 } : item);
      const newPost: Post = {
        id: String(now),
        authorName: `${session.firstName || 'Guest'} ${session.lastName || ''}`.trim(),
        authorAvatarUri: session.avatarUri,
        text: `🔁 Repost from ${p.authorName}${p.text ? `: ${p.text}` : ''}`,
        mediaUri: p.mediaUri,
        mediaType: p.mediaType,
        ts: now,
        likes: 0, dislikes: 0, comments: [], reposts: 0, originalPostId: p.id,
      };
      return [newPost, ...updated];
    });
  };
  const removePost = (id: string) => {
    Alert.alert('Delete post?', 'This removes it from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPosts(prev => prev.filter(p => p.id !== id)) },
    ]);
  };

  const openComments = (p: Post) => { setCommentFor(p); setCommentText(''); };
  const closeComments = () => setCommentFor(null);

  const addComment = () => {
    if (!session || !commentFor) return;
    const txt = commentText.trim();
    if (!txt) return;
    const c: Comment = { id: String(Date.now()), text: txt, ts: Date.now(), likes: 0, dislikes: 0 };
    setPosts(prev => prev.map(p => p.id === commentFor.id ? { ...p, comments: [...p.comments, c] } : p));
    setCommentText('');
  };
  const toggleLikeComment = (postId: string, commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.comments.map(c => {
        if (c.id !== commentId) return c;
        const next = { ...c };
        if (next.likedByMe) { next.likedByMe = false; next.likes = Math.max(0, next.likes - 1); }
        else { next.likedByMe = true; next.likes++; if (next.dislikedByMe) { next.dislikedByMe = false; next.dislikes = Math.max(0, next.dislikes - 1); } }
        return next;
      });
      return { ...p, comments };
    }));
  };
  const toggleDislikeComment = (postId: string, commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.comments.map(c => {
        if (c.id !== commentId) return c;
        const next = { ...c };
        if (next.dislikedByMe) { next.dislikedByMe = false; next.dislikes = Math.max(0, next.dislikes - 1); }
        else { next.dislikedByMe = true; next.dislikes++; if (next.likedByMe) { next.likedByMe = false; next.likes = Math.max(0, next.likes - 1); } }
        return next;
      });
      return { ...p, comments };
    }));
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, !item.authorAvatarUri && styles.avatarPlaceholder]}>
          {item.authorAvatarUri ? <Image source={{ uri: item.authorAvatarUri }} style={styles.avatar} /> : <Text>🧑‍💻</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{item.authorName}</Text>
          <Text style={styles.time}>{new Date(item.ts).toLocaleString()}</Text>
        </View>
        <TouchableOpacity onPress={() => removePost(item.id)}><Text style={{ color: '#c00' }}>🗑️</Text></TouchableOpacity>
      </View>

      {item.text ? <Text style={styles.body}>{item.text}</Text> : null}
      {item.mediaUri && item.mediaType === 'image' ? (
        <Image source={{ uri: item.mediaUri }} style={styles.media} resizeMode="cover" />
      ) : null}
      {item.mediaUri && item.mediaType === 'video' ? (
        <VideoView
          style={[styles.media, { backgroundColor: '#000' }]}
          source={{ uri: item.mediaUri }}
          nativeControls
          allowsFullscreen
          allowsPictureInPicture
          resizeMode="contain"
        />
      ) : null}

      <View style={[styles.row, { marginTop: 8, gap: 8, flexWrap: 'wrap' }]}>
        <TouchableOpacity onPress={() => toggleLikePost(item.id)} style={styles.action}><Text>👍 {item.likes}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => toggleDislikePost(item.id)} style={styles.action}><Text>👎 {item.dislikes}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => openComments(item)} style={styles.action}><Text>💬 {item.comments.length}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => repost(item)} style={styles.action}><Text>🔁 {item.reposts}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => sharePost(item)} style={styles.action}><Text>🔗 Share</Text></TouchableOpacity>
      </View>
    </View>
  );

  // If not signed in → friendly gate
  if (!session) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor:'#f7f9fc' }}>
        <View style={{ flex:1, padding:16, justifyContent:'center' }}>
          <Text style={{ fontSize:22, fontWeight:'800', marginBottom:6 }}>Join the Community</Text>
          <Text style={{ color:'#555', marginBottom:14 }}>Sign in to post, comment, and like.</Text>
          <Link href='/(auth)/signin' asChild>
            <TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></TouchableOpacity>
          </Link>
          <Link href='/(auth)/signup' asChild>
            <TouchableOpacity style={[styles.grayBtn, { marginTop: 8 }]}><Text>Create account</Text></TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fc' }} edges={['top', 'bottom']}>
      {/* Composer */}
      <KeyboardAvoidingView style={{ paddingHorizontal: 12, paddingTop: 8 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composer}>
          <View style={[styles.avatar, !session.avatarUri && styles.avatarPlaceholder, { marginRight: 8 }]}>
            {session.avatarUri ? <Image source={{ uri: session.avatarUri }} style={styles.avatar} /> : <Text>🧑‍💻</Text>}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Share something helpful…"
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="default"
          />
        </View>

        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 6 }]}>
          <View style={[styles.row, { gap: 8 }]}>
            <TouchableOpacity style={styles.smallBtn} onPress={pickMedia}><Text>📷 Photo/Video</Text></TouchableOpacity>
            {mediaUri ? <Text numberOfLines={1} style={{ maxWidth: 170, color: '#555' }}>attached</Text> : null}
          </View>
          <View style={[styles.row, { gap: 8 }]}>
            <TouchableOpacity style={[styles.postBtn, (!text.trim() && !mediaUri) && { opacity: 0.5 }]} onPress={createPost} disabled={!text.trim() && !mediaUri}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={clearComposer}><Text>Clear</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 12, paddingBottom: 12 + insets.bottom }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 30 }}>No posts yet. Be the first!</Text>}
      />

      {/* Comments modal */}
      <Modal visible={!!commentFor} animationType="slide" onRequestClose={closeComments}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={{ padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' }}>
            <Text style={{ fontSize: 18, fontWeight: '800' }}>Comments</Text>
          </View>

          <FlatList
            data={commentFor?.comments ?? []}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Text style={styles.commentBody}>{item.text}</Text>
                <Text style={styles.commentTime}>{new Date(item.ts).toLocaleString()}</Text>
                <View style={[styles.row, { gap: 8, marginTop: 6 }]}>
                  <TouchableOpacity style={styles.commentAction} onPress={() => toggleLikeComment(commentFor!.id, item.id)}><Text>👍 {item.likes}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.commentAction} onPress={() => toggleDislikeComment(commentFor!.id, item.id)}><Text>👎 {item.dislikes}</Text></TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No comments yet.</Text>}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee' }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Write a comment…"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={addComment}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={addComment} style={styles.postBtn}><Text style={{ color: 'white', fontWeight: '700' }}>Send</Text></TouchableOpacity>
              <TouchableOpacity onPress={closeComments} style={styles.smallBtn}><Text>Close</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e6eaf3' },
  input: { minHeight: 40, maxHeight: 120, flex: 1, paddingHorizontal: 8 },

  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ddd' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e6eaf3', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  author: { fontWeight: '800' },
  time: { fontSize: 11, color: '#777' },
  body: { marginTop: 6, fontSize: 16 },
  media: { marginTop: 8, width: '100%', height: 220, borderRadius: 10 },

  action: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f0f4ff' },

  commentRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  commentBody: { fontSize: 15 },
  commentTime: { fontSize: 11, color: '#777' },
  commentAction: { backgroundColor: '#eef3ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },

  smallBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eee' },
  postBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#2b6ef2' },

  primary: { backgroundColor:'#2b6ef2', padding:12, borderRadius:12, alignItems:'center' },
  primaryText: { color:'white', fontWeight:'700' },
  grayBtn: { backgroundColor:'#eee', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, alignItems:'center' },
});