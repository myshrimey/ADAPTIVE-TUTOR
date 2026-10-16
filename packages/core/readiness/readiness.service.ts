// Board-readiness bands (master prompt sec. 23, scoped down).
//
// A band describes how well the EVIDENCE Sahayak holds supports "prepared for
// this subject" — it is not a label for the child, not a predicted mark and not
// a promise. Higher bands need more evidence, so a student can never be called
// "well prepared" on the strength of a few easy questions:
//
//   insufficient_evidence : too little assessed to say anything firm (allowed answer)
//   building              : average mastery below 50%
//   developing            : 50-69%
//   on_track              : 70-84%, and at least 40% of the syllabus assessed
//   well_prepared         : 85%+, at least 60% assessed, and at least one timed mock
//                           averaging 70%+
//
// Caps (each one is explained to the reader as a reason):
//   - timed mocks averaging 20+ points below practice mastery drop the band one level (counted once, not stacked on other caps)
//   - pilot subjects (questions not yet human-reviewed) never go above on_track

export type ReadinessBand = 'insufficient_evidence' | 'building' | 'developing' | 'on_track' | 'well_prepared';

export type ReadinessReasonCode =
  | 'too_little_assessed'
  | 'mastery_summary'
  | 'mocks_summary'
  | 'no_mock'
  | 'mock_gap'
  | 'coverage_cap'
  | 'pilot_cap';

export type ReadinessNextStep = 'finish_diagnostic' | 'more_sessions' | 'practise_weak' | 'take_mock' | 'keep_going';

export interface ReadinessReason {
  code: ReadinessReasonCode;
  params: Record<string, number>;
}

export interface ReadinessAssessment {
  band: ReadinessBand;
  reasons: ReadinessReason[];
  nextStep: ReadinessNextStep;
}

export interface ReadinessInput {
  subjectStatus: string;
  skillsAssessed: number;
  skillsTotal: number;
  coveragePercent: number;
  evidence: 'insufficient' | 'limited' | 'good';
  masteryAvgPercent: number | null;
  /** Percent scores of this subject's submitted mock exams, newest first. */
  mockPercents: number[];
}

const ORDER: ReadinessBand[] = ['building', 'developing', 'on_track', 'well_prepared'];
const RECENT_MOCKS = 3;

export function assessReadiness(input: ReadinessInput): ReadinessAssessment {
  const reasons: ReadinessReason[] = [];

  if (input.evidence === 'insufficient' || input.masteryAvgPercent === null) {
    reasons.push({ code: 'too_little_assessed', params: { assessed: input.skillsAssessed, total: input.skillsTotal } });
    return { band: 'insufficient_evidence', reasons, nextStep: input.skillsAssessed === 0 ? 'finish_diagnostic' : 'more_sessions' };
  }

  const mastery = input.masteryAvgPercent;
  reasons.push({ code: 'mastery_summary', params: { percent: Math.round(mastery) } });

  const baseIdx = mastery >= 85 ? 3 : mastery >= 70 ? 2 : mastery >= 50 ? 1 : 0;
  let idx = baseIdx;

  const mocks = input.mockPercents.slice(0, RECENT_MOCKS);
  const mockAvg = mocks.length > 0 ? mocks.reduce((a, b) => a + b, 0) / mocks.length : null;
  if (mockAvg !== null) reasons.push({ code: 'mocks_summary', params: { n: mocks.length, percent: Math.round(mockAvg) } });

  // Evidence gates for the higher bands.
  if (idx >= 2 && input.coveragePercent < 40) {
    idx = 1;
    reasons.push({ code: 'coverage_cap', params: { percent: Math.round(input.coveragePercent) } });
  }
  if (idx === 3 && (input.coveragePercent < 60 || mockAvg === null || mockAvg < 70)) {
    idx = 2;
    if (mockAvg === null) reasons.push({ code: 'no_mock', params: {} });
    else if (input.coveragePercent < 60) reasons.push({ code: 'coverage_cap', params: { percent: Math.round(input.coveragePercent) } });
  }
  // Timed mocks well below practice mastery: speed / exam conditions need work.
  if (mockAvg !== null && mockAvg < mastery - 20 && baseIdx >= 1) {
    idx = Math.min(idx, baseIdx - 1); // one level below the mastery-based level (not a second penalty on top of other caps)
    reasons.push({ code: 'mock_gap', params: { mock: Math.round(mockAvg), mastery: Math.round(mastery) } });
  }
  // Unreviewed (pilot) content: never above on_track.
  if (input.subjectStatus !== 'ready' && idx === 3) {
    idx = 2;
    reasons.push({ code: 'pilot_cap', params: {} });
  }

  const band = ORDER[idx];
  let nextStep: ReadinessNextStep;
  if (mocks.length === 0 && idx >= 1) nextStep = 'take_mock';
  else if (idx <= 1) nextStep = 'practise_weak';
  else if (band === 'well_prepared') nextStep = 'keep_going';
  else nextStep = 'practise_weak';
  return { band, reasons, nextStep };
}

/** "x of y subjects at on-track or above" — only counts subjects that have enough evidence to be banded. */
export function summariseReadiness(bands: ReadinessBand[]): { assessed: number; onTrackOrAbove: number; total: number } {
  const assessed = bands.filter((b) => b !== 'insufficient_evidence').length;
  const onTrackOrAbove = bands.filter((b) => b === 'on_track' || b === 'well_prepared').length;
  return { assessed, onTrackOrAbove, total: bands.length };
}
