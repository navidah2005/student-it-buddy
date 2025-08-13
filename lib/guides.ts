// lib/guides.ts
// Smart, offline triage with synonyms, intents, device-aware steps, categories,
// and a Hybrid composer that appends related fixes (e.g., DNS flush + IP renew).

export type Platform = 'windows' | 'macos' | 'ios' | 'android';
export type Step = { text: string; copy?: string };
export type Action = { label: string; copy?: string; url?: string };
export type Guide = {
  id: string;
  title: string;
  category: string;
  minutes?: number;
  why?: string;
  keywords: string[];
  steps: Partial<Record<Platform | 'all', Step[]>>;
  links?: { label: string; url: string }[];
  actions?: Action[];
  tips?: string[];
  // Optional per-device media (you can add local images later if you want)
  media?: Partial<Record<Platform | 'all', any>>;
};

const SYNONYMS: Record<string, string> = {
  'wi-fi': 'wifi', 'wi fi': 'wifi', wireless: 'wifi',
  email: 'email', 'e-mail': 'email',
  mic: 'mic', microphone: 'mic',
  printing: 'printer', queue: 'queue',
  passcode: 'password', signin: 'login', 'sign-in': 'login',
  cannot: 'cant', "can't": 'cant',
  onedrive: 'onedrive', teams: 'teams', zoom: 'zoom',
  dns: 'dns', ip: 'ip', flush: 'flush', renew: 'renew',
  slow: 'slow', performance: 'performance',
  certificate: 'certificate', ssid: 'ssid', vpn: 'vpn',
  chrome: 'chrome', edge: 'edge', safari: 'safari',
};
function normalize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SYNONYMS[t] || t);
}
function includesAny(hay: string, needles: string[]) {
  const L = hay.toLowerCase();
  return needles.some((n) => L.includes(n.toLowerCase()));
}

const INTENTS: Array<{ id: string; re: RegExp; boost: number }> = [
  { id: 'wifi no internet', re: /(wifi|wi-?fi).*(no|not).*(internet|access)|no.*internet.*(wifi|wi-?fi)/i, boost: 2.5 },
  { id: 'cant login', re: /(can.?t|cannot|unable).*(log.?in|sign.?in)/i, boost: 2.0 },
  { id: 'reset password', re: /(reset|forgot).*(password)/i, boost: 2.0 },
  { id: 'printer missing', re: /(printer).*(not|missing|can.?t).*(show|find|see|add)/i, boost: 1.8 },
  { id: 'mfa issue', re: /(mfa|2fa|authenticator).*(code|setup|reset|change)/i, boost: 1.5 },
  { id: 'dns flush', re: /(dns).*(flush|clear)/i, boost: 1.5 },
  { id: 'renew ip', re: /(renew).*(ip)/i, boost: 1.5 },
  { id: 'teams mic', re: /(teams).*(mic|microphone|audio)/i, boost: 1.5 },
  { id: 'zoom audio', re: /(zoom).*(audio|mic|microphone)/i, boost: 1.3 },
  { id: 'clear cache', re: /(clear).*(cache|cookies)/i, boost: 1.0 },
];

