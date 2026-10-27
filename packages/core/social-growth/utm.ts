export const slugify = (s: string, max = 40) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'x';
/** Base address of the website: the founder's setting, else the NEXT_PUBLIC_SITE_URL variable, else empty (the page then asks for it). Never guessed. */
export function cleanBase(url: string | null | undefined): string {
  const u = String(url ?? '').trim().replace(/\/+$/, '');
  return /^https:\/\/[^\s/]+(\/[^\s?#]*)?$/.test(u) ? u : '';
}
/** facebook / social / cbse-2027 / baseline-post-01. Only the four names the website's traffic page already understands (source, medium, campaign, content). */
export function buildUtm(base: string, o: { platform: string; campaignSlug?: string | null; contentSlug: string; path?: string }): string | null {
  const b = cleanBase(base); if (!b) return null;
  const q = new URLSearchParams({ utm_source: o.platform, utm_medium: 'social', utm_campaign: o.campaignSlug || 'organic', utm_content: o.contentSlug });
  return `${b}${o.path && o.path.startsWith('/') ? o.path : '/'}?${q.toString()}`;
}
