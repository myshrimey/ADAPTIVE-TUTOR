// v63: database layer of the Challenge zone. Server-only (service client). The answer key never leaves this file:
// the student view has no expected answer. Stretch answers write ONLY stretch_attempts (+ badges through the engagement engine);
// they never touch mastery_states, competency mastery, readiness or any mark.
import type { SupabaseClient } from '@supabase/supabase-js';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { inputKindOf, validateAnswer, type InputKind } from '../answers/input';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { validateGeneratedQuestion, verifyGeneratedQuestion, type GeneratedQuestion } from '../question-engine/ai-question-generator';
import { cleanStretchSettings, deriveLevel, isSkillUnlocked, isStretchStyle, STRETCH_STYLES, STYLE_LABEL, STYLE_NOTE, stretchFeedbackLine, stretchMetrics, type StretchMetrics, type StretchSettings, type StretchStyle } from './levels';

export const STRETCH_SETTING_KEY = 'stretch';
export async function loadStretchSettings(service: SupabaseClient): Promise<StretchSettings> {
  const { data } = await service.from('commerce_settings').select('value').eq('key', STRETCH_SETTING_KEY).maybeSingle();
  return cleanStretchSettings((data as any)?.value);
}
export async function saveStretchSettings(service: SupabaseClient, raw: any): Promise<StretchSettings> {
  const v = cleanStretchSettings(raw);
  const { error } = await service.from('commerce_settings').upsert({ key: STRETCH_SETTING_KEY, value: v, note: 'v63 Challenge zone settings' }, { onConflict: 'key' });
  if (error) throw new Error('Could not save the Challenge zone settings.');
  return v;
}

export interface UnlockedSkill { skillId: string; skillName: string; subjectId: string; subjectName: string; level: number; solved: number; attempted: number }
/** Skills where the student has shown strong command, with the student's current stretch level for each. */
export async function unlockedSkills(service: SupabaseClient, studentId: string, settings?: StretchSettings): Promise<UnlockedSkill[]> {
  const st = settings ?? await loadStretchSettings(service);
  const ok = new Set<string>();
  const { data: ms } = await service.from('mastery_states').select('skill_id, score').eq('student_id', studentId).limit(3000);
  for (const r of (ms ?? []) as any[]) if (isSkillUnlocked({ masteryScore: Number(r.score) }, st.unlockScore)) ok.add(r.skill_id);
  try {
    const { data: cm } = await service.from('student_competency_mastery').select('competency_id, status, evidence_count, competencies(skill_id)').eq('student_id', studentId).eq('status', 'demonstrated').limit(3000);
    for (const r of (cm ?? []) as any[]) { const sid = r.competencies?.skill_id; if (sid && isSkillUnlocked({ competencyStatus: r.status, evidenceCount: r.evidence_count }, st.unlockScore)) ok.add(sid); }
  } catch { /* competency evidence is a bonus path to unlock */ }
  const ids = [...ok]; if (!ids.length) return [];
  const info = new Map<string, { name: string; subjectId: string; subjectName: string }>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await service.from('skills').select('id, name, retired, topics(chapters(subject_id, subjects(name)))').in('id', ids.slice(i, i + 100));
    for (const s of (data ?? []) as any[]) { if (s.retired) continue; const ch = s.topics?.chapters; if (ch?.subject_id) info.set(s.id, { name: s.name, subjectId: ch.subject_id, subjectName: ch.subjects?.name ?? 'Subject' }); }
  }
  const { data: att } = await service.from('stretch_attempts').select('skill_id, correct, answered_at').eq('student_id', studentId).order('answered_at', { ascending: true }).limit(5000);
  const by = new Map<string, boolean[]>();
  for (const a of (att ?? []) as any[]) { const l = by.get(a.skill_id) ?? []; l.push(!!a.correct); by.set(a.skill_id, l); }
  const out: UnlockedSkill[] = [];
  for (const id of ids) { const i = info.get(id); if (!i) continue; const answers = by.get(id) ?? []; out.push({ skillId: id, skillName: i.name, subjectId: i.subjectId, subjectName: i.subjectName, level: deriveLevel(answers, st), solved: answers.filter(Boolean).length, attempted: answers.length }); }
  return out.sort((a, b) => a.subjectName.localeCompare(b.subjectName) || a.skillName.localeCompare(b.skillName));
}

export interface StretchQuestionView { id: string; skillId: string; skillName: string; subjectName: string; prompt: string; questionType: string; options: string[] | null; inputKind: InputKind; level: number; style: StretchStyle | null; styleLabel: string; figureUrl: string | null; figureCaption: string | null; checkedByTeacher: boolean; todayCount: number; dailyLimit: number }
export interface NextResult { question: StretchQuestionView | null; reason?: 'locked' | 'none_yet' | 'daily_limit' | 'off'; message?: string }

