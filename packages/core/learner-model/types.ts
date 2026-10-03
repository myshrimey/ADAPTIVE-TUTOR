// The LearnerState contract. This is the single structure every other module
// (curriculum, pedagogy, orchestrator, mastery) reads from or writes to.
// Implementation (learner-state.service.ts, hydrating this from Supabase) is Day 2.

export type MasteryBand = 'needs_foundation' | 'emerging' | 'developing' | 'strong' | 'mastered';

export interface MasteryComponents {
  recentAccuracy: number;
  applicationPerformance: number;
  consistency: number;
  independentPerformance: number;
  retention: number;
}

export interface SkillMastery {
  skillId: string;
  score: number; // 0-100
  band: MasteryBand;
  components: MasteryComponents;
}

export type MisconceptionTag =
  | 'SIGN_ERROR'
  | 'ALGEBRAIC_MANIPULATION'
  | 'FORMULA_MISUSE'
  | 'CONCEPT_CONFUSION'
  | 'PROCEDURAL_ERROR'
  | 'ARITHMETIC_ERROR'
  | 'PREREQUISITE_GAP'
  | 'INCOMPLETE_REASONING';

export interface DetectedMisconception {
  tag: MisconceptionTag;
  skillId: string;
  confidence: number;
  resolved: boolean;
}

/**
 * Evidence-based preference field. NEVER a fixed personality label — always
 * {value, confidence} updated from observable signals (time-to-answer, hint
 * requests, retry behavior). Never inferred from tone or sentiment.
 */
export interface EvidenceField<T> {
  value: T;
  confidence: number; // 0-1
  nObservations: number;
}

export interface LearnerState {
  studentId: string;
  profile: {
    displayName: string;
    grade: string;
  };
  goal: {
    curriculumId: string;
    targetDate?: string;
  };
  curriculum: {
    board: string;
    class: string;
    subjectId: string;
  };
  currentObjective: {
    skillId: string;
    topicId: string;
    reason: 'diagnostic' | 'sequence' | 'remediation' | 'student_choice';
  };
  masteryBySkill: Record<string, SkillMastery>;
  gaps: Array<{ skillId: string; type: 'prerequisite' | 'weak' }>;
  misconceptions: DetectedMisconception[];
  recentPerformance: {
    last10Attempts: Array<{ correct: boolean; skillId: string; difficulty: number }>;
    rollingAccuracy: number;
  };
  hintUsage: { last5Sessions: number[] };
  difficultyResponse: {
    lastDifficultyOffered: number;
    trend: 'struggling' | 'comfortable' | 'ready_for_challenge';
  };
  preferences: {
    pace: EvidenceField<'slow' | 'medium' | 'fast'>;
    exampleAffinity: EvidenceField<number>;
    hintReliance: EvidenceField<number>;
  };
  sessionHistory: Array<{ sessionId: string; skillId: string; date: string; masteryDelta: number }>;
}

