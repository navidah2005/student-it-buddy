// lib/sessions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Message = { id: string; role: 'user' | 'bot'; text: string; ts: number };
export type SessionMeta = { id: string; title: string; createdAt: number };

const SESSIONS_INDEX = 'sessions:index'; // JSON: SessionMeta[]
const SESSION_PREFIX = 'session:';       // session:<id> -> JSON: Message[]

export async function listSessions(): Promise<SessionMeta[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_INDEX);
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export async function saveSessionsIndex(list: SessionMeta[]) {
  await AsyncStorage.setItem(SESSIONS_INDEX, JSON.stringify(list));
}

export async function loadSessionMessages(id: string): Promise<Message[]> {
  const raw = await AsyncStorage.getItem(SESSION_PREFIX + id);
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export async function saveSessionMessages(id: string, msgs: Message[]) {
  await AsyncStorage.setItem(SESSION_PREFIX + id, JSON.stringify(msgs));
}

export async function createSession(initialMsg?: string): Promise<{ meta: SessionMeta; messages: Message[] }> {
  const id = String(Date.now());
  const title = initialMsg?.slice(0, 40) || 'New chat';
  const meta: SessionMeta = { id, title, createdAt: Date.now() };
  const list = await listSessions();
  await saveSessionsIndex([meta, ...list].slice(0, 50)); // keep latest 50
  await saveSessionMessages(id, []);
  return { meta, messages: [] };
}

export async function deleteSession(id: string) {
  const list = await listSessions();
  await saveSessionsIndex(list.filter(s => s.id !== id));
  await AsyncStorage.removeItem(SESSION_PREFIX + id);
}

export async function renameSession(id: string, title: string) {
  const list = await listSessions();
  const next = list.map(s => (s.id === id ? { ...s, title } : s));
  await saveSessionsIndex(next);
}