async function answeredIds(service: SupabaseClient, studentId: string): Promise<Set<string>> {
  const { data } = await service.from('stretch_attempts').select('question_id').eq('student_id', studentId).limit(10000);
  return new Set(((data ?? []) as any[]).map((r) => r.question_id));
}
async function todayCount(service: SupabaseClient, studentId: string): Promise<number> {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await service.from('stretch_attempts').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('answered_at', since.toISOString());
  return count ?? 0;
}
const toView = (r: any, sk: UnlockedSkill, level: number, settings: StretchSettings, today: number): StretchQuestionView => ({
  id: r.id, skillId: sk.skillId, skillName: sk.skillName, subjectName: sk.subjectName, prompt: r.prompt, questionType: r.question_type, options: r.options ?? null,
  inputKind: inputKindOf(r.question_type, r.expected_answer), level: r.stretch_level ?? level, style: isStretchStyle(r.exam_style) ? r.exam_style : null,
  styleLabel: isStretchStyle(r.exam_style) ? STYLE_LABEL[r.exam_style as StretchStyle] : STYLE_LABEL.general_challenge,
  figureUrl: r.figure_url ?? null, figureCaption: r.figure_caption ?? null, checkedByTeacher: r.content_status === 'verified', todayCount: today, dailyLimit: settings.dailyLimit,
});

/** Next unseen stretch question for an unlocked skill (the student's own level, else the nearest). AI may write one on the spot when the bank has none. */
export async function nextStretchQuestion(service: SupabaseClient, studentId: string, o: { skillId?: string; subjectId?: string; style?: string } = {}, ai?: AIProvider): Promise<NextResult> {
  const settings = await loadStretchSettings(service);
  if (!settings.enabled) return { question: null, reason: 'off', message: 'The Challenge zone is switched off for now.' };
  const skills = (await unlockedSkills(service, studentId, settings)).filter((s) => (!o.skillId || s.skillId === o.skillId) && (!o.subjectId || s.subjectId === o.subjectId));
  if (!skills.length) return { question: null, reason: 'locked', message: 'The Challenge zone opens for a topic once you have shown strong command of it in a quiz, lesson or check. Keep going — it will open for you.' };
  const today = await todayCount(service, studentId);
  if (today >= settings.dailyLimit) return { question: null, reason: 'daily_limit', message: 'That is plenty of hard questions for today. Rest, and come back tomorrow.' };
  const seen = await answeredIds(service, studentId);
  const style = isStretchStyle(o.style) ? o.style : null;
  // Prefer the skill with the fewest attempts, so a student spreads across topics.
  const order = [...skills].sort((a, b) => a.attempted - b.attempted);
  for (const sk of order) {
    let q = service.from('questions').select('id, prompt, question_type, options, expected_answer, stretch_level, exam_style, figure_url, figure_caption, content_status').eq('skill_id', sk.skillId).eq('tier', 'stretch').neq('content_status', 'rejected').limit(300);
    if (!settings.allowUnreviewed) q = q.eq('content_status', 'verified');
    if (style) q = q.eq('exam_style', style);
    const { data } = await q;
    const rows = ((data ?? []) as any[]).filter((r) => !seen.has(r.id));
    if (rows.length) {
      const best = Math.min(...rows.map((r) => Math.abs((r.stretch_level ?? 1) - sk.level)));
      const near = rows.filter((r) => Math.abs((r.stretch_level ?? 1) - sk.level) === best);
      return { question: toView(near[Math.floor(Math.random() * near.length)], sk, sk.level, settings, today) };
    }
  }
  if (ai) {
    const sk = order[0];
    const made = await generateStretchQuestions(service, ai, { skillId: sk.skillId, style: style ?? undefined, level: sk.level, count: 1, budgetMs: 30_000, role: 'system' });
    if (made.made > 0) return nextStretchQuestion(service, studentId, o, undefined);
  }
  return { question: null, reason: 'none_yet', message: 'New challenge questions for this topic are being prepared. Please try again a little later.' };
}

