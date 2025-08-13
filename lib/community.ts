// lib/community.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Comment = {
  id: string;
  text: string;
  ts: number;
  likes: number;
  dislikes: number;
  likedByMe?: boolean;
  dislikedByMe?: boolean;
};

export type Post = {
  id: string;
  authorName: string;
  authorAvatarUri?: string;
  text: string;
  mediaUri?: string;
  mediaType?: 'image' | 'video';
  ts: number;
  likes: number;
  dislikes: number;
  likedByMe?: boolean;
  dislikedByMe?: boolean;
  comments: Comment[];
  // Reposts
  reposts: number;
  originalPostId?: string; // if this is a repost, store original id
};

const FEED_KEY = 'community:posts';

// Handle legacy objects missing new fields
function hydratePost(raw: any): Post {
  return {
    id: String(raw.id ?? Date.now()),
    authorName: String(raw.authorName ?? 'Guest'),
    authorAvatarUri: typeof raw.authorAvatarUri === 'string' ? raw.authorAvatarUri : '',
    text: String(raw.text ?? ''),
    mediaUri: typeof raw.mediaUri === 'string' ? raw.mediaUri : undefined,
    mediaType: raw.mediaType === 'video' || raw.mediaType === 'image' ? raw.mediaType : undefined,
    ts: typeof raw.ts === 'number' ? raw.ts : Date.now(),
    likes: typeof raw.likes === 'number' ? raw.likes : 0,
    dislikes: typeof raw.dislikes === 'number' ? raw.dislikes : 0,
    likedByMe: !!raw.likedByMe,
    dislikedByMe: !!raw.dislikedByMe,
    comments: Array.isArray(raw.comments)
      ? raw.comments.map((c: any) => ({
          id: String(c.id ?? Date.now()),
          text: String(c.text ?? ''),
          ts: typeof c.ts === 'number' ? c.ts : Date.now(),
          likes: typeof c.likes === 'number' ? c.likes : 0,
          dislikes: typeof c.dislikes === 'number' ? c.dislikes : 0,
          likedByMe: !!c.likedByMe,
          dislikedByMe: !!c.dislikedByMe,
        }))
      : [],
    reposts: typeof raw.reposts === 'number' ? raw.reposts : 0,
    originalPostId: typeof raw.originalPostId === 'string' ? raw.originalPostId : undefined,
  };
}

export async function loadPosts(): Promise<Post[]> {
  const raw = await AsyncStorage.getItem(FEED_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(hydratePost) : [];
  } catch {
    return [];
  }
}

export async function savePosts(posts: Post[]) {
  await AsyncStorage.setItem(FEED_KEY, JSON.stringify(posts));
}