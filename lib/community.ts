// lib/community.ts
export type User = {
  id: string;
  handle: string;
  name?: string;
  avatarColor?: string;
};

export type Media = { type: 'image' | 'gif' | 'video'; url: string };

export type PollOption = { id: string; text: string; votes: number };
export type Poll = { id: string; options: PollOption[]; endsAt?: number; votedOptionId?: string };
export type PollDraft = { options: string[] };

export type Post = {
  id: string;
  author: User;
  body?: string;
  createdAt: number;
  media?: Media[];
  linkUrl?: string;
  location?: string;
  hashtags?: string[];
  poll?: Poll;
  likes: number;
  likedByMe: boolean;
  reposts: number;
  comments: number;
};

export type Comment = {
  id: string;
  postId: string;
  body: string;
  author: User;
  createdAt: number;
};

const ME: User = { id: 'me', handle: 'you', name: 'You', avatarColor: '#0ea5e9' };
const DEMO: User = { id: 'u1', handle: 'elon', name: 'Elon', avatarColor: '#334155' };
const DEMO2: User = { id: 'u2', handle: 'sam', name: 'Sam', avatarColor: '#a855f7' };

let POSTS: Post[] = [
  {
    id: 'p1',
    author: DEMO,
    body: 'There you have it',
    createdAt: Date.now() - 1000 * 60 * 60 * 15,
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1553532435-93d06ddf0f50?q=80&w=1000',
      },
    ],
    likes: 18200,
    likedByMe: false,
    reposts: 15100,
    comments: 6200,
    hashtags: ['AI'],
  },
  {
    id: 'p2',
    author: DEMO2,
    body: 'Ship small things daily. #buildinpublic',
    createdAt: Date.now() - 1000 * 60 * 120,
    likes: 360,
    likedByMe: false,
    reposts: 42,
    comments: 18,
    media: [],
  },
];

let COMMENTS: Comment[] = [];

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export async function listFeed(kind: 'forYou' | 'following'): Promise<Post[]> {
  // demo: same set, but you could filter differently for "following"
  await sleep(100);
  return POSTS.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function createPost(input: {
  body?: string;
  media?: Media[];
  linkUrl?: string;
  location?: string;
  poll?: Poll;
}): Promise<Post> {
  await sleep(150);
  const p: Post = {
    id: `p${Date.now()}`,
    author: ME,
    body: input.body,
    createdAt: Date.now(),
    media: input.media,
    linkUrl: input.linkUrl,
    location: input.location,
    poll: input.poll,
    hashtags: Array.from(new Set((input.body?.match(/#\w+/g) || []).map((v) => v.slice(1)))),
    likes: 0,
    likedByMe: false,
    reposts: 0,
    comments: 0,
  };
  POSTS = [p, ...POSTS];
  return p;
}

export async function likePost(id: string, want: boolean): Promise<Post | null> {
  await sleep(80);
  POSTS = POSTS.map((p) =>
    p.id === id ? { ...p, likedByMe: want, likes: Math.max(0, p.likes + (want ? 1 : -1)) } : p
  );
  return POSTS.find((p) => p.id === id) || null;
}

export async function repostPost(id: string): Promise<Post | null> {
  await sleep(80);
  POSTS = POSTS.map((p) => (p.id === id ? { ...p, reposts: p.reposts + 1 } : p));
  return POSTS.find((p) => p.id === id) || null;
}

export async function getPost(id: string): Promise<Post | undefined> {
  await sleep(60);
  return POSTS.find((p) => p.id === id);
}

export async function listComments(postId: string): Promise<Comment[]> {
  await sleep(60);
  return COMMENTS.filter((c) => c.postId === postId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addComment(postId: string, body: string): Promise<Comment> {
  await sleep(80);
  const c: Comment = {
    id: `c${Date.now()}`,
    postId,
    body,
    author: ME,
    createdAt: Date.now(),
  };
  COMMENTS = [c, ...COMMENTS];
  POSTS = POSTS.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p));
  return c;
}

export async function voteOnPoll(postId: string, optionId: string): Promise<Post | null> {
  await sleep(80);
  POSTS = POSTS.map((p) => {
    if (p.id !== postId || !p.poll) return p;
    if (p.poll.votedOptionId) return p; // already voted
    const options = p.poll.options.map((o) =>
      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
    );
    return { ...p, poll: { ...p.poll, options, votedOptionId: optionId } };
  });
  return POSTS.find((p) => p.id === postId) || null;
}

export async function searchPosts(q: string): Promise<Post[]> {
  await sleep(100);
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return POSTS.filter(
    (p) =>
      p.body?.toLowerCase().includes(s) ||
      p.author.handle.toLowerCase().includes(s) ||
      (p.hashtags || []).some((h) => h.toLowerCase().includes(s))
  );
}

// Profiles (very small stubs used earlier)
export async function getProfile(handle: string) {
  await sleep(60);
  const user =
    handle === 'elon' ? DEMO : handle === 'sam' ? DEMO2 : { id: 'x', handle, name: handle };
  const posts = POSTS.filter((p) => p.author.handle === handle);
  return { user, posts, isFollowing: handle !== 'you' && handle !== 'elon' ? false : true };
}
export async function toggleFollow() {
  await sleep(50);
  return { ok: true };
}

// Messages (stubs to satisfy messages screens)
export type Thread = { id: string; other: User; lastSnippet: string };
export type Message = { id: string; from: User; to: User; body?: string; mediaUrl?: string; createdAt: number };
let THREADS: Thread[] = [];
let MSGS: Message[] = [];

export async function listThreads(): Promise<Thread[]> {
  await sleep(40);
  return THREADS;
}
export async function startThreadWith(other: User): Promise<Thread> {
  await sleep(40);
  const t: Thread = { id: `t${Date.now()}`, other, lastSnippet: '' };
  THREADS = [t, ...THREADS];
  return t;
}
export async function getThread(id: string): Promise<{ thread: Thread; messages: Message[] }> {
  await sleep(40);
  const thread = THREADS.find((t) => t.id === id) || { id, other: DEMO, lastSnippet: '' };
  return { thread, messages: MSGS.filter((m) => m.to.id === thread.other || m.from.id === thread.other.id) };
}
export async function sendMessage(threadId: string, to: User, body?: string, mediaUrl?: string) {
  await sleep(40);
  const m: Message = { id: `m${Date.now()}`, from: ME, to, body, mediaUrl, createdAt: Date.now() };
  MSGS = [...MSGS, m];
  THREADS = THREADS.map((t) => (t.id === threadId ? { ...t, lastSnippet: body || '[media]' } : t));
  return m;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
