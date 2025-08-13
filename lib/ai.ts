// lib/ai.ts
import { getReply as localReply } from '@/lib/kb';
import { SchoolProfile } from '@/lib/profiles';

// Minimal message type used by chat.tsx
export type LiteMessage = { role: 'user' | 'bot'; text: string };

// Try cloud endpoint (if configured) then fall back to local smart answers
export async function smartReply(
  userText: string,
  history: LiteMessage[],
  profile?: SchoolProfile
): Promise<string> {
  const apiBase = getApiBase();
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toCloudPayload(userText, history, profile)),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = String(data?.answer ?? '').trim();
        if (answer) return answer;
      }
    } catch {
      // ignore and fall back to local
    }
  }
  return localSmart(userText, history, profile);
}

function getApiBase(): string {
  // Read from app.json → expo.extra.EXPO_PUBLIC_API_BASE
  // (works on native and web)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Constants = require('expo-constants').default;
  const extra =
    Constants.expoConfig?.extra ??
    // @ts-ignore (old Expo runtime)
    (Constants as any).manifest?.extra ??
    {};
  return (extra.EXPO_PUBLIC_API_BASE as string) || '';
}

function toCloudPayload(userText: string, history: LiteMessage[], profile?: SchoolProfile) {
  const sys = [
    'You are Buddy, a friendly IT assistant.',
    'Answer step-by-step, beginner-friendly.',
    'Prefer short, clear instructions and numbered steps.',
    profile?.name ? `School profile: ${profile.name}.` : '',
  ].join(' ');

  const messages = [
    { role: 'system', content: sys },
    ...history.slice(-10).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ];

  return { messages, profile };
}

/* -------- Local smart fallback (improved kb) -------- */

function localSmart(userText: string, _history: LiteMessage[], profile?: SchoolProfile): string {
  const txt = userText.toLowerCase();

  const isWifi = /(wi[- ]?fi|wifi|wireless)/.test(txt);
  const isVpn = /\b(vpn|openvpn|anyconnect|globalprotect)\b/.test(txt);
  const isEmail = /\b(email|outlook|gmail|imap|smtp|mail)\b/.test(txt);
  const isPrinter = /\b(printer|printing|print)\b/.test(txt);
  const isWindows = /\b(windows 11|windows 10|install windows|win11|win10)\b/.test(txt);
  const isPassword = /\b(password|reset password|forgot password)\b/.test(txt);
  const isAccount = /\b(student id|account|login|signin|sign in)\b/.test(txt);

  const supportHint = profile?.help?.contact
    ? `\nIf steps fail, contact ${profile.help.contact}${profile.help.hours ? ` (${profile.help.hours})` : ''}.`
    : '';

  if (isWifi) return [
    'Let’s fix Wi-Fi in 5 quick steps:',
    '1) Toggle Airplane Mode OFF/ON, then Wi-Fi OFF/ON.',
    '2) Forget the network → reconnect (type password carefully).',
    '3) Set DNS to 8.8.8.8 and 1.1.1.1 (Network settings).',
    '4) Windows: Device Manager → Network adapters → your adapter → Disable → Enable.',
    '5) Restart router and your device.',
    supportHint,
  ].join('\n');

  if (isVpn) return [
    'VPN setup checklist:',
    '1) Install the official client (school/provider).',
    '2) Import .ovpn / profile or pick your gateway.',
    '3) Use school username (often without @domain).',
    '4) Approve MFA if prompted.',
    '5) Visit whatismyip to confirm change.',
    'If it loops on login, reset password and retry.',
    supportHint,
  ].join('\n');

  if (isEmail) return [
    'Email troubleshooting:',
    '1) Recheck address & password (reset if unsure).',
    '2) Outlook: File → Account Settings → Repair.',
    '3) Mobile: Remove account → Add again (auto-setup).',
    '4) Check mailbox quota; delete large attachments.',
    '5) Check service status page if available.',
    supportHint,
  ].join('\n');

  if (isPrinter) return [
    'Printer won’t print? Try this:',
    '1) Power cycle printer; check paper/ink.',
    '2) Ensure same Wi-Fi or USB cable connected.',
    '3) Clear print queue; set printer as default.',
    '4) Reinstall / update manufacturer driver.',
    '5) Print a test page from OS settings.',
    supportHint,
  ].join('\n');

  if (isWindows) return [
    'Windows install (safe outline):',
    '1) Download ISO (Microsoft site).',
    '2) Create bootable USB (Rufus / Media Creation Tool).',
    '3) Backup your files.',
    '4) Boot from USB (BIOS → Boot menu).',
    '5) Custom install → choose target drive → continue.',
    '6) After setup: Windows Update, drivers, antivirus.',
    supportHint,
  ].join('\n');

  if (isPassword || isAccount) return [
    'Account / Password help:',
    '1) Use the official reset portal.',
    '2) Ensure your device time is correct (MFA).',
    '3) After changing password, wait 5–10 minutes for sync.',
    '4) Update saved passwords on all devices.',
    '5) Locked out? Contact helpdesk to unlock.',
    supportHint,
  ].join('\n');

  // Fallback to your existing local KB (so older answers still work)
  const kb = localReply(userText, profile);
  if (kb && kb.trim() && kb.trim() !== 'I am not sure') return kb;

  // General helpful default
  return [
    'Here’s how I’d approach that:',
    '• Clarify the exact error or behavior.',
    '• Try the simplest fix first (restart app/device).',
    '• Check credentials and network.',
    '• Update and reboot.',
    'Tell me your device (Windows/macOS/iOS/Android) and what you tried—I’ll tailor steps.',
  ].join('\n');
}