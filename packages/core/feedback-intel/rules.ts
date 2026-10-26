// Feedback Intelligence, pure rules (no database, no AI). Sorts a message into a kind, a feature area, a severity and a risk level,
// and groups similar messages. It reads only the words people wrote. It never guesses who they are, and it never changes the product.

export const FB_CATEGORIES = ['bug', 'wrong_answer', 'poor_question', 'bad_explanation', 'language', 'translation', 'ux', 'performance', 'feature_request', 'pricing', 'other'] as const;
export type FbCategory = (typeof FB_CATEGORIES)[number];
export const FB_CATEGORY_LABEL: Record<FbCategory, string> = {
  bug: 'Bug', wrong_answer: 'Wrong answer', poor_question: 'Poor question', bad_explanation: 'Bad explanation', language: 'Language problem',
  translation: 'Translation problem', ux: 'Design / ease of use', performance: 'Slow or failing', feature_request: 'Feature request', pricing: 'Pricing', other: 'Other',
};
export type Level = 'low' | 'medium' | 'high';

export const FB_STATUSES = ['new', 'analysed', 'proposed', 'under_review', 'approved', 'rejected', 'modified', 'deferred', 'implemented', 'verified', 'rolled_back'] as const;
export type FbStatus = (typeof FB_STATUSES)[number];
export const FB_STATUS_LABEL: Record<FbStatus, string> = {
  new: 'New', analysed: 'Analysed (by rules)', proposed: 'Proposed', under_review: 'Under review', approved: 'Approved', rejected: 'Rejected',
  modified: 'Modified', deferred: 'Deferred', implemented: 'Implemented', verified: 'Verified', rolled_back: 'Rolled back',
};

// The five buttons. Each maps to the status it sets.
export const FB_DECISIONS = {
  approve: 'approved', reject: 'rejected', modify: 'modified', investigate: 'under_review', defer: 'deferred',
} as const;
export type FbDecision = keyof typeof FB_DECISIONS;

// After approval a person can record what happened. Nothing is deployed by this system.
export const FB_FOLLOW_UP: Partial<Record<FbStatus, FbStatus[]>> = {
  approved: ['implemented', 'rejected'],
  modified: ['implemented', 'rejected', 'under_review'],
  implemented: ['verified', 'rolled_back'],
  verified: ['rolled_back'],
};
const OPEN_FOR_DECISION: FbStatus[] = ['new', 'analysed', 'proposed', 'under_review', 'deferred', 'rejected'];

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

