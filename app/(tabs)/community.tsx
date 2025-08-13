// app/(tabs)/community.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import PostCard from '@/components/PostCard';
import {
  createPost,
  likePost,
  listFeed,
  Media,
  PollDraft,
  Post,
  repostPost,
} from '@/lib/community';

const C = {
  bg: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  sub: '#64748b',
  border: '#e5e7eb',
  primary: '#2563eb',
  primaryText: '#ffffff',
};

function Avatar({ handle, size = 40 }: { handle: string; size?: number }) {
  const initial = (handle?.[0] || '?').toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: '#0ea5e9',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: 'white', fontWeight: '800' }}>{initial}</Text>
    </View>
  );
}

type TabKey = 'forYou' | 'following';

const inferTypeFromUri = (uri: string): Media['type'] => {
  const u = uri.toLowerCase();
  if (u.endsWith('.gif')) return 'gif';
  if (/\.(mp4|mov|webm|m4v)$/.test(u)) return 'video';
  return 'image';
};

export default function CommunityHome() {
  const [tab, setTab] = useState<TabKey>('forYou');

  // composer state
  const [text, setText] = useState('');
  const [media, setMedia] = useState<Media[]>([]); // multiple items now
  const [linkUrl, setLinkUrl] = useState('');
  const [location, setLocation] = useState('');
  const [poll, setPoll] = useState<PollDraft | null>(null);

  // feed
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const rows = await listFeed(tab);
    setFeed(rows);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [tab]);

  const canPost = useMemo(
    () =>
      !!text.trim() ||
      media.length > 0 ||
      !!linkUrl.trim() ||
      !!location.trim() ||
      (poll && poll.options.some((o) => o.trim())),
    [text, media, linkUrl, location, poll]
  );

  // ====== PICK MEDIA ======
  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to attach media.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 4 - media.length),
      quality: 0.9,
      videoMaxDuration: 30,
    });
    if (res.canceled) return;
    const selected = res.assets.map<Media>((a) => ({
      type: inferTypeFromUri(a.uri),
      url: a.uri,
    }));
    setMedia((m) => [...m, ...selected].slice(0, 4));
  };

  const addGifByUrl = async () => {
    // super simple “prompt”: reuse link box—convert to GIF if ends with .gif
    if (!linkUrl.trim()) {
      Alert.alert('Paste a GIF URL first', 'Paste a direct .gif URL into the link box, then tap “Add as GIF”.');
      return;
    }
    if (!/\.gif($|\?)/i.test(linkUrl)) {
      Alert.alert('Not a GIF', 'URL must end with .gif');
      return;
    }
    setMedia((m) => [...m, { type: 'gif', url: linkUrl.trim() }].slice(0, 4));
    setLinkUrl('');
  };

  // ====== LOCATION ======
  const attachLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow location access to attach your location.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const label = [place.city, place.region, place.country].filter(Boolean).join(', ');
    setLocation(label || `Lat ${pos.coords.latitude.toFixed(3)}, Lng ${pos.coords.longitude.toFixed(3)}`);
  };

  const removeMediaAt = (i: number) => setMedia((m) => m.filter((_, idx) => idx !== i));

  const addPollRow = () =>
    setPoll((prev) => {
      const base = prev ?? { options: ['', ''] as string[] };
      return { options: base.options.length < 4 ? [...base.options, ''] : base.options };
    });

  const onPost = async () => {
    if (!canPost) return;

    const temp: Post = {
      id: `temp-${Date.now()}`,
      author: { id: 'me', handle: 'you', name: 'You', avatarColor: '#0ea5e9' },
      body: text.trim() || undefined,
      createdAt: Date.now(),
      media: media.length ? media : undefined,
      linkUrl: linkUrl.trim() || undefined,
      location: location.trim() || undefined,
      poll:
        poll && poll.options.some((o) => o.trim())
          ? {
              id: `poll-${Date.now()}`,
              options: poll.options
                .filter((o) => o.trim())
                .map((t, i) => ({ id: String(i + 1), text: t, votes: 0 })),
            }
          : undefined,
      hashtags: Array.from(new Set((text.match(/#\w+/g) || []).map((s) => s.slice(1)))),
      likes: 0,
      likedByMe: false,
      reposts: 0,
      comments: 0,
    };

    // optimistic add
    setFeed((f) => [temp, ...f]);

    try {
      const saved = await createPost({
        body: temp.body,
        media: temp.media,
        linkUrl: temp.linkUrl,
        location: temp.location,
        poll: temp.poll,
      });
      setFeed((f) => [saved, ...f.filter((p) => p.id !== temp.id)]);
      // reset composer
      setText('');
      setMedia([]);
      setLinkUrl('');
      setLocation('');
      setPoll(null);
      Keyboard.dismiss();
      Haptics.selectionAsync();
    } catch {
      // rollback
      setFeed((f) => f.filter((p) => p.id !== temp.id));
      Alert.alert('Could not post', 'Please try again.');
    }
  };

  const onLike = async (id: string, want: boolean) => {
    setFeed((f) =>
      f.map((p) =>
        p.id === id ? { ...p, likedByMe: want, likes: Math.max(0, p.likes + (want ? 1 : -1)) } : p
      )
    );
    const updated = await likePost(id, want);
    if (updated) setFeed((f) => f.map((p) => (p.id === id ? updated : p)));
  };

  const onRepost = async (id: string) => {
    setFeed((f) => f.map((p) => (p.id === id ? { ...p, reposts: p.reposts + 1 } : p)));
    const updated = await repostPost(id);
    if (updated) setFeed((f) => f.map((p) => (p.id === id ? updated : p)));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top tabs */}
      <View
        style={{
          paddingTop: 6,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: '#fff',
        }}
      >
        <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 40 }}>
          {(['forYou', 'following'] as TabKey[]).map((k) => {
            const active = tab === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setTab(k)}
                style={{ alignItems: 'center', paddingVertical: 10 }}
              >
                <Text
                  style={{
                    color: active ? C.text : C.sub,
                    fontWeight: active ? '800' : '600',
                  }}
                >
                  {k === 'forYou' ? 'For you' : 'Following'}
                </Text>
                <View
                  style={{
                    height: 3,
                    width: 42,
                    marginTop: 8,
                    borderRadius: 999,
                    backgroundColor: active ? C.text : 'transparent',
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Composer */}
      <View
        style={{
          backgroundColor: C.card,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Avatar handle="you" />
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="What’s happening?"
              placeholderTextColor={C.sub}
              value={text}
              onChangeText={setText}
              multiline
              style={{ color: C.text, minHeight: 40 }}
            />

            {/* attachments previews */}
            {media.length > 0 ? (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {media.map((m, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: m.url }}
                      style={{ width: 120, height: 120, borderRadius: 10, backgroundColor: '#f8fafc' }}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeMediaAt(i)}
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: 6,
                        backgroundColor: '#0008',
                        borderRadius: 999,
                        padding: 5,
                      }}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </TouchableOpacity>
                    {m.type === 'video' ? (
                      <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: '#0009', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Feather name="video" size={12} color="#fff" />
                      </View>
                    ) : null}
                    {m.type === 'gif' ? (
                      <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: '#0009', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>GIF</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* link box */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput
                placeholder="Paste a link (or .gif URL)…"
                placeholderTextColor={C.sub}
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  padding: 10,
                  color: C.text,
                }}
              />
              <TouchableOpacity
                onPress={() => setLinkUrl('')}
                disabled={!linkUrl}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: linkUrl ? '#e2e8f0' : '#f1f5f9',
                }}
              >
                <Feather name="x" size={16} color={C.sub} />
              </TouchableOpacity>
            </View>

            {/* quick actions row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                marginTop: 10,
              }}
            >
              <TouchableOpacity onPress={pickMedia}>
                <Feather name="image" size={20} color={C.sub} />
              </TouchableOpacity>

              <TouchableOpacity onPress={addGifByUrl}>
                <MaterialCommunityIcons name="gif" size={24} color={C.sub} />
              </TouchableOpacity>

              <TouchableOpacity onPress={pickMedia}>
                <Feather name="video" size={20} color={C.sub} />
              </TouchableOpacity>

              <TouchableOpacity onPress={attachLocation}>
                <Ionicons name="location-outline" size={20} color={C.sub} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPoll((p) => p ?? { options: ['', ''] })}>
                <MaterialCommunityIcons name="poll" size={22} color={C.sub} />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                onPress={onPost}
                disabled={!canPost}
                style={{
                  backgroundColor: canPost ? C.primary : '#cbd5e1',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: C.primaryText, fontWeight: '800' }}>Post</Text>
              </TouchableOpacity>
            </View>

            {/* location chip */}
            {location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Ionicons name="location" size={16} color={C.sub} />
                <Text style={{ color: C.sub }}>{location}</Text>
                <TouchableOpacity onPress={() => setLocation('')}>
                  <Feather name="x" size={16} color={C.sub} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* poll editor */}
            {poll ? (
              <View
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                {Array.from({ length: Math.max(2, poll.options.length) }).map((_, i) => (
                  <TextInput
                    key={i}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={C.sub}
                    value={poll.options[i] ?? ''}
                    onChangeText={(t) =>
                      setPoll((p) => {
                        const base = p ?? { options: ['', ''] as string[] };
                        const next = [...base.options];
                        next[i] = t;
                        return { options: next };
                      })
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 10,
                      padding: 8,
                      color: C.text,
                    }}
                  />
                ))}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  {poll.options.length < 4 ? (
                    <TouchableOpacity
                      onPress={addPollRow}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <Text style={{ color: C.text }}>Add option</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => setPoll(null)} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                    <Text style={{ color: C.sub }}>Remove poll</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Feed */}
      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        onRefresh={load}
        refreshing={loading}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={(want) => onLike(item.id, want)}
            onRepost={() => onRepost(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border }} />}
      />
    </SafeAreaView>
  );
}
