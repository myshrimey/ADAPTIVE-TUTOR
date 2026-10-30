/** The public address used in invitation links. Set NEXT_PUBLIC_SITE_URL (for example https://sahayak.example) so shared links never point at a preview address. */
export function siteOrigin(request?: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (env) return env;
  if (request) { try { return new URL(request.url).origin; } catch { /* fall through */ } }
  return '';
}
export const inviteLink = (origin: string, token: string) => `${origin}/invite/${token}`;
