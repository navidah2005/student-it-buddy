// lib/profiles.ts
export type SchoolProfile = {
  id: string;
  name: string;
  wifiSsid?: string;
  vpnApp?: string;
  emailProvider?: string; // e.g., "Office 365", "Gmail"
  helpdeskUrl?: string;
};

export const PROFILES: SchoolProfile[] = [
  {
    id: 'generic',
    name: 'Generic / Any School',
    wifiSsid: 'eduroam (or campus SSID)',
    vpnApp: 'AnyConnect / GlobalProtect',
    emailProvider: 'Office 365 or Gmail',
    helpdeskUrl: 'https://your-school-helpdesk.example',
  },
  {
    id: 'coppin',
    name: 'Coppin State University',
    wifiSsid: 'eduroam',
    vpnApp: 'GlobalProtect',
    emailProvider: 'Office 365',
    helpdeskUrl: 'https://www.coppin.edu/it/helpdesk',
  },
  // Add more schools later…
];

export function getProfileById(id: string): SchoolProfile | undefined {
  return PROFILES.find(p => p.id === id);
}
