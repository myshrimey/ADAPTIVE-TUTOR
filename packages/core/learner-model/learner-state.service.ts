import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LearnerState,
  SkillMastery,
  DetectedMisconception,
  MasteryBand,
} from './types';
import { loadCurriculum } from '../curriculum/curriculum.service';

/**
 * Hydrates a full LearnerState for a student. This is the one place that
 * assembles learner data from across mastery_states, question_attempts,
 * misconceptions, learning_sessions, learning_profiles and learning_goals —
 * every other module (pedagogy, orchestrator) reads the assembled result,
 * never these tables directly.
 *
 * Pass the session-bound client for a student loading their own state, or the
 * service client when the orchestrator is running server-side on their behalf.
 */
export async function loadLearnerState(supabase: SupabaseClient, studentId: string): Promise<LearnerState> {
  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id, display_name, grade')
    .eq('id', studentId)
    .single();
  if (studentErr || !student) throw new Error(`student_not_found: ${studentId}`);

  const { data: goal } = await supabase
    .from('learning_goals')
    .select('curriculum_id, subject_id, target_date')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('learning_profiles')
    .select('preference_evidence')
    .eq('student_id', studentId)
    .maybeSingle();

  const { data: masteryRows } = await supabase
    .from('mastery_states')
    .select('skill_id, score, band, component_scores')
    .eq('student_id', studentId);

  const masteryBySkill: Record<string, SkillMastery> = {};
  for (const row of masteryRows ?? []) {
    masteryBySkill[row.skill_id] = {
      skillId: row.skill_id,
      score: Number(row.score),
      band: row.band as MasteryBand,
      components: {
        recentAccuracy: row.component_scores?.recentAccuracy ?? 0,
        applicationPerformance: row.component_scores?.applicationPerformance ?? 0,
        consistency: row.component_scores?.consistency ?? 0,
        independentPerformance: row.component_scores?.independentPerformance ?? 0,
        retention: row.component_scores?.retention ?? 0,
      },
    };
  }

  const { data: misconceptionRows } = await supabase
    .from('misconceptions')
    .select('tag, skill_id, confidence, resolved')
    .eq('student_id', studentId)
    .order('last_seen_at', { ascending: false })
    .limit(20);

  const misconceptions: DetectedMisconception[] = (misconceptionRows ?? []).map((r) => ({
    tag: r.tag,
    skillId: r.skill_id,
    confidence: Number(r.confidence),
    resolved: r.resolved,
  }));

  const { data: recentAttempts } = await supabase
    .from('question_attempts')
    .select('is_correct, hints_used, questions(skill_id, difficulty)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10);

  const last10Attempts = (recentAttempts ?? []).map((a: any) => ({
    correct: a.is_correct,
    skillId: a.questions?.skill_id,
    difficulty: a.questions?.difficulty ?? 3,
  }));
  const rollingAccuracy = last10Attempts.length
    ? last10Attempts.filter((a) => a.correct).length / last10Attempts.length
    : 0;

  const { data: sessionRows } = await supabase
    .from('learning_sessions')
    .select('id, skill_id, started_at, starting_mastery, ending_mastery')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .limit(5);

  const sessionHistory = (sessionRows ?? []).map((s) => ({
    sessionId: s.id,
    skillId: s.skill_id,
    date: s.started_at,
    masteryDelta: (s.ending_mastery ?? s.starting_mastery ?? 0) - (s.starting_mastery ?? 0),
  }));

  // Objective resolution: MVP heuristic, refined by the pedagogy engine (Day 5).
  // If the student has no mastery data yet, point at the diagnostic. Otherwise
  // pick the lowest-mastery skill among ones they've touched; the orchestrator's
  // prerequisite check (Day 4) can still redirect this to a prerequisite repair.
  let currentObjective: LearnerState['currentObjective'];
  const curriculumId = goal?.curriculum_id;
  let curriculumBoard = 'CBSE';
  let curriculumClass = '10';
  let subjectId = '';

  if (curriculumId) {
    const { data: curriculumRow } = await supabase
      .from('curricula')
      .select('board, class')
      .eq('id', curriculumId)
      .single();
    if (curriculumRow) {
      curriculumBoard = curriculumRow.board;
      curriculumClass = curriculumRow.class;
    }
  }

  const curriculum = await loadCurriculum(supabase, curriculumBoard, curriculumClass);
  // Prefer the subject the student's active goal actually targets — a
  // curriculum can hold more than one subject (Maths and Science both live
  // under CBSE/10). Fall back to the curriculum's first subject only for
  // pre-existing goal rows created before subject_id existed on this table.
  const activeSubject = curriculum.subjects.find((s) => s.id === goal?.subject_id) ?? curriculum.subjects[0];
  subjectId = activeSubject?.id ?? '';
  const allSkills = activeSubject?.chapters.flatMap((c) => c.topics.flatMap((t) => t.skills.map((s) => ({ ...s, topicId: t.id })))) ?? [];

  if (Object.keys(masteryBySkill).length === 0) {
    const firstSkill = allSkills[0];
    currentObjective = { skillId: firstSkill?.id ?? '', topicId: firstSkill?.topicId ?? '', reason: 'diagnostic' };
  } else {
    const weakest = allSkills
      .map((s) => ({ skill: s, score: masteryBySkill[s.id]?.score ?? 0 }))
      .filter((s) => s.score < 90)
      .sort((a, b) => a.score - b.score)[0];
    currentObjective = weakest
      ? { skillId: weakest.skill.id, topicId: weakest.skill.topicId, reason: 'sequence' }
      : { skillId: allSkills[0]?.id ?? '', topicId: allSkills[0]?.topicId ?? '', reason: 'sequence' };
  }

  const gaps = allSkills
    .filter((s) => (masteryBySkill[s.id]?.score ?? 0) < 40)
    .map((s) => ({ skillId: s.id, type: 'weak' as const }));

  const evidence = profile?.preference_evidence ?? {};

  return {
    studentId: student.id,
    profile: { displayName: student.display_name, grade: student.grade ?? '' },
    goal: { curriculumId: curriculumId ?? curriculum.id, targetDate: goal?.target_date ?? undefined },
    curriculum: { board: curriculumBoard, class: curriculumClass, subjectId },
    currentObjective,
    masteryBySkill,
    gaps,
    misconceptions,
    recentPerformance: { last10Attempts, rollingAccuracy },
    hintUsage: { last5Sessions: [] }, // populated Day 3 once session-level hint counts are tracked
    difficultyResponse: {
      lastDifficultyOffered: last10Attempts[0]?.difficulty ?? 3,
      trend: rollingAccuracy > 0.8 ? 'ready_for_challenge' : rollingAccuracy < 0.5 ? 'struggling' : 'comfortable',
    },
    preferences: {
      pace: evidence.pace ?? { value: 'medium', confidence: 0, nObservations: 0 },
      exampleAffinity: evidence.exampleAffinity ?? { value: 0.5, confidence: 0, nObservations: 0 },
      hintReliance: evidence.hintReliance ?? { value: 0.5, confidence: 0, nObservations: 0 },
    },
    sessionHistory,
  };
}
