// Single place for Sahayak's social pages. A link with an empty `url` is HIDDEN everywhere (footer, contact).
// To switch one on: paste its full address between the quotes below, save, and deploy. Nothing else needs editing.
export interface SocialLink { id: 'facebook' | 'instagram' | 'linkedin' | 'youtube'; label: string; url: string }
export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/1Bj2epb7xk/' },
  { id: 'instagram', label: 'Instagram', url: '' },
  { id: 'linkedin', label: 'LinkedIn', url: '' },
  { id: 'youtube', label: 'YouTube', url: '' },
];
/** Only links with a real https address are shown. */
export const visibleSocials = (): SocialLink[] => SOCIAL_LINKS.filter((s) => /^https:\/\/[^\s]+$/.test(s.url.trim()));
