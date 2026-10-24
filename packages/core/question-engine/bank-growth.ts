import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { generateCodeQuestion, generatorFor } from './generators';
import { generateQuestionWithSolution, validateGeneratedQuestion, verifyGeneratedQuestion } from './ai-question-generator';

// Question-bank growth (v53). Every learning-session or diagnostic start adds GROWTH_PER_SESSION_START to the subject's
// "owed" counter; a background run then writes new questions until the counter is zero, a time budget ends, or the AI
// keeps failing. Each question is written by one AI call and CHECKED by a second, independent AI solve; only agreeing
// questions are saved, as source 'generated' / content_status 'needs_review' (a person still reviews them).
// Honest limit: on the free AI tier a single run may not finish all 50; the remainder stays owed and the next start
// (or the admin button at /admin/question-bank) carries on.
export const GROWTH_PER_SESSION_START = 50;
/** v62 (founder, 2026-10-24): every session of every kind, in every subject, owes that subject at least this many new questions. */
export const MIN_GROWTH_PER_SESSION = 10;
export const GROWTH_PENDING_CAP = 400;
/** v60: the founder's floor for every subject's diagnostic bank. */
export const DIAGNOSTIC_BANK_TARGET = 1000;
const DIAGNOSTIC_SHARE = 0.4; // 20 of every 50 go to the diagnostic bank, 30 to the practice bank

