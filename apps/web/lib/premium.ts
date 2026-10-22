import type { SupabaseClient } from '@supabase/supabase-js';
import { buildParentReport, loadWeakSkills, composeStudyPlan, composeRescue, composeProgramme, composeTwoBoardReadiness, composeTwoBoardProgramme, loadSettings, type Feature } from '@adaptive-tutor/core';
import { createServiceClient } from '@/lib/supabase-server';

export async function loadPremiumData(client: SupabaseClient, studentId: string, lang: 'en' | 'hi' = 'en') {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const service = createServiceClient();
  const [report, weak, { data: profile }, { count }, settings] = await Promise.all([
    buildParentReport(client, studentId),
    loadWeakSkills(client, studentId),
    client.from('learning_profiles').select('daily_study_minutes').eq('student_id', studentId).maybeSingle(),
    client.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('started_at', since),
    loadSettings(service),
  ]);
  const dailyMinutes = profile?.daily_study_minutes ?? null;
  const subjects = report.subjects.map((s) => ({ subjectId: s.subjectId, name: s.subjectName, priority: s.priority, hasBaseline: s.hasBaseline, coveragePercent: s.coveragePercent, mockCount: s.mockCount, weakSkills: weak.get(s.subjectId) ?? [] }));
  // Exam dates are the founder's to enter (setting "boards"). Until then the programme covers the next 12 weeks and says so.
  const b1 = settings.boards.board1_date;
  const datesSet = !!b1;
  const examStart = b1 ?? new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10);
  const plan = composeStudyPlan({ today: new Date(), examStart, dailyMinutes, sessionsLast14Days: count ?? 0, lang, subjects });
  const planSubjects = subjects;
  // Board 2 plan: starts when Board 1 is over (or today if that date has passed) and runs to Board 2. Only built when both dates are entered.
  const b2 = settings.boards.board2_date;
  const b1Day = b1 ? new Date(`${b1}T00:00:00+05:30`) : null;
  const plan2 = b1 && b2 ? composeStudyPlan({ today: b1Day && b1Day.getTime() > Date.now() ? b1Day : new Date(), examStart: b2, dailyMinutes, sessionsLast14Days: count ?? 0, lang, subjects: planSubjects }) : null;
  const twoBoard = composeTwoBoardReadiness({
    boards: settings.boards,
    subjects: report.subjects.map((s) => ({ subjectId: s.subjectId, name: s.subjectName, band: s.readiness.band, coveragePercent: s.coveragePercent, hasBaseline: s.hasBaseline, priority: s.priority, weakSkillCount: (weak.get(s.subjectId) ?? []).length, mockCount: s.mockCount, latestMockPercent: s.latestMockPercent ?? null })),
  });
  const twoProgramme = composeTwoBoardProgramme({ name: settings.boards.programme_name, planBoard1: plan, planBoard2: plan2, boards: settings.boards });
  return { report, weak, plan, dailyMinutes, settings, datesSet, subjects, twoBoard, twoProgramme, programme: composeProgramme(plan, { datesSet }), rescue: (days: number) => composeRescue({ subjects, days, dailyMinutes }) };
}

export const FEATURE_COPY: Record<'board_readiness' | 'exam_rescue' | 'board_preparation_programme', { title: string; body: string; bullets: string[]; wtp: string; event: string }> = {
  board_readiness: { title: 'Board Readiness report', body: 'A detailed, subject-by-subject view of how ready the evidence says your child is, and what to work on first.', bullets: ['Readiness band for every subject, with the reasons', 'Weakest skills and the likely causes seen in wrong answers', 'Mocks taken, coverage and what is still unassessed', 'A clear next step per subject'], wtp: 'board_readiness', event: 'readiness_offer_viewed' },
  exam_rescue: { title: 'Exam Rescue sprint', body: 'A short, day-by-day sprint on the weakest and most foundational skills, for the weeks before an exam.', bullets: ['7 or 14 days of focused tasks', 'Repairs the base skill before the weak one', 'Review days and a timed mixed check at the end'], wtp: '', event: 'upgrade_clicked' },
  board_preparation_programme: { title: 'Board Preparation Programme', body: 'A week-by-week programme that targets the weak areas and rebuilds itself from every checkpoint.', bullets: ['Week-by-week tasks for every subject', 'A checkpoint every fortnight', 'More timed practice as the exam gets closer'], wtp: '', event: 'upgrade_clicked' },
};
export type PremiumFeature = keyof typeof FEATURE_COPY & Feature;