export function normalise(s: string): string {
  return s.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const STOP = new Set('the a an and or but is are was were be been to of in on at for with it this that these those i me my we our you your they them not no do does did can could should would will just very really so as if when then than too also have has had from by about into out up there here what which who how why please sahayak app'.split(' '));
export function keywordsOf(s: string, max = 8): string[] {
  const counts = new Map<string, number>();
  for (const w of normalise(s).split(' ')) if (w.length > 2 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map((e) => e[0]);
}
export function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a); const B = new Set(b);
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function featureAreaOf(page: string | null | undefined): string {
  const p = (page ?? '').toLowerCase();
  const map: [string, string][] = [
    ['/baseline', 'diagnostic'], ['/diagnostic', 'diagnostic'], ['/mock', 'mock exam'], ['/written', 'written answers'], ['/handwrit', 'handwritten marking'],
    ['/stretch', 'challenge zone'], ['/challenge', 'challenge zone'], ['/learn', 'learning'], ['/quiz', 'quiz'], ['/session', 'quiz'], ['/plan', 'plans and pricing'],
    ['/pricing', 'plans and pricing'], ['/report', 'reports'], ['/parent', 'parent view'], ['/tutor', 'tutor view'], ['/centre', 'centre view'], ['/teacher', 'teacher area'],
    ['/dashboard', 'dashboard'], ['/profile', 'profile'], ['/onboarding', 'sign-up and onboarding'], ['/journey', 'learning path'], ['/leaderboard', 'engagement'], ['/battle', 'engagement'],
    ['/papers', 'past papers'], ['/mistakes', 'mistakes review'],
  ];
  for (const [k, v] of map) if (p.includes(k)) return v;
  return p === '' || p === '/' ? 'home page' : 'other pages';
}

export function categoryOf(message: string): FbCategory {
  const t = normalise(message);
  const hindiWord = has(t, ['hindi', 'हिंदी', 'हिन्दी']) || /[ऀ-ॿ]/.test(message);
  if (has(t, ['translat', 'अनुवाद']) || (hindiWord && has(t, ['question', 'sawal', 'prashn', 'prashna', 'makes no sense', 'does not make sense', 'dont make sense', "don't make sense", 'samajh', 'समझ']))) return 'translation';
  if (has(t, ['wrong answer', 'answer is wrong', 'answer key', 'marked wrong', 'marked it wrong', 'correct answer', 'right answer', 'incorrect answer', 'answer was wrong', 'shows wrong']) ) return 'wrong_answer';
  if (has(t, ['price', 'pricing', 'expensive', 'too costly', 'cost too', 'fees', 'fee ', 'discount', 'refund', 'payment', 'paid', 'charged', 'upi', 'rupees', 'afford'])) return 'pricing';
  if (has(t, ['explanation', 'explain', 'did not understand', "didn't understand", 'confusing explanation', 'hint'])) return 'bad_explanation';
  if (has(t, ['question is', 'question was', 'question has', 'unclear question', 'ambiguous', 'typo', 'repeated question', 'same question', 'out of syllabus', 'too easy', 'too hard', 'too difficult', 'no option', 'options are'])) return 'poor_question';
  if (has(t, ['language', 'english is', 'grammar', 'spelling', 'mixed language'])) return 'language';
  if (has(t, ['slow', 'loading', 'takes long', 'taking long', 'lag', 'freez', 'hang', 'timeout', 'time out', 'not loading'])) return 'performance';
  if (has(t, ['crash', 'error', 'bug', 'broken', 'not working', "doesn't work", 'does not work', 'stuck', 'cannot', "can't", 'cant ', 'unable', 'failed', 'blank', 'white screen', 'nothing happens', 'button'])) return 'bug';
  if (has(t, ['please add', 'should add', 'would like', 'wish', 'can you add', 'feature', 'suggest', 'it would be nice', 'want to see', 'need a', 'add a '])) return 'feature_request';
  if (has(t, ['confusing', 'hard to find', 'cannot find', 'design', 'layout', 'font', 'colour', 'color', 'small text', 'menu', 'navigate', 'mobile', 'phone screen'])) return 'ux';
  return 'other';
}

export function severityOf(message: string, rating: number | null | undefined, category: FbCategory): Level {
  const t = normalise(message);
  const urgent = has(t, ['crash', 'cannot log', "can't log", 'cannot sign', 'lost my', 'lost all', 'charged twice', 'money', 'payment failed', 'not able to', 'stuck', 'blank', 'data', 'wrong answer key', 'every time', 'always']);
  if (rating != null && rating <= 1) return urgent || category === 'bug' || category === 'wrong_answer' ? 'high' : 'medium';
  if (urgent && (category === 'bug' || category === 'performance' || category === 'pricing' || category === 'wrong_answer')) return 'high';
  if (['bug', 'wrong_answer', 'translation', 'poor_question', 'performance', 'bad_explanation'].includes(category)) return 'medium';
  return 'low';
}

// Section 28 of the prompt: how careful the review must be. Judged from the kind of change a fix would need, never from how loud the message is.
export function riskOf(category: FbCategory, area: string): Level {
  if (category === 'pricing' || area === 'plans and pricing') return 'high';
  if (area === 'diagnostic' || area === 'mock exam' || area === 'handwritten marking' || area === 'learning path') {
    return category === 'wrong_answer' || category === 'poor_question' || category === 'bug' ? 'high' : 'medium';
  }
  if (category === 'wrong_answer' || category === 'translation' || category === 'poor_question' || category === 'bad_explanation' || category === 'language') return 'medium';
  if (category === 'bug' || category === 'performance') return 'medium';
  return 'low';
}

export function causeAndAction(category: FbCategory, area: string): { cause: string; action: string } {
  const where = `the ${area}`;
  switch (category) {
    case 'translation': return { cause: 'Possible translation or content-writing problem (a guess from the words used).', action: `Have a Hindi teacher read the questions reported in ${where}; if several are wrong, review how those questions were translated.` };
    case 'wrong_answer': return { cause: 'The saved answer or its checking may be wrong for some questions.', action: `Check the answer key of the reported questions in ${where} with a teacher; mark any wrong one "rejected" in the question register.` };
    case 'poor_question': return { cause: 'Some questions may be unclear, repeated or at the wrong level.', action: `List the questions reported in ${where}; a teacher reviews them; fix or reject.` };
    case 'bad_explanation': return { cause: 'An explanation may skip a step or be too hard for the level.', action: `Review the explanations in ${where} with a teacher and simplify them.` };
    case 'language': return { cause: 'Wording or spelling in the reported place.', action: `Read the text in ${where}; correct wording; ask a Hindi teacher if it is Hindi.` };
    case 'performance': return { cause: 'The page may be slow or the AI free quota may be exhausted at busy times (not confirmed).', action: `Check AI Infrastructure for quota and failure counts and look at the logs for ${where}.` };
    case 'bug': return { cause: 'Something may not work as designed on this screen (not confirmed).', action: `Reproduce it on ${where} on a phone and a laptop; if it repeats, send the steps to the developer.` };
    case 'ux': return { cause: 'The screen may be hard to understand or to use on a phone.', action: `Watch one or two real users on ${where}; change the wording or layout only if you see the same trouble.` };
    case 'feature_request': return { cause: 'A wish, not a fault.', action: 'Keep on the list; decide only when several families ask and it helps learning.' };
    case 'pricing': return { cause: 'Price, payment or refund concern.', action: 'Read the messages; reply personally. Any change to a price needs your own decision and a check of the unit economics.' };
    default: return { cause: 'Not clear from the words.', action: 'Read the messages; reply if the person left an email.' };
  }
}

const RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };
export const maxLevel = (a: Level, b: Level): Level => (RANK[a] >= RANK[b] ? a : b);
// A group that many people report is treated as one level more serious (never beyond high).
export function clusterSeverity(worst: Level, reports: number): Level {
  if (reports >= 10 && worst === 'medium') return 'high';
  if (reports >= 10 && worst === 'low') return 'medium';
  if (reports >= 25 && worst === 'low') return 'high';
  return worst;
}

