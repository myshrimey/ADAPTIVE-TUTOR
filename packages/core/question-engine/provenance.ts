// v62: question provenance. Every question in the bank can say WHERE it came from (seed file, AI, code, admin, teacher, tutor,
// coaching centre, student, previous paper), WHO uploaded it, WHO reviewed it, and WHICH request (if any) it answers.
// Server-side only. Uploaded questions always start as "needs_review"; only the founder (admin) makes one "verified".
import type { SupabaseClient } from '@supabase/supabase-js';

export const ORIGINS = ['seed_import', 'generated', 'ai_generated', 'code_generated', 'admin_upload', 'teacher_upload', 'tutor_upload', 'centre_upload', 'student_upload', 'previous_paper'] as const;
export type Origin = (typeof ORIGINS)[number];
export const ORIGIN_LABEL: Record<string, string> = {
  seed_import: 'Original question bank', generated: 'Written by AI (older)', ai_generated: 'Written by AI', code_generated: 'Written by code (computed answer)',
  admin_upload: 'Uploaded by admin', teacher_upload: 'Uploaded by a teacher', tutor_upload: 'Uploaded by a tutor', centre_upload: 'Uploaded by a coaching centre',
  student_upload: 'Uploaded by a student', previous_paper: 'From a previous paper',
};
export type ContributorRole = 'admin' | 'teacher' | 'tutor' | 'centre';
export const CONTRIBUTOR_ROLES: ContributorRole[] = ['admin', 'teacher', 'tutor', 'centre'];
export const originForRole = (r: ContributorRole): Origin => (`${r}_upload` as Origin);
export const QUESTION_TABLES = ['questions', 'diagnostic_questions', 'baseline_items'] as const;
export type QuestionTable = (typeof QUESTION_TABLES)[number];

export interface Contributor { userId: string | null; role: ContributorRole; orgUserId?: string | null; email?: string }
export interface QuestionContributionInput {
  skillId: string;
  bank: 'practice' | 'diagnostic';
  questionType: 'mcq' | 'numeric' | 'short_answer';
  prompt: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
  requestId?: string | null;
  /** only an admin may tick this: "I have checked this question and its answer" */
  markVerified?: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function cleanContribution(raw: any): { ok: true; value: QuestionContributionInput } | { ok: false; error: string } {
  const prompt = clip(raw?.prompt, 1200);
  if (prompt.length < 10) return { ok: false, error: 'The question is too short. Please write the whole question.' };
  const questionType = ['mcq', 'numeric', 'short_answer'].includes(raw?.questionType) ? raw.questionType : null;
  if (!questionType) return { ok: false, error: 'Choose the question type: multiple choice, number, or short answer.' };
  const answer = clip(raw?.answer, 200);
  if (!answer) return { ok: false, error: 'Please give the correct answer.' };
  const difficulty = Math.round(Number(raw?.difficulty));
  if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) return { ok: false, error: 'Difficulty must be from 1 (easy) to 5 (hard).' };
  if (typeof raw?.skillId !== 'string' || !/^[0-9a-f-]{36}$/i.test(raw.skillId)) return { ok: false, error: 'Choose the skill this question tests.' };
  let options: string[] | undefined;
  if (questionType === 'mcq') {
    options = (Array.isArray(raw?.options) ? raw.options : []).map((o: unknown) => clip(o, 200)).filter(Boolean);
    if (options!.length < 3 || options!.length > 6) return { ok: false, error: 'A multiple choice question needs 3 to 6 options.' };
    if (new Set(options!.map(norm)).size !== options!.length) return { ok: false, error: 'Two options are the same.' };
    if (!options!.some((o) => norm(o) === norm(answer))) return { ok: false, error: 'The correct answer must be one of the options.' };
  }
  if (questionType === 'numeric' && !/^[-+]?\d*\.?\d+(\/\d+)?$/.test(answer.replace(/,/g, '').replace('−', '-'))) return { ok: false, error: 'A number question needs a number as the answer.' };
  return { ok: true, value: { skillId: raw.skillId, bank: raw?.bank === 'diagnostic' ? 'diagnostic' : 'practice', questionType, prompt, options, answer, explanation: clip(raw?.explanation, 800) || undefined, difficulty, requestId: typeof raw?.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(raw.requestId) ? raw.requestId : null, markVerified: raw?.markVerified === true } };
}