const GUIDES: Guide[] = [
  {
    id: 'connect-wifi',
    title: 'Connect to Campus Wi-Fi',
    category: 'Networking',
    minutes: 3,
    why: 'Fixes most “connected but no internet” issues.',
    keywords: ['wifi', 'internet', 'network', 'ssid', 'certificate', 'connect'],
    steps: {
      windows: [
        { text: 'Open Settings → Network & Internet → Wi-Fi.' },
        { text: 'Click “Show available networks” and choose your campus SSID (e.g., CSU-Secure).' },
        { text: 'Enter your student username and password.' },
        { text: 'Accept/Trust the certificate if prompted.' },
      ],
      macos: [
        { text: 'Open System Settings → Wi-Fi.' },
        { text: 'Select the campus SSID (e.g., CSU-Secure).' },
        { text: 'Enter your student username and password.' },
        { text: 'Trust the certificate if asked.' },
      ],
      ios: [
        { text: 'Settings → Wi-Fi → tap campus SSID.' },
        { text: 'Enter your student username and password.' },
        { text: 'Tap “Trust” if a certificate prompt appears.' },
      ],
      android: [
        { text: 'Settings → Network & internet → Internet.' },
        { text: 'Tap the campus SSID.' },
        { text: 'EAP method: PEAP (if asked). Identity = username. Password = password.' },
        { text: 'Accept certificate if prompted.' },
      ],
      all: [
        { text: 'If signal is weak, move closer to the access point.' },
        { text: 'Toggle Wi-Fi off/on and retry.' },
      ],
    },
    links: [{ label: 'Wi-Fi Help', url: 'https://example.edu/wifi' }],
    actions: [{ label: 'Open Wi-Fi Portal', url: 'https://example.edu/wifi-onboard' }],
    tips: ['If you changed your password, forget the network and rejoin.'],
  },
  {
    id: 'wifi-no-internet',
    title: 'Wi-Fi Says Connected but No Internet',
    category: 'Networking',
    minutes: 4,
    why: 'Diagnose captive portal, DNS, and IP issues.',
    keywords: ['wifi', 'internet', 'nointernet', 'dns', 'ip', 'captive', 'portal', 'connect'],
    steps: {
      all: [
        { text: 'Open a browser and visit a plain HTTP page (e.g., neverssl.com) to trigger captive portal.' },
        { text: 'If a login page appears, sign in with your campus credentials.' },
        { text: 'Toggle Airplane Mode ON (10s), then OFF and reconnect.' },
      ],
      windows: [
        { text: 'Flush DNS:', copy: 'ipconfig /flushdns' },
        { text: 'Renew IP:', copy: 'ipconfig /release && ipconfig /renew' },
      ],
      macos: [
        { text: 'Flush DNS:', copy: 'sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder' },
        { text: 'Turn Wi-Fi off then on; rejoin campus SSID.' },
      ],
      android: [{ text: 'Forget the network, then rejoin and accept certificate prompts.' }],
      ios: [{ text: 'Settings → Wi-Fi → (i) → Forget This Network → rejoin → Trust certificate if prompted.' }],
    },
    links: [{ label: 'Network Status', url: 'https://status.example.edu' }],
    actions: [{ label: 'Open Captive Portal Test', url: 'http://neverssl.com' }],
    tips: ['VPNs can block captive portals — disable VPN while joining.'],
  },
  {
    id: 'flush-dns',
    title: 'Flush DNS Cache',
    category: 'Networking',
    minutes: 2,
    why: 'Fixes “site won’t load but others work”.',
    keywords: ['dns', 'flush', 'resolve', 'internet'],
    steps: {
      windows: [{ text: 'Run:', copy: 'ipconfig /flushdns' }],
      macos: [{ text: 'Run:', copy: 'sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder' }],
      all: [{ text: 'Retry the website after 10–20 seconds.' }],
    },
  },
  {
    id: 'renew-ip',
    title: 'Renew Your IP Address',
    category: 'Networking',
    minutes: 2,
    why: 'Refreshes your DHCP lease.',
    keywords: ['ip', 'renew', 'internet', 'network'],
    steps: {
      windows: [{ text: 'Run:', copy: 'ipconfig /release && ipconfig /renew' }],
      macos: [{ text: 'System Settings → Network → Wi-Fi → Details → TCP/IP → Renew DHCP Lease.' }],
      all: [{ text: 'Reopen your browser/app and test again.' }],
    },
  },
  {
    id: 'add-printer',
    title: 'Add a Campus Printer',
    category: 'Printing',
    minutes: 4,
    why: 'Install the correct queue and print securely.',
    keywords: ['printer', 'printing', 'queue', 'driver', 'add'],
    steps: {
      windows: [
        { text: 'Win+I → Bluetooth & devices → Printers & scanners → Add device.' },
        { text: 'If not found, choose “The printer that I want isn’t listed”.' },
        { text: 'Enter path (e.g., \\\\print.example.edu\\Library-1stFloor).' },
        { text: 'Install driver if prompted.' },
      ],
      macos: [
        { text: 'System Settings → Printers & Scanners → Add Printer.' },
        { text: 'IP tab → enter printer address/queue; add.' },
      ],
      all: [{ text: 'Print a test page.' }],
    },
    links: [{ label: 'Printer Locations', url: 'https://example.edu/printing' }],
  },
  {
    id: 'clear-print-queue',
    title: 'Clear a Stuck Print Queue',
    category: 'Printing',
    minutes: 3,
    why: 'Fixes “job stuck” or printer not responding.',
    keywords: ['printer', 'queue', 'stuck', 'driver', 'spooler'],
    steps: {
      windows: [
        { text: 'Open Services → stop “Print Spooler”.' },
        { text: 'Delete files in:', copy: 'C:\\Windows\\System32\\spool\\PRINTERS' },
        { text: 'Start “Print Spooler” again.' },
      ],
      macos: [
        { text: 'System Settings → Printers & Scanners → select printer → Open Print Queue.' },
        { text: 'Cancel all jobs, then try printing again.' },
      ],
    },
  },
  {
    id: 'reset-password',
    title: 'Reset Your Student Password',
    category: 'Accounts',
    minutes: 2,
    why: 'Unlock your account via self-service.',
    keywords: ['password', 'reset', 'unlock', 'login', 'mfa', 'account', 'forgot'],
    steps: {
      all: [
        { text: 'Open the Password Reset Portal.', copy: 'https://example.edu/reset' },
        { text: 'Enter your student email (e.g., name@students.example.edu).' },
        { text: 'Verify using your MFA method (code/app).' },
        { text: 'Create a strong password (12+ chars, mix upper/lower/number/symbol).' },
      ],
    },
    links: [
      { label: 'Password Policy', url: 'https://example.edu/policy/password' },
      { label: 'IT Service Desk', url: 'https://example.edu/it-help' },
    ],
    actions: [{ label: 'Open Reset Portal', url: 'https://example.edu/reset' }],
    tips: ['If locked, wait 10–15 min after too many attempts before trying again.'],
  },
  {
    id: 'account-locked',
    title: 'Account Locked or Too Many Attempts',
    category: 'Accounts',
    minutes: 2,
    why: 'Avoid lockouts from repeated wrong passwords.',
    keywords: ['login', 'locked', 'unlock', 'password', 'cant'],
    steps: {
      all: [
        { text: 'Stop trying for 10–15 minutes to allow lockout to expire.' },
        { text: 'Reset your password if unsure.', copy: 'https://example.edu/reset' },
        { text: 'Update saved passwords on all devices (phone, laptop, email, Wi-Fi).' },
      ],
    },
    tips: ['Old saved passwords on another device often re-lock your account.'],
  },
  {
    id: 'mfa-reset',
    title: 'MFA / Authenticator Reset',
    category: 'Accounts',
    minutes: 3,
    why: 'Fix code mismatch or phone change issues.',
    keywords: ['mfa', '2fa', 'auth', 'code', 'reset', 'login'],
    steps: {
      all: [
        { text: 'Try backup method (SMS/voice code) if available.' },
        { text: 'Use your organization’s MFA reset request form.', copy: 'https://example.edu/mfa-reset' },
        { text: 'Re-enroll authenticator app after reset.' },
      ],
    },
    links: [{ label: 'MFA Help', url: 'https://example.edu/mfa' }],
  },
  {
    id: 'outlook-setup',
    title: 'Set Up Student Email in Outlook',
    category: 'Email',
    minutes: 3,
    why: 'Add your school mailbox to Outlook Desktop/Mobile.',
    keywords: ['outlook', 'email', 'login', 'setup'],
    steps: {
      windows: [{ text: 'Outlook → File → Add Account → enter student email → sign in (MFA if asked).' }],
      macos: [{ text: 'Outlook → Tools → Accounts → + → New Account → enter student email → sign in.' }],
      ios: [{ text: 'Install Outlook → Add Account → enter student email → sign in.' }],
      android: [{ text: 'Install Outlook → Add Account → enter student email → sign in.' }],
    },
  },
  {
    id: 'onedrive-sync',
    title: 'Fix OneDrive Not Syncing',
    category: 'Storage',
    minutes: 4,
    why: 'Resolve stuck files or missing green checkmarks.',
    keywords: ['onedrive', 'sync', 'files', 'storage'],
    steps: {
      windows: [
        { text: 'Right-click OneDrive icon → Pause syncing (10 min), then Resume.' },
        { text: 'Ensure you are signed in with your student account.' },
        { text: 'Check Files On-Demand in OneDrive Preferences.' },
      ],
      macos: [
        { text: 'OneDrive menu → Pause syncing (10 min), then Resume.' },
        { text: 'Verify you are signed in with your student account.' },
        { text: 'Check Files On-Demand in Preferences.' },
      ],
      all: [{ text: 'Confirm enough disk space; free up if low.' }],
    },
  },
  {
    id: 'teams-mic',
    title: 'Microsoft Teams Mic Not Working',
    category: 'Audio/Video',
    minutes: 3,
    why: 'Microphone permissions and device selection.',
    keywords: ['teams', 'mic', 'microphone', 'audio'],
    steps: {
      windows: [
        { text: 'Settings → Privacy & security → Microphone → allow access for apps and Teams.' },
        { text: 'Teams → Settings → Devices → pick the correct microphone; test call.' },
      ],
      macos: [
        { text: 'System Settings → Privacy & Security → Microphone → allow Teams.' },
        { text: 'Teams → Settings → Devices → select mic; test call.' },
      ],
      ios: [{ text: 'Settings → Teams → enable Microphone.' }],
      android: [{ text: 'Settings → Apps → Teams → Permissions → allow Microphone.' }],
      all: [{ text: 'Unmute in Teams and on your physical mic if it has a switch.' }],
    },
  },
  {
    id: 'zoom-audio',
    title: 'Zoom: No Mic or No Sound',
    category: 'Audio/Video',
    minutes: 3,
    why: 'Pick the right devices and allow permissions.',
    keywords: ['zoom', 'audio', 'mic', 'microphone', 'speaker'],
    steps: {
      all: [
        { text: 'Zoom → Settings → Audio → Test Speaker and Microphone; pick correct devices.' },
        { text: 'Ensure Zoom has microphone permission in system app settings.' },
      ],
    },
  },
  {
    id: 'clear-browser-cache',
    title: 'Clear Browser Cache & Cookies',
    category: 'Browser',
    minutes: 2,
    why: 'Fixes many login loops and weird web behavior.',
    keywords: ['browser', 'cache', 'cookies', 'chrome', 'edge', 'safari', 'login'],
    steps: {
      all: [
        { text: 'Chrome: Settings → Privacy → Clear browsing data (Cookies & cached images).' },
        { text: 'Edge: Settings → Privacy → Clear browsing data (Cookies & cache).' },
        { text: 'Safari (iOS): Settings → Safari → Clear History and Website Data.' },
      ],
    },
  },
  {
    id: 'slow-performance',
    title: 'Speed Up a Slow Laptop',
    category: 'Performance',
    minutes: 5,
    why: 'Basic cleanup steps that help most Windows/macOS devices.',
    keywords: ['slow', 'performance', 'lag', 'freeze', 'speed', 'storage'],
    steps: {
      windows: [
        { text: 'Restart the laptop if it has been on for days.' },
        { text: 'Task Manager → Startup → disable heavy apps you don’t need.' },
        { text: 'Settings → System → Storage → run Storage Sense.' },
        { text: 'Windows Update → install pending updates.' },
      ],
      macos: [
        { text: 'Restart the Mac if it has been on for days.' },
        { text: 'System Settings → General → Login Items → remove unneeded items.' },
        { text: 'About This Mac → Storage → Manage → free space.' },
        { text: 'Software Update → install updates.' },
      ],
      all: [{ text: 'Keep at least 10–15% disk free for best performance.' }],
    },
  },
];

