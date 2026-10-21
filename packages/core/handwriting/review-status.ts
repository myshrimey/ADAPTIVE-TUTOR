// Review statuses for handwritten evaluation, and the stages a paper goes through.
// Per answer: AI_EVALUATED (AI marked, confident) / HUMAN_REVIEW_REQUIRED (waiting for a teacher, or unreadable) / HUMAN_REVIEWED (teacher marked).
// Per paper: the above rolled up, plus FAILED (the evaluation could not finish) and REPROCESSING (being run again).

export const REVIEW_STATUSES = ['AI_EVALUATED', 'HUMAN_REVIEW_REQUIRED', 'HUMAN_REVIEWED', 'FAILED', 'REPROCESSING'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function reviewStatusForAnswer(status: string): ReviewStatus {
  if (status === 'ai_marked') return 'AI_EVALUATED';
  if (status === 'teacher_done') return 'HUMAN_REVIEWED';
  return 'HUMAN_REVIEW_REQUIRED'; // needs_teacher or unreadable
}

/** Paper-level status from its answers. Any answer still waiting for a person makes the paper HUMAN_REVIEW_REQUIRED. */
export function rollUpReviewStatus(answerStatuses: string[]): ReviewStatus | null {
  if (!answerStatuses.length) return null;
  const s = answerStatuses.map(reviewStatusForAnswer);
  if (s.includes('HUMAN_REVIEW_REQUIRED')) return 'HUMAN_REVIEW_REQUIRED';
  if (s.every((x) => x === 'HUMAN_REVIEWED')) return 'HUMAN_REVIEWED';
  if (s.includes('HUMAN_REVIEWED')) return 'HUMAN_REVIEWED'; // a mix of AI-marked and teacher-checked: a person has looked at the doubtful ones
  return 'AI_EVALUATED';
}

export const REVIEW_STATUS_TEXT: Record<ReviewStatus, string> = {
  AI_EVALUATED: 'Marked by AI. Sahayak checks a sample of these with teachers.',
  HUMAN_REVIEW_REQUIRED: 'Some answers are waiting for a teacher to check them.',
  HUMAN_REVIEWED: 'A teacher has checked the answers that needed it.',
  FAILED: 'We could not finish marking this paper. Your credit was not used. Please try again.',
  REPROCESSING: 'This paper is being marked again.',
};

export type StageName = 'quality_check' | 'ai_reading_and_marking' | 'confidence_routing' | 'teacher_review';
export interface StageRecord { stage: StageName; ok: boolean; at: string; note?: string }
/** The staged pipeline, in order. Each stage is recorded so a failed run shows where it stopped. */
export function addStage(stages: StageRecord[] | null | undefined, rec: StageRecord): StageRecord[] {
  return [...(stages ?? []).filter((s) => s.stage !== rec.stage), rec].slice(-8);
}
