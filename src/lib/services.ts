export const SERVICES = [
  'Branding & Identity',
  'Social Media Assets',
  'Ad Creatives',
  'Email Design',
  'Packaging',
  'Marketing Collateral',
  'Print Publications',
  'Presentation Design',
  'AI Video',
  'Meta Ad',
  'Video Creations',
  'Website',
  'UI/UX',
  'XR'
] as const;

export type ServiceType = typeof SERVICES[number];

// A helper to map old service codes to the new ones if necessary
export function mapOldService(service: string): string {
  const normalized = service.toUpperCase();
  if (normalized === 'WEB_DEV') return 'Website';
  if (normalized === 'CREATIVE') return 'Branding & Identity';
  if (normalized === 'MARKETING') return 'Meta Ad';
  if (normalized === 'AI') return 'AI Video';
  return service;
}
