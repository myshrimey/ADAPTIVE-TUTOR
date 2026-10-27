import type { SocialStatus } from './constants';
// IDEA -> DRAFT -> REVIEW -> APPROVED -> PUBLISHED, with REJECTED / ARCHIVED. SCHEDULED is deliberately absent: it would only be true with a real scheduling integration, and none is connected.
export const TRANSITIONS: Record<SocialStatus, SocialStatus[]> = {
  IDEA: ['DRAFT', 'ARCHIVED'],
  DRAFT: ['REVIEW', 'ARCHIVED'],
  REVIEW: ['APPROVED', 'REJECTED', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  REJECTED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};
export const canMoveSocial = (from: SocialStatus, to: SocialStatus) => (TRANSITIONS[from] ?? []).includes(to);

export interface MoveInput { from: SocialStatus; to: SocialStatus; reason?: string; externalUrl?: string; acknowledgedWarnings?: boolean; hasWarnings?: boolean; hasRisk?: boolean; body?: string }
/** Returns a plain-words problem, or null when the move is allowed. Publishing is only ever a human saying "I posted this". */
export function moveProblem(m: MoveInput): string | null {
  if (!canMoveSocial(m.from, m.to)) return `A ${m.from.toLowerCase()} item cannot go straight to ${m.to.toLowerCase()}.`;
  if ((m.to === 'REVIEW' || m.to === 'APPROVED') && !String(m.body ?? '').trim()) return 'The post has no text yet.';
  if (m.to === 'APPROVED') {
    if (m.hasRisk && (!m.acknowledgedWarnings || String(m.reason ?? '').trim().length < 10)) return 'This post has a serious warning. Tick "I have read the warnings" and write a reason (at least 10 characters) to approve it.';
    if (m.hasWarnings && !m.acknowledgedWarnings) return 'This post has warnings. Tick "I have read the warnings" to approve it.';
  }
  if (m.to === 'REJECTED' && String(m.reason ?? '').trim().length < 3) return 'Write a short reason for rejecting.';
  if (m.to === 'PUBLISHED' && m.externalUrl && !/^https:\/\/[^\s]+$/.test(m.externalUrl.trim())) return 'The post address must start with https://';
  return null;
}
