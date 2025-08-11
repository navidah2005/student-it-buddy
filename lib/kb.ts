// lib/kb.ts
import type { SchoolProfile } from './profiles';

type KBItem = {
  keywords: string[];
  answer: string;
  personalize?: (p: SchoolProfile) => string; // optional add-on line using profile
};

export const KB: KBItem[] = [
  {
    keywords: ['wifi', 'wi-fi', 'wi fi', 'network', 'ssid', 'wireless'],
    answer:
      'Wi-Fi quick fix:\n1) Toggle Airplane mode off/on\n2) Forget & rejoin network\n3) DNS: 8.8.8.8 / 1.1.1.1\n4) If campus login is required, use your student credentials',
    personalize: (p) =>
      `At ${p.name}, connect to **${p.wifiSsid ?? 'your campus SSID'}** and sign in with your student account.`,
  },
  {
    keywords: ['vpn', 'globalprotect', 'anyconnect', 'openvpn'],
    answer:
      'VPN setup:\n1) Install your school’s VPN app\n2) Sign in with student account\n3) Ensure device date/time is correct\n4) Try another network (hotspot)\n5) Reboot & retry',
    personalize: (p) =>
      `For ${p.name}, the VPN app is usually **${p.vpnApp ?? 'your campus VPN'}**.`,
  },
  {
    keywords: ['email', 'outlook', 'gmail', 'imap', 'exchange', 'o365', 'office 365', 'mfa', '2fa'],
    answer:
      'Email fix:\n1) Check internet\n2) Remove & re-add account\n3) Verify IMAP/Exchange settings\n4) Clear app cache / restart\n5) Complete MFA/2FA if prompted',
    personalize: (p) =>
      `${p.name} typically uses **${p.emailProvider ?? 'campus email'}**. If issues persist, see Helpdesk: ${p.helpdeskUrl ?? 'your school helpdesk site'}.`,
  },
  {
    keywords: ['slow', 'lag', 'performance', 'freeze', 'freezing', 'hang'],
    answer:
      'Speed up laptop:\n1) Close heavy apps/tabs\n2) Restart\n3) Free 10–20% disk space\n4) Update OS/drivers\n5) Run malware scan',
  },
  {
    keywords: ['ethernet', 'lan', 'cable'],
    answer:
      'Ethernet check:\n1) Try another port/cable\n2) Disable/enable adapter\n3) Set IP to DHCP (auto)\n4) Temporarily turn off VPN and test',
  },
  {
    keywords: ['remote desktop', 'rdp'],
    answer:
      'RDP tips:\n1) Use the campus gateway if required\n2) Confirm host PC is on and allows RDP\n3) Check firewall allows 3389\n4) Use VPN if off-campus',
  },
  {
    keywords: ['python', 'pip', 'venv'],
    answer:
      'Install Python:\n1) python.org → Download\n2) On Windows, check “Add to PATH”\n3) Confirm: python --version\n4) Create venv: python -m venv .venv → activate',
  },
  {
    keywords: ['node', 'npm', 'npx'],
    answer:
      'Node basics:\n1) nodejs.org LTS\n2) Confirm: node -v & npm -v\n3) Fix oddities: clear npm cache → reinstall LTS',
  },
  {
    keywords: ['vscode', 'vs code', 'ide', 'editor'],
    answer:
      'VS Code setup:\n1) Install VS Code\n2) Extensions: Python, ESLint, Prettier\n3) Terminal: set default shell\n4) Trust workspace to enable features',
  },
  {
    keywords: ['java', 'jdk', 'jdk install'],
    answer:
      'Java/JDK:\n1) Install latest LTS JDK (Temurin)\n2) Confirm: java -version & javac -version\n3) Set JAVA_HOME if tools can’t find it',
  },
  {
    keywords: ['printer', 'print', 'queue', 'spooler'],
    answer:
      'Printer basics:\n1) Same Wi-Fi/VPN as printer\n2) Add correct driver/queue\n3) Set as default\n4) Windows: restart “Print Spooler” service',
    personalize: (p) =>
      `If using campus printers at ${p.name}, ensure you’re on **${p.wifiSsid ?? 'the campus Wi-Fi'}** or connected via VPN (**${p.vpnApp ?? 'campus VPN'}**).`,
  },
  {
    keywords: ['bluetooth', 'pair', 'headphones', 'airpods'],
    answer:
      'Bluetooth pairing:\n1) Remove device and re-pair\n2) Put accessory in pairing mode\n3) Toggle Bluetooth off/on\n4) Update firmware if available',
  },
  {
    keywords: ['disk', 'storage', 'space', 'full'],
    answer:
      'Free up storage:\n1) Delete large downloads\n2) Empty recycle bin\n3) Uninstall unused apps\n4) Move videos to external drive\n5) Keep 10–20% free',
  },
  {
    keywords: ['update', 'windows update', 'software update', 'driver'],
    answer:
      'Updates:\n1) Run OS updates\n2) Update GPU/Wi-Fi drivers\n3) Restart afterwards\n4) Retry the original task',
  },
  {
    keywords: ['malware', 'virus', 'security', 'defender'],
    answer:
      'Security check:\n1) Update antivirus/Defender\n2) Run full scan\n3) Review startup apps\n4) Avoid unknown USBs/links\n5) Back up important files',
  },
];

// Simple scoring-based matcher + optional profile-specific line.
export function getReply(userText: string, profile?: SchoolProfile): string {
  const lower = userText.toLowerCase();
  let best: { score: number; item: KBItem } | null = null;

  for (const item of KB) {
    let score = 0;
    for (const k of item.keywords) {
      if (lower.includes(k)) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, item };
    }
  }

  if (best) {
    const base = best.item.answer;
    const extra = profile && best.item.personalize ? `\n\n${best.item.personalize(profile)}` : '';
    return base + extra;
  }

  return (
    'I’m still learning. Try keywords like:\n' +
    '• wifi / vpn / email\n' +
    '• python / node / vscode\n' +
    '• printer / bluetooth\n' +
    '• storage / updates / malware'
  );
}