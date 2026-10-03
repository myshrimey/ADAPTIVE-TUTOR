import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { GeminiProvider } from '../ai-provider/gemini.provider';
import { updateMastery } from '../mastery/mastery.service';
import { logEvent } from '../analytics/events';

export interface SessionSummary {
  whatYouLearned: string[];
  whatYouCanNowDo: string[];
  needsPractice: string[];
  nextRecommendation: { skillId: string | null; reason: string };
}

const SUMMARY_SYSTEM_PROMPT = `You write a short, encouraging end-of-session summary for a Class 10 Maths
student from structured facts you're given. Respond ONLY with JSON:
{"whatYouLearned": string[], "whatYouCanNowDo": string[], "needsPractice": string[], "closingNote": string}
Do not invent facts beyond what's given. Keep each item to one short sentence.`;

/**
 * Closes a session: recomputes final mastery for the session's skill, pulls
 * the session's question_attempts for a before/after picture, and makes ONE
 * short LLM call to phrase the structured facts in plain language — it does
 * not ask the model to invent what was learned (docs/architecture.md §14).
 */
export async function completeSession(
  supabase: SupabaseClient,
  sessionId: string,
  aiProvider: AIProvider = new GeminiProvider()
): Promise<SessionSummary> {
  const { data: session, error: sessionErr } = await supabase
    .from('learning_sessions')
    .select('id, student_id, skill_id, starting_mastery, skills(name)')
    .eq('id', sessionId)
    .single();
  if (sessionErr || !session) throw sessionErr ?? new Error('session_not_found');

  const endingMastery = await updateMastery(supabase, session.student_id, session.skill_id);
  const skillName = (session as any).skills?.name ?? 'this skill';
  const startingScore = Number(session.starting_mastery ?? 0);
  const improved = endingMastery.score > startingScore;

  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('is_correct, hints_used')
    .eq('session_id', sessionId);
  const total = attempts?.length ?? 0;
  const correct = attempts?.filter((a) => a.is_correct).length ?? 0;

  const facts = {
    skillName,
    startingMasteryScore: Math.round(startingScore),
    endingMasteryScore: Math.round(endingMastery.score),
    endingMasteryBand: endingMastery.band,
    improved,
    questionsAttempted: total,
    questionsCorrect: correct,
    readyForIndependentWork: endingMastery.band === 'strong' || endingMastery.band === 'mastered',
  };

  const nextRecommendation = await pickNextRecommendation(supabase, session.student_id, session.skill_id, endingMastery.score);

  let phrased: { whatYouLearned: string[]; whatYouCanNowDo: string[]; needsPractice: string[]; closingNote?: string };
  try {
    const completion = await aiProvider.complete({
      systemPrompt: SUMMARY_SYSTEM_PROMPT,
      userMessage: JSON.stringify(facts),
      responseFormat: 'json',
    });
    phrased = JSON.parse(completion.text);
  } catch {
    // The summary is a nice-to-have wrapper around real numbers — fall back to
    // a plain templated version rather than failing session completion.
    phrased = {
      whatYouLearned: [`Practiced ${skillName}.`],
      whatYouCanNowDo: improved ? [`${skillName} at a ${endingMastery.band.replace('_', ' ')} level.`] : [],
      needsPractice: endingMastery.score < 75 ? [skillName] : [],
    };
  }

  const summary: SessionSummary = {
    whatYouLearned: phrased.whatYouLearned ?? [],
    whatYouCanNowDo: phrased.whatYouCanNowDo ?? [],
    needsPractice: phrased.needsPractice ?? [],
    nextRecommendation,
  };

  await supabase
    .from('learning_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString(), ending_mastery: endingMastery.score, summary })
    .eq('id', sessionId);

  await logEvent({ studentId: session.student_id, sessionId, eventType: 'session_completed', payload: facts });

  return summary;
}

async function pickNextRecommendation(
  supabase: SupabaseClient,
  studentId: string,
  currentSkillId: string,
  currentScore: number
): Promise<{ skillId: string | null; reason: string }> {
  if (currentScore < 75) {
    return { skillId: currentSkillId, reason: 'More practice on this skill before moving on.' };
  }
  const { data: dependents } = await supabase.from('prerequisites').select('skill_id').eq('requires_skill_id', currentSkillId);
  const nextSkillId = dependents?.[0]?.skill_id ?? null;
  return nextSkillId
    ? { skillId: nextSkillId, reason: 'Builds directly on what was just practiced.' }
    : { skillId: null, reason: 'No further skill depends on this one yet — pick any topic to continue.' };
}
