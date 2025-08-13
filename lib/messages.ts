// lib/messages.ts
import { ME, User } from '@/lib/community';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThreadID = string;

export type Message = {
  id: string;
  threadId: ThreadID;
  from: User;
  to: User;
  body?: string;
  mediaUrl?: string; // image/video/gif link
  createdAt: number;
};

export type Thread = {
  id: ThreadID;
  me: User;
  other: User;
  lastMessageAt: number;
  lastSnippet: string;
  unread?: number;
};

const T_STORE = '@dm:threads';
const M_PREFIX = '@dm:messages:';

const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;

function key(threadId: ThreadID) { return M_PREFIX + threadId; }

export async function listThreads(): Promise<Thread[]> {
  const raw = await AsyncStorage.getItem(T_STORE);
  const arr: Thread[] = raw ? JSON.parse(raw) : [];
  return arr.sort((a,b)=>b.lastMessageAt - a.lastMessageAt);
}

export async function startThreadWith(other: User): Promise<Thread> {
  const threads = await listThreads();
  const found = threads.find(t => t.other.handle === other.handle);
  if (found) return found;
  const t: Thread = { id: rid(), me: ME, other, lastMessageAt: Date.now(), lastSnippet: 'Say hi!' };
  await AsyncStorage.setItem(T_STORE, JSON.stringify([t, ...threads]));
  await AsyncStorage.setItem(key(t.id), JSON.stringify([]));
  return t;
}

export async function getThread(threadId: ThreadID): Promise<{thread: Thread, messages: Message[]}> {
  const threads = await listThreads();
  const t = threads.find(x => x.id === threadId)!;
  const msgsRaw = await AsyncStorage.getItem(key(threadId));
  return { thread: t, messages: msgsRaw ? JSON.parse(msgsRaw) : [] };
}

export async function sendMessage(threadId: ThreadID, to: User, body?: string, mediaUrl?: string) {
  const { thread } = await getThread(threadId);
  const msg: Message = { id: rid(), threadId, from: ME, to, body, mediaUrl, createdAt: Date.now() };

  const listRaw = await AsyncStorage.getItem(key(threadId));
  const list: Message[] = listRaw ? JSON.parse(listRaw) : [];
  list.push(msg);
  await AsyncStorage.setItem(key(threadId), JSON.stringify(list));

  const threads = await listThreads();
  const idx = threads.findIndex(t => t.id === threadId);
  if (idx >= 0) {
    threads[idx] = { ...threads[idx], lastMessageAt: msg.createdAt, lastSnippet: body || (mediaUrl ? '📎 Attachment' : '') };
    await AsyncStorage.setItem(T_STORE, JSON.stringify(threads));
  }
  return msg;
}
