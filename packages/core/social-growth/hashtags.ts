import { pick } from './templates';
export type HashtagKind = 'broad' | 'niche' | 'audience' | 'location' | 'exam' | 'product';
export type HashtagPool = Partial<Record<HashtagKind, string[]>>;
export const DEFAULT_POOL: Required<HashtagPool> = {
  broad: ['#Education', '#Learning', '#StudyTips', '#EdTech'], niche: ['#AdaptiveLearning', '#LearningGaps', '#PersonalisedLearning', '#BaselineAssessment'],
  audience: ['#CBSEParents', '#CBSEStudents', '#Tutors', '#CoachingCentres'], location: ['#India', '#IndianEducation'],
  exam: ['#CBSEClass10', '#BoardExams', '#CBSE2027', '#ExamPreparation'], product: ['#Sahayak'],
};
const COUNT: Record<string, number> = { facebook: 3, instagram: 8, linkedin: 4 };
const AUD: Record<string, string[]> = { parent: ['#CBSEParents'], cbse_parent: ['#CBSEParents'], student: ['#CBSEStudents'], cbse_student: ['#CBSEStudents'], board_learner: ['#BoardExams'], tutor: ['#Tutors'], centre: ['#CoachingCentres'], teacher: ['#Teachers'], school: ['#Schools'] };
export const cleanTag = (t: string) => { const w = String(t ?? '').replace(/[^\p{L}\p{N}_]/gu, ''); return w ? `#${w}` : ''; };
/** A few well-chosen hashtags (never a wall of them). Pass a different seed to get a different mix. */
export function makeHashtags(o: { platform: string; audience: string; scope: string; seed?: number; pool?: HashtagPool }): string[] {
  const n = COUNT[o.platform] ?? 0; if (!n) return [];
  const pool = { ...DEFAULT_POOL, ...(o.pool ?? {}) } as Required<HashtagPool>; const seed = o.seed ?? 0;
  const out: string[] = [];
  const add = (t?: string) => { const c = t ? cleanTag(t) : ''; if (c && !out.some((x) => x.toLowerCase() === c.toLowerCase()) && out.length < n) out.push(c); };
  add(pool.product[0]); (AUD[o.audience] ?? []).forEach(add);
  if (o.scope === 'cbse' || o.scope === 'exam') add(pick(pool.exam, seed, 'exam')); if (o.scope === 'india') add(pick(pool.location, seed, 'loc'));
  add(pick(pool.niche, seed, 'niche')); add(pick(pool.broad, seed, 'broad')); add(pick(pool.niche, seed + 1, 'niche2')); add(pick(pool.exam, seed + 1, 'exam2')); add(pick(pool.broad, seed + 2, 'broad2')); add(pick(pool.location, seed, 'loc2'));
  for (const k of ['broad', 'niche', 'exam'] as const) for (const t of pool[k]) add(t);
  return out;
}
