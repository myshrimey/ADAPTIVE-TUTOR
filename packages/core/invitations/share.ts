import { INVITE_ROLE_LABEL, type InviteRole } from './constants';
// Sharing is a plain link to the person's own WhatsApp / mail / copy: Sahayak never touches the sender's WhatsApp account and stores no credentials.
export function inviteMessage(role: InviteRole, link: string): string {
  const label = INVITE_ROLE_LABEL[role];
  const a = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `You have been invited to join Sahayak as ${a} ${label}.\n\nPlease open this link to complete your registration:\n\n${link}\n\nSahayak: adaptive learning and assessment support.`;
}
/** Add where the link was shared, so the source is stored server-side when it is opened. */
export function withSource(link: string, source: string, campaign?: string | null): string {
  const u = new URL(link); u.searchParams.set('source', source); if (campaign) u.searchParams.set('campaign', campaign); return u.toString();
}
export function shareLinks(role: InviteRole, link: string, campaign?: string | null) {
  const wa = withSource(link, 'whatsapp', campaign), tg = withSource(link, 'telegram', campaign);
  return {
    whatsapp: 'https://wa.me/?text=' + encodeURIComponent(inviteMessage(role, wa)),
    telegram: 'https://t.me/share/url?url=' + encodeURIComponent(tg) + '&text=' + encodeURIComponent(inviteMessage(role, tg).split('\n\n')[0]),
    email: 'mailto:?subject=' + encodeURIComponent('Your Sahayak invitation') + '&body=' + encodeURIComponent(inviteMessage(role, withSource(link, 'email', campaign))),
    text: inviteMessage(role, link),
  };
}
