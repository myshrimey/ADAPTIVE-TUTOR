// v62: evidence, mastery estimates and error classification. Plain rules, no AI, no database.
// A wrong answer is NOT a verdict: an execution slip counts half as much as a concept miss, a guess-like answer counts
// less, and a competency with little evidence is reported as "insufficient evidence", never as weak.
export type ErrorType =
  | 'FOUNDATIONAL_GAP' | 'CONCEPTUAL_GAP' | 'PROCEDURAL_GAP' | 'CALCULATION_ERROR' | 'READING_ERROR'
  | 'INTERPRETATION_ERROR' | 'REASONING_ERROR' | 'APPLICATION_GAP' | 'CARELESS_ERROR' | 'LANGUAGE_DIFFICULTY'
  | 'QUESTION_MISREAD' | 'GUESSING' | 'UNKNOWN';

// Errors that say little about whether the idea is understood: a slip in working, a misread question, or reading the question in a language the student is less comfortable with.
export const EXECUTION_ERRORS: ErrorType[] = ['CALCULATION_ERROR', 'CARELESS_ERROR', 'READING_ERROR', 'QUESTION_MISREAD', 'LANGUAGE_DIFFICULTY'];
export const isExecutionError = (e: ErrorType | null | undefined) => !!e && EXECUTION_ERRORS.includes(e);

export interface ErrorInput {
  correct: boolean;
  partial?: number | null;
  questionType?: string;
  expected?: string;
  given?: string;
  seconds?: number | null;
  expectedSeconds?: number | null;
  hintUsed?: boolean;
  /** true when the question was shown in a language the student is less comfortable with */
  languageMismatch?: boolean;
  /** true when the wrong answer is one of the question's listed distractors that carry a misconception tag */
  distractorWithMisconception?: boolean;
}

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const t = s.replace(/,/g, '').replace(/\s+/g, '').replace('−', '-');
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return null;
  return Number(t);
};

export function classifyError(i: ErrorInput): ErrorType | null {
  if (i.correct) return null;
  if (i.languageMismatch && !i.distractorWithMisconception && (i.partial ?? 0) < 0.5) return 'LANGUAGE_DIFFICULTY';
  if ((i.partial ?? 0) >= 0.5) return 'CALCULATION_ERROR';
  const e = num(i.expected), g = num(i.given);
  if (e !== null && g !== null) {
    if (Math.abs(e) > 0 && Math.abs(g + e) < 1e-9) return 'CALCULATION_ERROR'; // sign slip
    if (e !== 0 && Math.abs(g - e) / Math.abs(e) <= 0.1) return 'CALCULATION_ERROR'; // close
    if (Math.abs(g - e) <= 1 && Math.abs(e) >= 5) return 'CALCULATION_ERROR'; // off by one
    const de = String(Math.abs(e)).replace('.', '').split('').sort().join('');
    const dg = String(Math.abs(g)).replace('.', '').split('').sort().join('');
    if (de === dg && de.length >= 2) return 'CARELESS_ERROR'; // same digits, different order
  }
  if (i.distractorWithMisconception) return 'CONCEPTUAL_GAP';
  const fast = i.seconds != null && i.expectedSeconds != null && i.expectedSeconds > 0 && i.seconds < 0.2 * i.expectedSeconds;
  if (fast && (i.questionType === 'mcq' || i.questionType === 'true_false')) return 'GUESSING';
  return 'UNKNOWN';
}

export interface EvidenceItem {
  competencyId: string;
  correct: boolean;
  partial?: number | null; // 0..1
  difficulty: number; // 1..5
  seconds?: number | null;
  expectedSeconds?: number | null;
  hintUsed?: boolean;
  errorType?: ErrorType | null;
  /** inferred from a harder correct answer rather than asked directly */
  inferred?: boolean;
  dimension?: string;
  questionType?: string;
}