export async function requestBankGrowth(service: SupabaseClient, subjectId: string, amount = GROWTH_PER_SESSION_START): Promise<void> {
  const { data: row } = await service.from('question_bank_growth').select('pending').eq('subject_id', subjectId).maybeSingle();
  const next = Math.min(GROWTH_PENDING_CAP, (row?.pending ?? 0) + Math.max(amount, MIN_GROWTH_PER_SESSION));
  await service.from('question_bank_growth').upsert({ subject_id: subjectId, pending: next, updated_at: new Date().toISOString() }, { onConflict: 'subject_id' });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function runBankGrowth(
  service: SupabaseClient,
  ai: AIProvider,
  subjectId: string,
  budgetMs = 40_000,
  opts: { fillDiagnosticTo?: number } = {},
): Promise<{ made: number; stillOwed: number; skipped?: 'locked' | 'nothing_owed'; fromCode?: number }> {
  const started = Date.now();
  const { data: row0 } = await service.from('question_bank_growth').select('*').eq('subject_id', subjectId).maybeSingle();
  const fill = opts.fillDiagnosticTo;
  let row = row0;
  if (fill) {
    // Fill mode: the work to do is "diagnostic questions still missing to reach the target", not the owed counter.
    const have = await countDiagnostic(service, subjectId);
    const missing = Math.max(0, fill - have);
    if (missing === 0) return { made: 0, stillOwed: 0, skipped: 'nothing_owed' };
    row = { ...(row0 ?? { subject_id: subjectId, produced_total: 0, rejected_total: 0 }), pending: missing };
  }
  if (!row || row.pending <= 0) return { made: 0, stillOwed: row?.pending ?? 0, skipped: 'nothing_owed' };
  if (row.locked_until && Date.parse(row.locked_until) > Date.now()) return { made: 0, stillOwed: row.pending, skipped: 'locked' };
  if (!row0) await service.from('question_bank_growth').upsert({ subject_id: subjectId, pending: 0, updated_at: new Date().toISOString() }, { onConflict: 'subject_id' });
  await service.from('question_bank_growth').update({ locked_until: new Date(Date.now() + budgetMs + 20_000).toISOString() }).eq('subject_id', subjectId);

  let made = 0, rejected = 0, failStreak = 0, fromCode = 0, codeMiss = 0;
  try {
    const { data: subject } = await service.from('subjects').select('name').eq('id', subjectId).single();
    const subjectName = subject?.name ?? 'Mathematics';
    const { data: test } = await service.from('diagnostic_tests').select('id').eq('subject_id', subjectId).eq('is_active', true).limit(1).maybeSingle();
    const { data: chapters } = await service.from('chapters').select('topics(skills(id, name, retired))').eq('subject_id', subjectId);
    const skills: { id: string; name: string }[] = [];
    for (const c of (chapters ?? []) as any[]) for (const t of c.topics ?? []) for (const s of t.skills ?? []) if (!s.retired) skills.push({ id: s.id, name: s.name });
    if (skills.length === 0) return { made: 0, stillOwed: row.pending };
    const ids = skills.map((s) => s.id);
    const count = new Map<string, number>(ids.map((i) => [i, 0]));
    const prompts = new Map<string, Set<string>>(ids.map((i) => [i, new Set<string>()]));
    for (const table of ['questions', 'diagnostic_questions'] as const) {
      for (let i = 0; i < ids.length; i += 50) {
        const { data } = await service.from(table).select('skill_id, prompt').in('skill_id', ids.slice(i, i + 50)).limit(5000);
        for (const r of (data ?? []) as any[]) { count.set(r.skill_id, (count.get(r.skill_id) ?? 0) + 1); prompts.get(r.skill_id)?.add(norm(String(r.prompt))); }
      }
    }
    let pending: number = row.pending;
    let n = 0;
    while (pending > 0 && Date.now() - started < budgetMs && failStreak < 5) {
      // the skill with the fewest questions gets the next one, so thin skills fill first
      const skill = [...skills].sort((a, b) => (count.get(a.id) ?? 0) - (count.get(b.id) ?? 0))[0];
      const toDiagnostic = !!test && (!!fill || n % 5 === 0 || n % 5 === 2);
      n++;
      const difficulty = toDiagnostic ? 3 : [2, 3, 4][n % 3];
      try {
        // Subjects whose answers can be computed (e.g. Computer Applications logic, addresses, spreadsheets) are filled by code first: free, and the key is exact.
        const code = generatorFor(skill.name) ? generateCodeQuestion(skill.name) : null;
        if (code && fill && toDiagnostic) {
          if (prompts.get(skill.id)?.has(norm(code.prompt))) { codeMiss++; if (codeMiss > 60) { codeMiss = 0; } else { continue; } }
          else {
            const base = { skill_id: skill.id, difficulty: code.difficulty, question_type: code.questionType, prompt: code.prompt, options: code.options ?? null, expected_answer: code.expectedAnswer, explanation: code.explanation, source: 'generated', content_status: 'needs_review', validated: true, origin: 'code_generated', contributed_role: 'system', diagnostic_test_id: test!.id };
            const { error } = await service.from('diagnostic_questions').insert(base);
            if (!error) { made++; fromCode++; pending--; failStreak = 0; count.set(skill.id, (count.get(skill.id) ?? 0) + 1); prompts.get(skill.id)?.add(norm(code.prompt)); continue; }
          }
        }
        const g = await generateQuestionWithSolution(ai, { subjectName, skillName: skill.name, difficulty, avoidPrompts: [...(prompts.get(skill.id) ?? [])].slice(-6) });
        const v = validateGeneratedQuestion(g);
        if (!v.valid || g.questionType === 'step' && toDiagnostic) { rejected++; failStreak++; continue; }
        if (prompts.get(skill.id)?.has(norm(g.prompt))) { rejected++; continue; }
        if (!(await verifyGeneratedQuestion(ai, g))) { rejected++; failStreak++; continue; }
        const base = { skill_id: skill.id, difficulty, question_type: g.questionType, prompt: g.prompt, options: g.options ?? null, expected_answer: g.expectedAnswer, explanation: g.explanation, source: 'generated', content_status: 'needs_review', validated: true, origin: 'ai_generated', contributed_role: 'system' };
        const { error } = toDiagnostic
          ? await service.from('diagnostic_questions').insert({ ...base, diagnostic_test_id: test!.id })
          : await service.from('questions').insert(base);
        if (error) { rejected++; failStreak++; continue; }
        made++; pending--; failStreak = 0;
        count.set(skill.id, (count.get(skill.id) ?? 0) + 1);
        prompts.get(skill.id)?.add(norm(g.prompt));
      } catch { failStreak++; }
    }
    return { made, stillOwed: pending, fromCode };
  } finally {
    const { data: cur } = await service.from('question_bank_growth').select('pending, produced_total, rejected_total').eq('subject_id', subjectId).maybeSingle();
    await service.from('question_bank_growth').update({
      pending: fill ? (cur?.pending ?? 0) : Math.max(0, (cur?.pending ?? 0) - made),
      produced_total: (cur?.produced_total ?? 0) + made,
      rejected_total: (cur?.rejected_total ?? 0) + rejected,
      locked_until: null, last_run_at: new Date().toISOString(), last_run_made: made, updated_at: new Date().toISOString(),
    }).eq('subject_id', subjectId);
  }
}

/** Questions in the subject's diagnostic bank that are not rejected. */
export async function countDiagnostic(service: SupabaseClient, subjectId: string): Promise<number> {
  const { count } = await service.from('diagnostic_questions').select('id, skills!inner(topics!inner(chapters!inner(subject_id)))', { count: 'exact', head: true }).eq('skills.topics.chapters.subject_id', subjectId).neq('content_status', 'rejected');
  return count ?? 0;
}

/** v62: the AI writes questions for one request from a tutor, centre or teacher. Saved as needs_review, tagged with the request. */
export async function fulfilRequestWithAI(service: SupabaseClient, ai: AIProvider, requestId: string, budgetMs = 45_000): Promise<{ made: number; stillWanted: number }> {
  const started = Date.now();
  const { data: req } = await service.from('question_requests').select('*').eq('id', requestId).maybeSingle();
  const r: any = req;
  if (!r) throw new Error('Request not found.');
  const want = Math.max(0, (r.wanted_count ?? 0) - (r.fulfilled_count ?? 0));
  if (want === 0) return { made: 0, stillWanted: 0 };
  let skills: { id: string; name: string }[] = [];
  let subjectName = 'the subject';
  if (r.skill_id) {
    const { data: sk } = await service.from('skills').select('id, name, topics(chapters(subjects(name)))').eq('id', r.skill_id).maybeSingle();
    if (sk) { skills = [{ id: (sk as any).id, name: (sk as any).name }]; subjectName = (sk as any).topics?.chapters?.subjects?.name ?? subjectName; }
  } else if (r.subject_id) {
    const { data: subject } = await service.from('subjects').select('name').eq('id', r.subject_id).maybeSingle();
    subjectName = (subject as any)?.name ?? subjectName;
    const { data: chapters } = await service.from('chapters').select('topics(skills(id, name, retired))').eq('subject_id', r.subject_id);
    for (const c of (chapters ?? []) as any[]) for (const t of c.topics ?? []) for (const s of t.skills ?? []) if (!s.retired) skills.push({ id: s.id, name: s.name });
  }
  if (skills.length === 0) throw new Error('Choose a skill or subject on this request first.');
  if (r.status === 'open') await service.from('question_requests').update({ status: 'in_progress' }).eq('id', requestId);
  let made = 0, fail = 0, n = 0;
  while (made < want && fail < 5 && Date.now() - started < budgetMs) {
    const skill = skills[n++ % skills.length];
    try {
      const g = await generateQuestionWithSolution(ai, { subjectName, skillName: skill.name, difficulty: [2, 3, 4][n % 3], avoidPrompts: [] });
      const v = validateGeneratedQuestion(g);
      if (!v.valid || !(await verifyGeneratedQuestion(ai, g))) { fail++; continue; }
      const { error } = await service.from('questions').insert({ skill_id: skill.id, difficulty: [2, 3, 4][n % 3], question_type: g.questionType, prompt: g.prompt, options: g.options ?? null, expected_answer: g.expectedAnswer, explanation: g.explanation, source: 'generated', content_status: 'needs_review', validated: true, origin: 'ai_generated', contributed_role: 'system', request_id: requestId });
      if (error) { fail++; continue; }
      made++; fail = 0;
    } catch { fail++; }
  }
  const done = (r.fulfilled_count ?? 0) + made;
  await service.from('question_requests').update({ fulfilled_count: done, status: done >= r.wanted_count ? 'fulfilled' : 'in_progress' }).eq('id', requestId);
  return { made, stillWanted: Math.max(0, r.wanted_count - done) };
}
