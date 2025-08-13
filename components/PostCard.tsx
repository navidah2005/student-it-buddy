// components/PostCard.tsx
import { Post, timeAgo, voteOnPoll } from '@/lib/community';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video } from 'expo-av'; // ok; deprecation is only a warning in SDK 53
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Linking, Share, Text, TouchableOpacity, View } from 'react-native';

const C = {
  card: '#ffffff',
  text: '#0f172a',
  sub: '#64748b',
  border: '#e5e7eb',
  gold: '#f59e0b',
};

function Avatar({ handle, size = 40 }: { handle: string; size?: number }) {
  const initial = (handle?.[0] || '?').toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800' }}>{initial}</Text>
    </View>
  );
}

function MediaBlock({ media }: { media?: Post['media'] }) {
  if (!media || media.length === 0) return null;

  const firstVideo = media.find((m) => m.type === 'video');
  const images = media.filter((m) => m.type !== 'video');

  return (
    <View style={{ gap: 8 }}>
      {firstVideo ? (
        <Video
          source={{ uri: firstVideo.url }}
          style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: '#000' }}
          useNativeControls
          resizeMode="cover"
        />
      ) : null}

      {images.length === 1 ? (
        <Image
          source={{ uri: images[0].url }}
          style={{ height: 220, borderRadius: 12, backgroundColor: '#f8fafc' }}
          contentFit="cover"
        />
      ) : images.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {images.slice(0, 2).map((m, i) => (
            <Image
              key={i}
              source={{ uri: m.url }}
              style={{ flex: 1, height: 200, borderRadius: 12, backgroundColor: '#f8fafc' }}
              contentFit="cover"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function PostCard({
  post,
  onLike,
  onRepost,
}: {
  post: Post;
  onLike?: (want: boolean) => void;
  onRepost?: () => void;
}) {
  const [localLiked, setLocalLiked] = useState(post.likedByMe);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [pollState, setPollState] = useState(post.poll);

  const likeToggle = () => {
    const want = !localLiked;
    setLocalLiked(want);
    setLocalLikes((n) => Math.max(0, n + (want ? 1 : -1)));
    onLike?.(want);
  };

  const share = () => Share.share({ message: `studentitbuddy://community/${post.id}` });

  const hashtags = useMemo(
    () =>
      (post.hashtags || []).map((h) => (
        <Text key={h} style={{ color: '#2563eb' }}>
          {' '}
          #{h}
        </Text>
      )),
    [post.hashtags]
  );

  const openFirstLink = () => {
    if (post.linkUrl) Linking.openURL(post.linkUrl);
  };

  const onVote = async (optionId: string) => {
    const res = await voteOnPoll(post.id, optionId);
    if (res) setPollState(res.poll);
  };

  return (
    <View style={{ backgroundColor: C.card, padding: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Avatar handle={post.author.handle} />
        <View style={{ flex: 1 }}>
          {/* header */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
            <Text style={{ color: C.text, fontWeight: '800' }}>
              {post.author.name || `@${post.author.handle}`}
            </Text>
            <Text style={{ color: C.sub }}>@{post.author.handle}</Text>
            <Text style={{ color: C.sub }}>· {timeAgo(post.createdAt)}</Text>
          </View>

          {/* body */}
          {post.body ? (
            <Text style={{ color: C.text, marginTop: 4 }}>
              {post.body}
              {hashtags}
            </Text>
          ) : null}

          {/* media */}
          <View style={{ marginTop: 8 }}>
            <MediaBlock media={post.media} />
          </View>

          {/* link preview (simple) */}
          {post.linkUrl ? (
            <TouchableOpacity
              onPress={openFirstLink}
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 12,
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="link-2" color={C.sub} size={16} />
              <Text numberOfLines={1} style={{ color: C.sub, flex: 1 }}>
                {post.linkUrl}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* location */}
          {post.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Ionicons name="location-outline" size={14} color={C.sub} />
              <Text style={{ color: C.sub }}>{post.location}</Text>
            </View>
          ) : null}

          {/* poll */}
          {pollState ? (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 12,
                padding: 10,
                gap: 8,
              }}
            >
              {pollState.options.map((opt) => {
                const total = pollState.options.reduce((s, o) => s + o.votes, 0) || 1;
                const pct = Math.round((opt.votes / total) * 100);
                const voted = pollState.votedOptionId === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => onVote(opt.id)}
                    disabled={!!pollState.votedOptionId}
                    style={{
                      borderWidth: 1,
                      borderColor: voted ? '#2563eb' : C.border,
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: voted ? '#2563eb' : C.text,
                        fontWeight: voted ? '700' : '500',
                      }}
                    >
                      {opt.text} · {pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={{ color: C.sub, marginTop: 2 }}>
                {pollState.votedOptionId ? 'You voted' : 'Tap an option to vote'}
              </Text>
            </View>
          ) : null}

          {/* action bar */}
          <View style={{ flexDirection: 'row', gap: 26, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="message-circle" size={18} color={C.sub} />
              <Text style={{ color: C.sub }}>{post.comments}</Text>
            </View>

            <TouchableOpacity
              onPress={onRepost}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Feather name="repeat" size={18} color={C.sub} />
              <Text style={{ color: C.sub }}>{post.reposts}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={likeToggle}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <MaterialCommunityIcons
                name={localLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={localLiked ? C.gold : C.sub}
              />
              <Text style={{ color: localLiked ? C.gold : C.sub }}>{localLikes}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={share} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="share-2" size={18} color={C.sub} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