export async function contributeQuestion(service: SupabaseClient, who: Contributor, raw: unknown): Promise<{ id: string; table: QuestionTable; status: string }> {
  if (!CONTRIBUTOR_ROLES.includes(who.role)) throw new Error('Your account type cannot upload questions.');
  const c = cleanContribution(raw);
  if (!c.ok) throw new Error(c.error);
  const v = c.value;
  const table: QuestionTable = v.bank === 'diagnostic' ? 'diagnostic_questions' : 'questions';
  const { data: skill } = await service.from('skills').select('id, topics(chapters(subject_id))').eq('id', v.skillId).maybeSingle();
  if (!skill) throw new Error('That skill was not found.');
  const { data: same } = await service.from(table).select('prompt').eq('skill_id', v.skillId).limit(2000);
  if (((same ?? []) as any[]).some((r) => norm(String(r.prompt)) === norm(v.prompt))) throw new Error('This question is already in the bank for that skill.');
  const verified = who.role === 'admin' && v.markVerified === true;
  const row: Record<string, unknown> = {
    skill_id: v.skillId, difficulty: v.difficulty, question_type: v.questionType, prompt: v.prompt, options: v.options ?? null, expected_answer: { value: v.answer },
    explanation: v.explanation ?? null, source: 'bank', content_status: verified ? 'verified' : 'needs_review', validated: verified,
    origin: originForRole(who.role), contributed_by: who.userId, contributed_role: who.role, contributor_org: who.orgUserId ?? null, request_id: v.requestId ?? null,
    reviewed_by: verified ? who.email ?? 'admin' : null, reviewed_at: verified ? new Date().toISOString() : null,
  };
  if (table === 'diagnostic_questions') {
    const subjectId = (skill as any)?.topics?.chapters?.subject_id;
    const { data: test } = await service.from('diagnostic_tests').select('id').eq('subject_id', subjectId).eq('is_active', true).limit(1).maybeSingle();
    if (!test) throw new Error('This subject has no active diagnostic test yet; add it to the practice bank instead.');
    row.diagnostic_test_id = (test as any).id;
  }
  const { data, error } = await service.from(table).insert(row).select('id').single();
  if (error || !data) throw new Error('Could not save the question.');
  if (v.requestId) await bumpRequest(service, v.requestId);
  return { id: (data as any).id, table, status: verified ? 'verified' : 'needs_review' };
}

async function bumpRequest(service: SupabaseClient, requestId: string): Promise<void> {
  const { data: r } = await service.from('question_requests').select('fulfilled_count, wanted_count, status').eq('id', requestId).maybeSingle();
  if (!r) return;
  const n = ((r as any).fulfilled_count ?? 0) + 1;
  await service.from('question_requests').update({ fulfilled_count: n, status: n >= (r as any).wanted_count ? 'fulfilled' : 'in_progress' }).eq('id', requestId);
}

export type ReviewDecision = 'approve' | 'reject' | 'retire';
export async function reviewQuestion(service: SupabaseClient, reviewerEmail: string, table: string, id: string, decision: ReviewDecision, note?: string): Promise<void> {
  if (!QUESTION_TABLES.includes(table as QuestionTable)) throw new Error('Unknown question table.');
  if (!['approve', 'reject', 'retire'].includes(decision)) throw new Error('Unknown decision.');
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { reviewed_by: reviewerEmail, reviewed_at: now, review_note: clip(note, 500) || null };
  if (table === 'baseline_items') patch.quality_status = decision === 'approve' ? 'APPROVED' : 'RETIRED';
  else { patch.content_status = decision === 'approve' ? 'verified' : 'rejected'; if (decision === 'approve') patch.validated = true; }
  const { error } = await service.from(table).update(patch).eq('id', id);
  if (error) throw new Error('Could not save the review.');
}