export interface StretchFeedback { correct: boolean; correctAnswer: string; explanation: string | null; line: string; level: number; newLevel: number; formatProblem?: string; unlocked: Array<{ code: string; title: string; description: string }> }
export async function answerStretch(service: SupabaseClient, studentId: string, questionId: string, answer: unknown, seconds: number | null, afterAnswer?: () => Promise<Array<{ code: string; title: string; description: string }>>): Promise<StretchFeedback> {
  const settings = await loadStretchSettings(service);
  if (!settings.enabled) throw new Error('The Challenge zone is switched off for now.');
  const { data: q } = await service.from('questions').select('id, skill_id, tier, prompt, question_type, expected_answer, explanation, stretch_level, exam_style').eq('id', questionId).maybeSingle();
  const row: any = q;
  if (!row || row.tier !== 'stretch') throw new Error('That is not a Challenge question.');
  const sk = (await unlockedSkills(service, studentId, settings)).find((s) => s.skillId === row.skill_id);
  if (!sk) throw new Error('This topic is not open in your Challenge zone yet.');
  const done = await answeredIds(service, studentId);
  if (done.has(questionId)) throw new Error('You have already answered this question.');
  const kind = inputKindOf(row.question_type, row.expected_answer);
  const text = extractString(answer);
  const problem = kind === 'choice' ? null : validateAnswer(kind, text);
  if (problem) return { correct: false, correctAnswer: '', explanation: null, line: '', level: sk.level, newLevel: sk.level, formatProblem: problem, unlocked: [] };
  const correct = gradeAnswer(row.expected_answer, answer);
  const sec = seconds != null && Number.isFinite(Number(seconds)) ? Math.max(0, Math.min(3600, Math.round(Number(seconds)))) : null;
  const { data: subj } = await service.from('skills').select('topics(chapters(subject_id))').eq('id', row.skill_id).maybeSingle();
  const subjectId = (subj as any)?.topics?.chapters?.subject_id ?? sk.subjectId;
  const { error } = await service.from('stretch_attempts').insert({ student_id: studentId, question_id: questionId, skill_id: row.skill_id, subject_id: subjectId, exam_style: row.exam_style ?? null, stretch_level: row.stretch_level ?? sk.level, correct, seconds: sec });
  if (error) throw new Error('You have already answered this question.');
  const after = (await unlockedSkills(service, studentId, settings)).find((s) => s.skillId === row.skill_id);
  const newLevel = after?.level ?? sk.level;
  let unlocked: Array<{ code: string; title: string; description: string }> = [];
  if (afterAnswer) { try { unlocked = await afterAnswer(); } catch { /* badges never block an answer */ } }
  const exp = row.expected_answer; const correctAnswer = extractString(typeof exp === 'object' && exp && 'value' in exp ? (exp as any).value : exp);
  return { correct, correctAnswer, explanation: row.explanation ?? null, line: stretchFeedbackLine(correct, row.stretch_level ?? sk.level), level: sk.level, newLevel, unlocked };
}

/** Counts for the student's own page and for linked adults (counts only; never a rank or a label). */
export async function stretchSummary(service: SupabaseClient, studentId: string): Promise<{ metrics: StretchMetrics; attempted: number; skills: UnlockedSkill[]; badges: Array<{ code: string; title: string; description: string; unlocked: boolean }> }> {
  const { data } = await service.from('stretch_attempts').select('correct, stretch_level, exam_style, subject_id').eq('student_id', studentId).order('answered_at', { ascending: true }).limit(5000);
  const rows = (data ?? []) as any[];
  const [skills, defs, have] = await Promise.all([
    unlockedSkills(service, studentId),
    service.from('achievements').select('code, title, description, sort, active').like('code', 'stretch_%').order('sort'),
    service.from('student_achievements').select('code').eq('student_id', studentId).like('code', 'stretch_%'),
  ]);
  const got = new Set(((have.data ?? []) as any[]).map((r) => r.code));
  return { metrics: stretchMetrics(rows), attempted: rows.length, skills, badges: ((defs.data ?? []) as any[]).filter((d) => d.active !== false).map((d) => ({ code: d.code, title: d.title, description: d.description, unlocked: got.has(d.code) })) };
}
/** Metrics for the achievement engine (oldest first). */
export async function stretchMetricsFor(service: SupabaseClient, studentId: string): Promise<StretchMetrics> {
  const { data } = await service.from('stretch_attempts').select('correct, stretch_level, exam_style, subject_id').eq('student_id', studentId).order('answered_at', { ascending: true }).limit(5000);
  return stretchMetrics((data ?? []) as any[]);
}

// ---------------------------------------------------------------- writing stretch questions ----------------------
const STYLE_BRIEF: Record<StretchStyle, string> = {
  olympiad: 'a school-olympiad problem that rewards insight over routine (multi-step reasoning, a clever observation)',
  ntse: 'an NTSE (Stage 2) style mental-ability / scholastic-aptitude problem built on Class 10 content',
  ioqm: 'a Maths-Olympiad (IOQM) style problem with a single exact numerical answer',
  jee_foundation: 'a JEE-foundation style problem that combines two ideas from the topic and needs careful algebra or physics reasoning',
  neet_foundation: 'a NEET-foundation style problem testing deep conceptual understanding of the topic',
  general_challenge: 'a hard, multi-step problem on the topic that goes beyond the textbook exercise',
};
const LEVEL_BRIEF: Record<number, string> = { 1: 'level 1 (bridge): slightly beyond the board exam, one extra idea', 2: 'level 2 (challenge): clearly olympiad-grade, two or three ideas combined', 3: 'level 3 (summit): very hard, needs a non-obvious insight' };
const STRETCH_SYSTEM = `You write ONE original challenge question for a very strong CBSE Class 10 student. Respond ONLY with JSON, no prose, no markdown fences:
{"prompt": string, "questionType": "mcq"|"short_answer"|"numeric"|"step", "options": string[]|null, "expectedAnswer": {"value": string}, "explanation": string}.
Rules:
- The question is ORIGINAL, written in the STYLE of the named exam. Never copy or closely paraphrase a real past paper question, and never claim it came from one.
- It uses only ideas a Class 10 student has met (the named topic and earlier classes); the difficulty comes from reasoning, not from out-of-syllabus facts.
- Exactly one unambiguous correct answer, short enough to type (a number, a short expression, or a choice).
- "explanation" is a correct step-by-step solution whose last line matches expectedAnswer.value exactly. Work it out carefully first: a wrong question is worse than none.
- Wrap every equation in single dollar signs (LaTeX inside).`;

