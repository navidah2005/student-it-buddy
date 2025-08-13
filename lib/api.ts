// lib/api.ts
import type { Guide } from './guides';

const BASE = (process.env as any).EXPO_PUBLIC_API_BASE as string | undefined;

function join(base: string, path: string) {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export async function postJSON(path: string, body: any) {
  if (!BASE) return { ok: false, skipped: true, reason: 'No EXPO_PUBLIC_API_BASE set' };
  try {
    const res = await fetch(join(BASE, path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function tryFetchGuides(): Promise<Guide[] | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(join(BASE, 'guides'), { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json)) return json as Guide[];
    if (Array.isArray((json as any).guides)) return (json as any).guides as Guide[];
    return null;
  } catch {
    return null;
  }
}

export async function logEvent(name: string, props?: Record<string, any>) {
  return postJSON('events', { name, props, ts: Date.now() });
}

export async function sendFeedback(payload: {
  guideId: string;
  device: string;
  helpful: boolean | null;
  message?: string;
}) {
  return postJSON('feedback', payload);
}
