import type { ImageSpec } from './constants';
// Review checks. They WARN; they never rewrite the founder's words. All rules are plain pattern checks (no AI), so they are a guide, not a verdict.
export type CheckLevel = 'ok' | 'warn' | 'risk';
export interface Check { id: 'safety' | 'brand' | 'claims' | 'platform' | 'grammar' | 'cta' | 'hashtags'; label: string; level: CheckLevel; notes: string[] }
export const PLATFORM_RULES: Record<string, { maxChars: number; goodChars: number; maxTags: number; goodTags: number }> = {
  facebook: { maxChars: 63000, goodChars: 600, maxTags: 10, goodTags: 3 },
  instagram: { maxChars: 2200, goodChars: 1500, maxTags: 30, goodTags: 10 },
  linkedin: { maxChars: 3000, goodChars: 1800, maxTags: 10, goodTags: 5 },
  whatsapp: { maxChars: 1000, goodChars: 400, maxTags: 0, goodTags: 0 },
  email: { maxChars: 5000, goodChars: 1500, maxTags: 0, goodTags: 0 },
  blog: { maxChars: 20000, goodChars: 3000, maxTags: 0, goodTags: 0 },
};
const GUARANTEE = /\b(guarantee[sd]?|guaranteed|100\s?%|assured (?:marks|success|rank|admission)|sure[- ]shot|will (?:definitely|certainly) (?:score|pass|topper?))\b/i;
const SUPERLATIVE = /\b(best (?:ai )?(?:tutor|app|platform)[^.]*india|no\.?\s?1\b|number[- ]?(?:one|1)\b|#1\b|india'?s (?:best|first|only|no)|top[- ]rated|world[- ]class)\b/i;
const RANK = /\b(rank|topper|toppers|admission guaranteed)\b/i;
const PERCENT = /\b\d{1,3}\s?%/;
const TESTIMONIAL = /\b(my (?:son|daughter|child|student)|one of our students|a student of ours|our students? (?:scored|improved|got)|parents? (?:say|said|told))\b/i;
const PARTNER = /\b(partnered with|in partnership with|endorsed by|recommended by|approved by (?:cbse|ncert|government))\b/i;
const PHONE = /(?:\+?91[-\s]?)?\b[6-9]\d{9}\b/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const AADHAAR = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
const PRESSURE = /\b(you will fail|your parents will be (?:disappointed|ashamed)|everyone else is ahead|last chance|only today|hurry,? before|don'?t be left behind|fail your parents)\b/i;
const BRAND_WORDS = /\b(sahayak|baseline|starting point|learning gap|adaptive|practice|progress|evidence|exam|cbse|parent|tutor)\b/i;

export interface ReviewInput { platform: string; body: string; hook?: string | null; cta?: string | null; hashtags?: string[]; image?: ImageSpec | null; isTestimonial?: boolean }
const lvl = (n: string[], risk = false): CheckLevel => (n.length === 0 ? 'ok' : risk ? 'risk' : 'warn');

export function runChecks(c: ReviewInput): Check[] {
  const text = [c.hook, c.body, c.cta].filter(Boolean).join('\n');
  const tags = c.hashtags ?? [];
  const safety: string[] = [], safetyRisk: string[] = [];
  if (PHONE.test(text)) safetyRisk.push('A phone number is in the text. Remove personal contact details.');
  if (EMAIL.test(text)) safetyRisk.push('An email address is in the text. Remove it unless it is Sahayak\'s own public address.');
  if (AADHAAR.test(text)) safetyRisk.push('A 12-digit number that looks like an ID number is in the text.');
  if (PRESSURE.test(text)) safety.push('Pressure or fear wording aimed at children or parents ("last chance", "you will fail"). Soften it.');
  if (c.isTestimonial) safety.push('This is a testimonial: use only a real one you have permission to share, in the person\'s own words, without a surname, school or photo unless they agreed.');
  safety.push('Read once for anything unfair or hurtful to a group. This cannot be checked automatically.');
  const claims: string[] = [], claimRisk: string[] = [];
  if (GUARANTEE.test(text)) claimRisk.push('Promises a result ("guaranteed", "100%"). Sahayak cannot promise marks, rank or admission.');
  if (SUPERLATIVE.test(text)) claimRisk.push('"Best", "number one" or similar. This cannot be proven; remove it.');
  if (RANK.test(text)) claims.push('Mentions rank / topper. Only keep it if it is a real, documented fact.');
  if (PERCENT.test(text)) claims.push('Contains a percentage. Use it only if it is a real figure you can show.');
  if (TESTIMONIAL.test(text) && !c.isTestimonial) claims.push('Sounds like a real student or parent story. Only keep it if it really happened and you have permission.');
  if (PARTNER.test(text)) claims.push('Mentions a partnership or endorsement. Only keep it if it is real and written down.');
  const brand: string[] = [];
  if (!BRAND_WORDS.test(text)) brand.push('Does not mention what Sahayak stands for (starting point, learning gaps, practice, progress).');
  if (/\b(AI|artificial intelligence)\b/.test(text) && /\b(replace[sd]? (?:teachers?|tutors?))\b/i.test(text)) brand.push('Says AI replaces teachers or tutors. Sahayak supports them.');
  const rule = PLATFORM_RULES[c.platform];
  const platform: string[] = [];
  if (rule) {
    const n = (c.body ?? '').length + (c.hashtags?.length ? c.hashtags.join(' ').length + 2 : 0);
    if (n > rule.maxChars) platform.push(`Too long for ${c.platform} (${n} of ${rule.maxChars} characters).`);
    else if (n > rule.goodChars) platform.push(`Long for ${c.platform} (${n} characters). Shorter posts are read more.`);
    if (!c.body.trim()) platform.push('No text yet.');
    if (c.platform === 'instagram' && !c.image) platform.push('Instagram needs a picture or video: use the image prompt below.');
  }
  const grammar: string[] = [];
  if (/ {2,}/.test(c.body)) grammar.push('Double spaces.');
  if (/\b(\w+)\s+\1\b/i.test(c.body)) grammar.push('A word is repeated twice in a row.');
  if (c.body.trim() && !/[.!?)"'…।]$/.test(c.body.trim().split('\n').filter((l) => !l.trim().startsWith('#')).pop()?.trim() ?? '')) grammar.push('The text does not end with a full stop or question mark.');
  if (/^[a-z]/.test(c.body.trim())) grammar.push('Starts with a small letter.');
  const cta: string[] = [];
  if (!String(c.cta ?? '').trim()) cta.push('No call to action. Tell people the one thing to do next.');
  else if (String(c.cta).length > 140) cta.push('The call to action is long. One short line works best.');
  else if (!/\b(visit|try|take|start|join|read|share|comment|follow|book|ask|message|dm|reply|check|see|learn|save|tell|send|register|sign)\b/i.test(String(c.cta))) cta.push('The call to action has no action word (try, take, join, share...).');
  const tagN: string[] = [];
  if (rule) {
    if (tags.length > rule.maxTags) tagN.push(`${tags.length} hashtags is too many for ${c.platform} (keep it under ${rule.maxTags}).`);
    else if (tags.length > rule.goodTags + 2) tagN.push(`${tags.length} hashtags looks spammy. About ${rule.goodTags} works better.`);
  }
  if (tags.some((t) => !/^#[\p{L}\p{N}_]+$/u.test(t))) tagN.push('A hashtag has a space or symbol in it.');
  if (new Set(tags.map((t) => t.toLowerCase())).size !== tags.length) tagN.push('A hashtag is repeated.');
  const safeLevel: CheckLevel = safetyRisk.length ? 'risk' : safety.filter((s) => !s.startsWith('Read once')).length ? 'warn' : 'ok';
  return [
    { id: 'safety', label: 'Content safety', level: safeLevel, notes: [...safetyRisk, ...safety] },
    { id: 'brand', label: 'Brand', level: lvl(brand), notes: brand },
    { id: 'claims', label: 'Unsupported claims', level: claimRisk.length ? 'risk' : lvl(claims), notes: [...claimRisk, ...claims] },
    { id: 'platform', label: 'Platform fit', level: lvl(platform), notes: platform },
    { id: 'grammar', label: 'Grammar (basic)', level: lvl(grammar), notes: grammar },
    { id: 'cta', label: 'Call to action', level: lvl(cta), notes: cta },
    { id: 'hashtags', label: 'Hashtags', level: lvl(tagN), notes: tagN },
  ];
}
export const hasWarnings = (cs: Check[]) => cs.some((c) => c.level !== 'ok');
export const hasRisk = (cs: Check[]) => cs.some((c) => c.level === 'risk');

export interface Quality { score: number; label: string; parts: { relevance: number; clarity: number; platformFit: number; cta: number; brandFit: number; claimSafety: number } }
/** A rough guide from the checks above. Labelled "AI-assisted" only when AI wrote the text; it is never presented as truth. */
export function socialQuality(c: ReviewInput & { topic?: string | null; source?: string }): Quality {
  const cs = runChecks(c); const by = (id: string) => cs.find((x) => x.id === id)!;
  const pts = (k: string, ok = 100, warn = 60, risk = 20) => { const l = by(k).level; return l === 'ok' ? ok : l === 'warn' ? warn : risk; };
  const words = c.body.split(/\s+/).filter(Boolean); const sentences = Math.max(1, c.body.split(/[.!?\n]+/).filter((s) => s.trim()).length);
  const avg = words.length / sentences;
  const topicWords = String(c.topic ?? '').toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const hit = topicWords.length ? topicWords.filter((w) => c.body.toLowerCase().includes(w)).length / topicWords.length : 0.7;
  const parts = {
    relevance: Math.round(40 + 60 * hit),
    clarity: avg <= 18 ? 100 : avg <= 26 ? 75 : 45,
    platformFit: pts('platform'), cta: pts('cta'), brandFit: pts('brand'), claimSafety: Math.min(pts('claims'), pts('safety', 100, 70, 20)),
  };
  const score = Math.round(Object.values(parts).reduce((a, b) => a + b, 0) / 6);
  return { score, label: c.source === 'ai' ? 'AI-assisted quality check' : 'Automatic quality check (rule-based)', parts };
}