export async function generateStretchQuestions(service: SupabaseClient, ai: AIProvider, o: { skillId: string; style?: string; level?: number; count: number; budgetMs?: number; role?: 'system' | 'admin'; userId?: string | null }): Promise<{ made: number; failed: number }> {
  const started = Date.now(); const budget = o.budgetMs ?? 45_000;
  const { data: sk } = await service.from('skills').select('id, name, topics(chapters(subjects(name)))').eq('id', o.skillId).maybeSingle();
  if (!sk) throw new Error('Skill not found.');
  const skillName = (sk as any).name; const subjectName = (sk as any).topics?.chapters?.subjects?.name ?? 'the subject';
  let made = 0, failed = 0, n = 0;
  while (made < o.count && failed < 5 && Date.now() - started < budget) {
    const style: StretchStyle = isStretchStyle(o.style) ? o.style : STRETCH_STYLES[n % STRETCH_STYLES.length];
    const level = Math.min(3, Math.max(1, Math.round(o.level ?? ((n % 3) + 1)))); n++;
    try {
      const res = await ai.complete({ systemPrompt: STRETCH_SYSTEM, userMessage: `Subject: ${subjectName}\nTopic: ${skillName}\nExam style: ${style} — ${STYLE_BRIEF[style]}\nDifficulty: ${LEVEL_BRIEF[level]}`, responseFormat: 'json', feature: 'question_generation' });
      const g = JSON.parse(res.text) as GeneratedQuestion;
      const v = validateGeneratedQuestion(g);
      if (!v.valid || !(await verifyGeneratedQuestion(ai, g))) { failed++; continue; }
      const { error } = await service.from('questions').insert({ skill_id: o.skillId, difficulty: 5, tier: 'stretch', exam_style: style, stretch_level: level, question_type: g.questionType, prompt: g.prompt, options: g.options ?? null, expected_answer: g.expectedAnswer, explanation: g.explanation, source: 'generated', content_status: 'needs_review', validated: true, origin: 'ai_generated', contributed_role: o.role ?? 'system', contributed_by: o.userId ?? null });
      if (error) { failed++; continue; }
      made++; failed = 0;
    } catch { failed++; }
  }
  return { made, failed };
}

/** Admin: write `count` Challenge questions for a subject, always for the skills that have the fewest so far. All stay needs_review. */
export async function fillStretchForSubject(service: SupabaseClient, ai: AIProvider, subjectId: string, count: number, style?: string, budgetMs = 45_000): Promise<{ made: number; failed: number }> {
  const want = Math.max(1, Math.min(30, Math.round(count) || 1));
  const { data: chapters } = await service.from('chapters').select('topics(skills(id, retired))').eq('subject_id', subjectId);
  const ids: string[] = [];
  for (const c of (chapters ?? []) as any[]) for (const t of c.topics ?? []) for (const sk of t.skills ?? []) if (!sk.retired) ids.push(sk.id);
  if (!ids.length) throw new Error('This subject has no skills yet.');
  const have = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 100) { const { data } = await service.from('questions').select('skill_id').in('skill_id', ids.slice(i, i + 100)).eq('tier', 'stretch').limit(5000); for (const r of (data ?? []) as any[]) have.set(r.skill_id, (have.get(r.skill_id) ?? 0) + 1); }
  const order = [...ids].sort((a, b) => (have.get(a) ?? 0) - (have.get(b) ?? 0));
  const started = Date.now(); let made = 0, failed = 0;
  for (let i = 0; i < order.length && made < want && Date.now() - started < budgetMs; i++) {
    const r = await generateStretchQuestions(service, ai, { skillId: order[i], style, count: 1, budgetMs: Math.max(5_000, budgetMs - (Date.now() - started)), role: 'admin' });
    made += r.made; failed += r.failed;
    if (failed >= 8) break;
  }
  return { made, failed };
}

export { STYLE_NOTE };
