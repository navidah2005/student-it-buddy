// lib/tutorials.ts
export type Tutorial = {
  id: string;
  title: string;
  steps: string[];
};

export const TUTORIALS: Tutorial[] = [
  {
    id: 'windows11-install',
    title: 'Install Windows 11 (Clean Install)',
    steps: [
      'Back up your files to an external drive or cloud.',
      'Create a Windows 11 USB with the Media Creation Tool on another PC.',
      'Plug the USB into your PC. Power on and press the Boot Menu key (F12, F9, Esc, varies by brand).',
      'Choose the USB drive to boot. When Windows Setup loads, pick language and keyboard.',
      'Click Install Now. If asked for a key, choose “I don’t have a product key” for now.',
      'Select your Windows edition if prompted. Accept terms.',
      'Choose Custom: Install Windows only (advanced).',
      'Delete existing partitions you don’t need (careful—this erases data), then select the unallocated space and click Next.',
      'Windows will copy files and restart several times.',
      'Complete the Out-of-Box Experience: region, network, sign-in with Microsoft account, privacy options.',
      'Open Settings → Update & Security → Windows Update. Install all updates and drivers.',
      'Install antivirus or ensure Microsoft Defender is active. Restore your files from backup.'
    ],
  },
  // Add more tutorials here later…
];

export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.id === id);
}