// ---------------------------------------------------------------- requests ("asked for") -------------------------------
export interface RequestInput { skillId?: string | null; subjectId?: string | null; topicText?: string; wantedCount: number; note?: string }
export function cleanRequest(raw: any): { ok: true; value: RequestInput } | { ok: false; error: string } {
  const wantedCount = Math.round(Number(raw?.wantedCount ?? 10));
  if (!Number.isFinite(wantedCount) || wantedCount < 1 || wantedCount > 200) return { ok: false, error: 'Ask for between 1 and 200 questions.' };
  const skillId = typeof raw?.skillId === 'string' && /^[0-9a-f-]{36}$/i.test(raw.skillId) ? raw.skillId : null;
  const subjectId = typeof raw?.subjectId === 'string' && /^[0-9a-f-]{36}$/i.test(raw.subjectId) ? raw.subjectId : null;
  const topicText = clip(raw?.topicText, 200);
  if (!skillId && !subjectId && !topicText) return { ok: false, error: 'Say which subject, skill or topic you need questions for.' };
  return { ok: true, value: { skillId, subjectId, topicText: topicText || undefined, wantedCount, note: clip(raw?.note, 500) || undefined } };
}
export async function createQuestionRequest(service: SupabaseClient, who: Contributor | { userId: string; role: string; orgUserId?: string | null }, raw: unknown): Promise<{ id: string }> {
  const c = cleanRequest(raw);
  if (!c.ok) throw new Error(c.error);
  const v = c.value;
  const { count } = await service.from('question_requests').select('id', { count: 'exact', head: true }).eq('requested_by', who.userId).eq('status', 'open');
  if ((count ?? 0) >= 10) throw new Error('You already have 10 open requests. Please wait for some to be handled.');
  const { data, error } = await service.from('question_requests').insert({ requested_by: who.userId, requester_role: who.role, org_user_id: who.orgUserId ?? null, skill_id: v.skillId ?? null, subject_id: v.subjectId ?? null, topic_text: v.topicText ?? null, wanted_count: v.wantedCount, note: v.note ?? null, status: 'open' }).select('id').single();
  if (error || !data) throw new Error('Could not save the request.');
  return { id: (data as any).id };
}
export async function setRequestStatus(service: SupabaseClient, adminEmail: string, id: string, status: 'open' | 'in_progress' | 'fulfilled' | 'declined'): Promise<void> {
  if (!['open', 'in_progress', 'fulfilled', 'declined'].includes(status)) throw new Error('Unknown status.');
  const { error } = await service.from('question_requests').update({ status, handled_by: adminEmail, handled_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error('Could not update the request.');
}

// ---------------------------------------------------------------- the register (admin) -------------------------------
export interface RegisterFilter { table?: QuestionTable | 'all'; origin?: string; role?: string; status?: string; subjectId?: string; reviewed?: 'yes' | 'no'; limit?: number }
export interface RegisterRow {
  table: string; id: string; prompt: string; skillName: string | null; subjectName: string | null; difficulty: number | null; origin: string;
  contributorName: string | null; contributorRole: string | null; orgName: string | null; status: string; reviewedBy: string | null; reviewedAt: string | null; reviewNote: string | null;
  teacherReviews: Array<{ name: string; verdict: string }>; requestId: string | null; createdAt: string | null;
}

export async function listRegister(service: SupabaseClient, f: RegisterFilter = {}): Promise<RegisterRow[]> {
  const tables: QuestionTable[] = f.table && f.table !== 'all' ? [f.table] : ['questions', 'diagnostic_questions', 'baseline_items'];
  const limit = Math.min(Math.max(f.limit ?? 100, 1), 500);
  const rows: RegisterRow[] = [];
  const userIds = new Set<string>();
  const raw: Array<{ t: QuestionTable; r: any }> = [];
  for (const t of tables) {
    const sel = t === 'baseline_items' ? 'id, prompt, difficulty, origin, contributed_by, contributed_role, contributor_org, quality_status, reviewed_by, reviewed_at, review_note, request_id, created_at, competencies(name)'
      : 'id, prompt, difficulty, origin, contributed_by, contributed_role, contributor_org, content_status, reviewed_by, reviewed_at, review_note, request_id, created_at, skills(name)';
    let q = service.from(t).select(sel).order('created_at', { ascending: false }).limit(limit);
    if (f.origin) q = q.eq('origin', f.origin);
    if (f.role) q = q.eq('contributed_role', f.role);
    if (f.status) q = q.eq(t === 'baseline_items' ? 'quality_status' : 'content_status', f.status);
    if (f.reviewed === 'yes') q = q.not('reviewed_by', 'is', null);
    if (f.reviewed === 'no') q = q.is('reviewed_by', null);
    const { data } = await q;
    for (const r of (data ?? []) as any[]) { raw.push({ t, r }); if (r.contributed_by) userIds.add(r.contributed_by); if (r.contributor_org) userIds.add(r.contributor_org); }
  }
  const names = await userNames(service, [...userIds]);
  const ids = raw.filter((x) => x.t !== 'baseline_items').map((x) => x.r.id);
  const tr = new Map<string, Array<{ name: string; verdict: string }>>();
  if (ids.length) {
    const { data: cr } = await service.from('content_reviews').select('item_id, verdict, teacher_user_id').in('item_id', ids.slice(0, 500));
    const tnames = await userNames(service, [...new Set(((cr ?? []) as any[]).map((c) => c.teacher_user_id))]);
    for (const c of (cr ?? []) as any[]) { const a = tr.get(c.item_id) ?? []; a.push({ name: tnames.get(c.teacher_user_id) ?? 'Teacher', verdict: c.verdict }); tr.set(c.item_id, a); }
  }
  for (const { t, r } of raw) rows.push({
    table: t, id: r.id, prompt: String(r.prompt), skillName: r.skills?.name ?? r.competencies?.name ?? null, subjectName: null, difficulty: r.difficulty ?? null, origin: r.origin ?? 'seed_import',
    contributorName: r.contributed_by ? names.get(r.contributed_by) ?? 'Unknown' : null, contributorRole: r.contributed_role ?? null, orgName: r.contributor_org ? names.get(r.contributor_org) ?? null : null,
    status: t === 'baseline_items' ? r.quality_status : r.content_status, reviewedBy: r.reviewed_by ?? null, reviewedAt: r.reviewed_at ?? null, reviewNote: r.review_note ?? null,
    teacherReviews: tr.get(r.id) ?? [], requestId: r.request_id ?? null, createdAt: r.created_at ?? null,
  });
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit);
}

async function userNames(service: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const [{ data: adults }, { data: teachers }] = await Promise.all([
    service.from('adult_profiles').select('user_id, display_name').in('user_id', ids),
    service.from('teacher_profiles').select('user_id, display_name').in('user_id', ids),
  ]);
  for (const a of (adults ?? []) as any[]) out.set(a.user_id, a.display_name);
  for (const t of (teachers ?? []) as any[]) if (!out.has(t.user_id)) out.set(t.user_id, t.display_name);
  return out;
}

export interface ProvenanceSummary { byOrigin: Array<{ origin: string; label: string; count: number; verified: number }>; byContributor: Array<{ name: string; role: string; uploaded: number; verified: number; rejected: number; pending: number }>; total: number; reviewed: number }

/** Counts for the top of the register. */
export async function provenanceSummary(service: SupabaseClient): Promise<ProvenanceSummary> {
  const byOrigin = new Map<string, { count: number; verified: number }>();
  const byC = new Map<string, { name: string; role: string; uploaded: number; verified: number; rejected: number; pending: number }>();
  let total = 0, reviewed = 0;
  const userIds = new Set<string>();
  const all: Array<{ origin: string; by: string | null; role: string | null; ok: boolean; bad: boolean; rev: boolean }> = [];
  for (const t of QUESTION_TABLES) {
    const sel = t === 'baseline_items' ? 'origin, contributed_by, contributed_role, quality_status, reviewed_by' : 'origin, contributed_by, contributed_role, content_status, reviewed_by';
    for (let a = 0; a < 50000; a += 1000) {
      const { data } = await service.from(t).select(sel).range(a, a + 999);
      for (const r of (data ?? []) as any[]) {
        const st = t === 'baseline_items' ? r.quality_status : r.content_status;
        all.push({ origin: r.origin ?? 'seed_import', by: r.contributed_by ?? null, role: r.contributed_role ?? null, ok: st === 'verified' || st === 'APPROVED' || st === 'ADMIN_REVIEWED', bad: st === 'rejected' || st === 'RETIRED', rev: !!r.reviewed_by });
        if (r.contributed_by) userIds.add(r.contributed_by);
      }
      if (!data || data.length < 1000) break;
    }
  }
  const names = await userNames(service, [...userIds]);
  for (const x of all) {
    total++; if (x.rev) reviewed++;
    const o = byOrigin.get(x.origin) ?? { count: 0, verified: 0 }; o.count++; if (x.ok) o.verified++; byOrigin.set(x.origin, o);
    if (x.by) { const k = x.by; const c = byC.get(k) ?? { name: names.get(k) ?? 'Unknown', role: x.role ?? '', uploaded: 0, verified: 0, rejected: 0, pending: 0 }; c.uploaded++; if (x.ok) c.verified++; else if (x.bad) c.rejected++; else c.pending++; byC.set(k, c); }
  }
  return { total, reviewed, byOrigin: [...byOrigin.entries()].map(([origin, v]) => ({ origin, label: ORIGIN_LABEL[origin] ?? origin, ...v })).sort((a, b) => b.count - a.count), byContributor: [...byC.values()].sort((a, b) => b.uploaded - a.uploaded) };
}