export function getGuide(id: string) {
  return GUIDES.find((g) => g.id === id);
}
export function listCategories(): string[] {
  return Array.from(new Set(GUIDES.map((g) => g.category))).sort();
}

// --- Hybrid composition map: which guides to append as "related" steps
const HYBRID: Record<string, string[]> = {
  'wifi-no-internet': ['flush-dns', 'renew-ip'],
  'connect-wifi': ['wifi-no-internet'],
  'teams-mic': [],
  'zoom-audio': [],
  'add-printer': ['clear-print-queue'],
};

// Merge base steps with related guide steps (device-specific if available)
export function buildHybridSteps(
  id: string,
  device: Platform,
  base: Step[]
): Step[] {
  let merged = [...base];
  const rel = HYBRID[id] || [];
  for (const rid of rel) {
    const g = getGuide(rid);
    if (!g) continue;
    const extra = (g.steps[device] || g.steps.all || []) as Step[];
    merged = merged.concat(extra);
  }
  // de-duplicate (text + copy)
  const seen = new Set<string>();
  return merged.filter((s) => {
    const key = (s.text + '||' + (s.copy || '')).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Search used on the list page (includes category in result). */
export function triageGuides({
  text,
  device,
}: {
  text: string;
  device?: Platform;
}): Array<Pick<Guide, 'id' | 'title' | 'minutes' | 'why' | 'category'>> {
  const raw = text.trim();
  if (!raw) return [];
  const tokens = normalize(raw);
  const hayIntent = raw;

  const scored = GUIDES.map((g) => {
    const hay = [g.title, g.category, g.why, ...(g.keywords || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    let score = 0;

    const gTokens = new Set(normalize(hay));
    let overlap = 0;
    for (const t of tokens) if (gTokens.has(t)) overlap++;
    score += overlap * 1.1;

    if (g.keywords?.some((k) => tokens.includes(k.toLowerCase()))) score += 1.5;

    if (includesAny(hay, [raw.toLowerCase()])) score += 0.8;

    for (const intent of INTENTS) {
      if (intent.re.test(hayIntent) && includesAny(hay, intent.id.split(' '))) score += intent.boost;
    }

    if (device && (g.steps[device] || g.steps.all)) score += 0.5;

    return { guide: g, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return scored.map(({ guide }) => ({
    id: guide.id,
    title: guide.title,
    minutes: guide.minutes,
    why: guide.why,
    category: guide.category,
  }));
}