/** How much one answer counts. Documented here so the number is never a mystery. */
export function evidenceStrength(e: EvidenceItem): number {
  let s = 1;
  if (e.difficulty >= 4) s += 0.25; else if (e.difficulty <= 1) s -= 0.2;
  if (e.hintUsed) s -= 0.5;
  if (e.errorType === 'GUESSING') s -= 0.6;
  if (e.errorType === 'LANGUAGE_DIFFICULTY') s -= 0.6;
  if (e.correct && e.seconds != null && e.expectedSeconds && e.seconds < 0.15 * e.expectedSeconds && (e.questionType === 'mcq' || e.questionType === 'true_false')) s -= 0.3; // very fast MCQ hit: could be a guess
  if (e.inferred) s *= 0.4;
  return Math.max(0.1, Math.round(s * 100) / 100);
}

/** 0..1 credit for one answer. Execution slips earn half credit: the idea was probably right. */
export function evidenceScore(e: EvidenceItem): number {
  if (e.correct) return e.hintUsed ? 0.8 : 1;
  if (e.partial != null && e.partial > 0) return Math.min(0.9, e.partial);
  if (isExecutionError(e.errorType ?? null)) return 0.45;
  return 0;
}

export type EvidenceConfidence = 'low' | 'medium' | 'high';
export type MasteryStatus = 'demonstrated' | 'developing' | 'requires_strengthening' | 'insufficient_evidence';
export interface CompetencyEstimate {
  competencyId: string;
  alpha: number;
  beta: number;
  mastery: number; // 0..1
  confidence: EvidenceConfidence;
  /** answers asked directly (not inferred) */
  evidenceCount: number;
  inferredCount: number;
  status: MasteryStatus;
}

export function estimateFrom(competencyId: string, items: EvidenceItem[]): CompetencyEstimate {
  let alpha = 1, beta = 1, direct = 0, inferred = 0;
  for (const it of items) {
    const w = evidenceStrength(it);
    const sc = evidenceScore(it);
    alpha += w * sc;
    beta += w * (1 - sc);
    if (it.inferred) inferred++; else direct++;
  }
  const n = alpha + beta;
  const mastery = alpha / n;
  const sd = Math.sqrt((alpha * beta) / (n * n * (n + 1)));
  const effective = n - 2;
  let confidence: EvidenceConfidence = 'low';
  if (effective >= 2.4 && sd < 0.14) confidence = 'high';
  else if (effective >= 1.2 && sd < 0.2) confidence = 'medium';
  // Status needs few words to defend: one answer is only early evidence (confidence stays low), a pair of misses is needed
  // before anything is called "requires strengthening", and a competency nobody asked about is "not enough evidence yet".
  let status: MasteryStatus;
  if (direct === 0 && inferred === 0) status = 'insufficient_evidence';
  else if (mastery >= 0.66) status = 'demonstrated';
  else if (mastery >= 0.45) status = 'developing';
  else if (effective >= 1.5) status = 'requires_strengthening';
  else status = 'insufficient_evidence';
  return { competencyId, alpha, beta, mastery: Math.round(mastery * 1000) / 1000, confidence, evidenceCount: direct, inferredCount: inferred, status };
}

export function estimateAll(items: EvidenceItem[]): Map<string, CompetencyEstimate> {
  const by = new Map<string, EvidenceItem[]>();
  for (const it of items) { const a = by.get(it.competencyId) ?? []; a.push(it); by.set(it.competencyId, a); }
  const out = new Map<string, CompetencyEstimate>();
  for (const [id, arr] of by) out.set(id, estimateFrom(id, arr));
  return out;
}

export const CONFIDENCE_WORDS: Record<EvidenceConfidence, string> = { low: 'low (little evidence so far)', medium: 'medium', high: 'high' };
export const STATUS_WORDS: Record<MasteryStatus, string> = {
  demonstrated: 'demonstrated',
  developing: 'developing',
  requires_strengthening: 'requires strengthening',
  insufficient_evidence: 'not enough evidence yet',
};
