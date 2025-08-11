// lib/kb.ts

// A simple list of Q&A "intents". Add/edit freely.
type KBItem = {
  keywords: string[];   // words to match in user message
  answer: string;       // the reply shown
};

export const KB: KBItem[] = [
  {
    keywords: ['wifi', 'wi-fi', 'wi fi', 'network'],
    answer:
      'Wi-Fi quick fix:\n1) Toggle Airplane mode off/on\n2) Forget & rejoin network\n3) Set DNS 8.8.8.8 / 1.1.1.1\n4) On campus: use school SSID + your login',
  },
  {
    keywords: ['vpn'],
    answer:
      'VPN setup:\n1) Install school VPN app\n2) Sign in with student account\n3) Check device date/time\n4) Try another network\n5) Reboot and retry',
  },
  {
    keywords: ['email', 'outlook', 'gmail', 'imap', 'exchange'],
    answer:
      'Email fix:\n1) Check internet\n2) Remove & re-add account\n3) Verify IMAP/Exchange settings from school docs\n4) Clear app cache or restart',
  },
  {
    keywords: ['python'],
    answer:
      'Install Python:\n1) python.org → Download\n2) On Windows, check “Add to PATH”\n3) Confirm with: python --version',
  },
  {
    keywords: ['slow', 'lag', 'performance', 'hang'],
    answer:
      'Speed up laptop:\n1) Close heavy apps/tabs\n2) Restart device\n3) Free disk space (10–20%)\n4) Check updates\n5) Run malware scan',
  },
  {
    keywords: ['printer', 'print'],
    answer:
      'Printer basics:\n1) Same Wi-Fi/VPN as printer network\n2) Add correct driver/queue\n3) Set default printer\n4) Restart spooler (Windows) or printer app',
  },
];

// Simple matcher: returns the first KB answer that matches any keyword; else a fallback.
export function getReply(userText: string): string {
  const lower = userText.toLowerCase();
  for (const item of KB) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return item.answer;
    }
  }
  return "I’m still learning. Try keywords like “wifi”, “vpn”, “email”, “python”, “printer”, or “slow”.";
}