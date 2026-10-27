import { PLATFORMS, type DraftInput, type Format } from './constants';
import { makeDraft, pick } from './templates';
import { makeHashtags, type HashtagPool } from './hashtags';
import type { Draft } from './constants';
// Calendar, daily package and repurposing. All deterministic: no AI cost, no network.

export const socialAddDays = (ymd: string, n: number) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const istToday = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export function withTags(d: Draft, i: DraftInput, pool?: HashtagPool): Draft {
  return { ...d, hashtags: makeHashtags({ platform: i.platform, audience: i.audience, scope: i.scope, seed: i.seed, pool }) };
}
export function draftFull(i: DraftInput, pool?: HashtagPool): Draft { return withTags(makeDraft(i), i, pool); }

const DAILY_TYPES: Record<string, string[]> = { facebook: ['question', 'tip', 'parent_problem', 'myth'], instagram: ['carousel', 'reel', 'tip', 'daily_challenge'], linkedin: ['text', 'founder_story', 'case_study', 'feature'] };
/** One post each for Facebook, Instagram and LinkedIn, chosen by the date so each day differs. */
export function dailyPackage(o: { date: string; pillars: string[]; defaults: { audience: string; scope: string; language: string; cta?: string }; pool?: HashtagPool }): (DraftInput & { planned_date: string; draft: Draft })[] {
  const seed = Number(o.date.replace(/-/g, '')) % 100000;
  return PLATFORMS.map((p, idx) => {
    const pillar = pick(o.pillars, seed + idx, 'pillar');
    const audience = p === 'linkedin' ? 'founder_investor' : p === 'facebook' ? 'cbse_parent' : o.defaults.audience || 'cbse_student';
    const objective = p === 'linkedin' ? 'trust' : p === 'facebook' ? 'parent_edu' : 'education';
    const input: DraftInput = { platform: p, audience, objective, contentType: pick(DAILY_TYPES[p], seed, p), scope: o.defaults.scope || 'cbse', pillar, language: o.defaults.language, cta: o.defaults.cta, seed: seed + idx };
    return { ...input, planned_date: o.date, draft: draftFull(input, o.pool) };
  });
}
/** A calendar of `days` days starting at `start`: one post a day, platforms taking turns, pillars and audiences rotating. */
export function calendarPlan(o: { start: string; days: 7 | 14 | 30; pillars: string[]; audiences?: string[]; scope?: string; language?: string; pool?: HashtagPool }) {
  const aud = o.audiences?.length ? o.audiences : ['cbse_parent', 'cbse_student', 'tutor', 'centre', 'board_learner', 'founder_investor'];
  const objs = ['education', 'awareness', 'engagement', 'lead', 'trial', 'parent_edu', 'trust'];
  const types = ['tip', 'question', 'myth', 'carousel', 'parent_problem', 'faq', 'student_problem', 'poll', 'feature', 'daily_challenge'];
  const out: (DraftInput & { planned_date: string; draft: Draft })[] = [];
  for (let d = 0; d < o.days; d++) {
    const date = socialAddDays(o.start, d); const platform = PLATFORMS[d % PLATFORMS.length];
    const input: DraftInput = { platform, audience: aud[d % aud.length], objective: objs[d % objs.length], contentType: platform === 'linkedin' && d % 2 ? 'text' : types[d % types.length], scope: o.scope ?? 'cbse', pillar: o.pillars[d % o.pillars.length] ?? 'Learning Gaps', language: o.language ?? 'en', seed: d + 1 };
    out.push({ ...input, planned_date: date, draft: draftFull(input, o.pool) });
  }
  return out;
}
export const REPURPOSE_FORMATS: { id: string; label: string; platform: Format; contentType: string }[] = [
  { id: 'fb', label: 'Facebook post', platform: 'facebook', contentType: 'text' },
  { id: 'ig_caption', label: 'Instagram caption', platform: 'instagram', contentType: 'tip' },
  { id: 'ig_carousel', label: 'Instagram carousel', platform: 'instagram', contentType: 'carousel' },
  { id: 'reel', label: 'Reel script', platform: 'instagram', contentType: 'reel' },
  { id: 'li', label: 'LinkedIn post', platform: 'linkedin', contentType: 'text' },
  { id: 'wa', label: 'WhatsApp message', platform: 'whatsapp', contentType: 'text' },
  { id: 'email', label: 'Email', platform: 'email', contentType: 'text' },
  { id: 'blog', label: 'Blog outline', platform: 'blog', contentType: 'text' },
];
/** One idea (topic + pillar + audience) becomes one DIFFERENT, platform-styled piece per format. */
export function repurpose(o: { topic: string; pillar: string; audience: string; objective: string; scope: string; language?: string; pool?: HashtagPool }) {
  return REPURPOSE_FORMATS.map((f, k) => {
    const input: DraftInput = { platform: f.platform, audience: o.audience, objective: o.objective, contentType: f.contentType, scope: o.scope, pillar: o.pillar, topic: o.topic, language: o.language, seed: k + 3 };
    return { format: f, input, draft: draftFull(input, o.pool) };
  });
}