export interface FbRow { id: string; message: string; page?: string | null; rating?: number | null; created_at?: string }
export interface Analysed { id: string; category: FbCategory; area: string; severity: Level; keywords: string[]; norm: string }
export function analyse(row: FbRow): Analysed {
  const category = categoryOf(row.message);
  const area = featureAreaOf(row.page);
  return { id: row.id, category, area, severity: severityOf(row.message, row.rating, category), keywords: keywordsOf(row.message), norm: normalise(row.message) };
}

export interface OpenCluster { id: string; category: FbCategory; area: string; keywords: string[] }
// Which group does a message belong to? Same kind and same area, with enough shared words. Returns the cluster id or null (start a new group).
export function pickCluster(a: Analysed, clusters: OpenCluster[], threshold = 0.2): string | null {
  let best: { id: string; s: number } | null = null;
  for (const c of clusters) {
    if (c.category !== a.category || c.area !== a.area) continue;
    const s = similarity(a.keywords, c.keywords);
    // Short messages ("slow") share few words, so a same-kind same-area message with no better match still joins when the group is tiny.
    if (s >= threshold && (!best || s > best.s)) best = { id: c.id, s };
  }
  return best ? best.id : null;
}

export function clusterTitle(category: FbCategory, area: string): string {
  return `${FB_CATEGORY_LABEL[category]} · ${area}`;
}

// Is this transition allowed? Enforced on the server, not only by which buttons are drawn.
export function canMove(from: FbStatus, to: FbStatus): boolean {
  if (from === to) return false;
  if (OPEN_FOR_DECISION.includes(from) && (['approved', 'rejected', 'modified', 'under_review', 'deferred'] as FbStatus[]).includes(to)) return true;
  return (FB_FOLLOW_UP[from] ?? []).includes(to);
}
// High-risk groups need an explicit "I tested this" and a written note before they can be approved or marked implemented.
export function approvalProblem(risk: Level, to: FbStatus, note: string | undefined, tested: boolean | undefined): string | null {
  if (to === 'modified' && !(note ?? '').trim()) return 'Write what you changed or want changed.';
  if (to === 'rejected' && risk === 'high' && !(note ?? '').trim()) return 'Write a short reason.';
  if (risk === 'high' && (to === 'approved' || to === 'implemented')) {
    if (!(note ?? '').trim()) return 'This is a high-risk area: write a note saying what was checked.';
    if (!tested) return 'This is a high-risk area: tick "I have tested this" first.';
  }
  return null;
}
