import { reviewStatusForAnswer, rollUpReviewStatus, addStage, type ReviewStatus, type StageRecord } from './review-status';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIImage, AIProvider } from '../ai-provider/ai-provider.interface';
import { ANSWER_BANK_ENABLED, ANSWER_BANK_KEEP_PHOTOS, HANDWRITING_CONSENT_VERSION, MAX_SHEET_PAGES } from './config';
import {
  HANDWRITING_SYSTEM_PROMPT, agreementStats, buildHandwritingUserMessage, finalScore, parseHandwritingResult, routeEvaluation,
  type AgreementStats, type WrittenQuestion,
} from './marking';
import { defaultMarks } from '../mock/mock-exam.service';

// Server-only helpers for handwritten answers. Every function takes a SERVICE client plus ids the caller derived from the
// signed-in session (or approved-teacher check). Answer keys are only read here, never returned to a student.

export const SHEET_BUCKET = 'answer-sheets';

export async function recordHandwritingConsent(service: SupabaseClient, studentId: string, keepForBank: boolean): Promise<void> {
  const { error } = await service
    .from('students')
    .update({ handwriting_consent_at: new Date().toISOString(), handwriting_consent_version: HANDWRITING_CONSENT_VERSION, answer_bank_consent: keepForBank })
    .eq('id', studentId);
  if (error) throw error;
}

export async function getHandwritingConsent(service: SupabaseClient, studentId: string): Promise<{ given: boolean; version: string | null; bank: boolean; current: boolean }> {
  const { data } = await service.from('students').select('handwriting_consent_at, handwriting_consent_version, answer_bank_consent').eq('id', studentId).single();
  const given = !!data?.handwriting_consent_at;
  return { given, version: data?.handwriting_consent_version ?? null, bank: !!data?.answer_bank_consent, current: given && data?.handwriting_consent_version === HANDWRITING_CONSENT_VERSION };
}

export async function loadPaperExam(service: SupabaseClient, studentId: string, examId: string): Promise<any> {
  const { data: ex } = await service.from('mock_exams').select('*, subjects(id, name, slug)').eq('id', examId).eq('student_id', studentId).single();
  if (!ex || ex.kind !== 'blueprint' || ex.delivery !== 'paper') throw new Error('mock_not_found');
  return ex;
}

/** The questions on this paper that are marked from photos (short-answer type), numbered as printed. */
export async function writtenQuestionsFor(service: SupabaseClient, exam: any): Promise<WrittenQuestion[]> {
  const layout: { questionIds: string[] }[] = exam.paper_layout ?? [];
  const ids = layout.flatMap((s) => s.questionIds);
  if (!ids.length) return [];
  const { data, error } = await service.from('diagnostic_questions').select('id, prompt, question_type, marks, expected_answer, explanation').in('id', ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((q: any) => [q.id, q]));
  const out: WrittenQuestion[] = [];
  ids.forEach((id, i) => {
    const q: any = byId.get(id);
    if (!q || q.question_type !== 'short_answer') return;
    const key = typeof q.expected_answer === 'object' && q.expected_answer ? String(q.expected_answer.value ?? JSON.stringify(q.expected_answer)) : String(q.expected_answer ?? '');
    out.push({ no: i + 1, id, prompt: q.prompt, marks: q.marks ?? defaultMarks('short_answer'), answerKey: [key, q.explanation].filter(Boolean).join('. ').slice(0, 1500) });
  });
  return out;
}

export async function listSheets(service: SupabaseClient, studentId: string, examId: string) {
  const { data, error } = await service.from('answer_sheets').select('page_no, status, quality, created_at').eq('student_id', studentId).eq('mock_exam_id', examId).order('page_no');
  if (error) throw error;
  return data ?? [];
}

export async function saveSheet(service: SupabaseClient, studentId: string, examId: string, pageNo: number, jpeg: Buffer, quality: object, bytes: number, maxPages: number = MAX_SHEET_PAGES): Promise<void> {
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > maxPages) throw new Error('bad_page_number');
  const path = `${studentId}/${examId}/${pageNo}.jpg`;
  const { error: upErr } = await service.storage.from(SHEET_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw upErr;
  const { error } = await service.from('answer_sheets').upsert(
    { student_id: studentId, mock_exam_id: examId, page_no: pageNo, storage_path: path, content_type: 'image/jpeg', bytes, quality, status: 'uploaded' },
    { onConflict: 'mock_exam_id,page_no' }
  );
  if (error) throw error;
}

export async function deleteSheet(service: SupabaseClient, studentId: string, examId: string, pageNo: number): Promise<void> {
  const { data } = await service.from('answer_sheets').select('storage_path').eq('student_id', studentId).eq('mock_exam_id', examId).eq('page_no', pageNo).maybeSingle();
  if (!data) return;
  await service.storage.from(SHEET_BUCKET).remove([data.storage_path]);
  await service.from('answer_sheets').delete().eq('student_id', studentId).eq('mock_exam_id', examId).eq('page_no', pageNo);
}

async function loadImages(service: SupabaseClient, studentId: string, examId: string): Promise<AIImage[]> {
  const { data: sheets } = await service.from('answer_sheets').select('page_no, storage_path').eq('student_id', studentId).eq('mock_exam_id', examId).order('page_no');
  const images: AIImage[] = [];
  for (const s of sheets ?? []) {
    const { data: blob, error } = await service.storage.from(SHEET_BUCKET).download(s.storage_path);
    if (error || !blob) throw error ?? new Error('sheet_download_failed');
    images.push({ mimeType: 'image/jpeg', base64: Buffer.from(await blob.arrayBuffer()).toString('base64') });
  }
  return images;
}

/**
 * Reads the uploaded pages and stores AI-suggested marks. Tier 1 AI marks, Tier 2 rule checks, Tier 3 teacher queue.
 * Answers a teacher has already marked are never overwritten. Safe to run again.
 */
export async function evaluateHandwrittenPaper(service: SupabaseClient, ai: AIProvider, studentId: string, examId: string, rng: () => number = Math.random): Promise<{ marked: number; needsTeacher: number; unreadable: number }> {
  const exam = await loadPaperExam(service, studentId, examId);
  const questions = await writtenQuestionsFor(service, exam);
  if (!questions.length) return { marked: 0, needsTeacher: 0, unreadable: 0 };
  const images = await loadImages(service, studentId, examId);
  if (!images.length) throw new Error('no_pages_uploaded');
  const res = await ai.complete({ systemPrompt: HANDWRITING_SYSTEM_PROMPT, userMessage: buildHandwritingUserMessage(questions, images.length), responseFormat: 'json', feature: 'handwriting', images, ref: examId });
  const parsed = parseHandwritingResult(res.text, questions);
  if (!parsed) throw new Error('handwriting_unreadable_response');

  const { data: existing } = await service.from('handwritten_evaluations').select('question_id, status').eq('mock_exam_id', examId).eq('student_id', studentId);
  const locked = new Set((existing ?? []).filter((e: any) => e.status === 'teacher_done').map((e: any) => e.question_id));
  let marked = 0, needsTeacher = 0, unreadable = 0;
  const rows: any[] = [];
  for (const a of parsed) {
    if (locked.has(a.questionId)) continue;
    const route = routeEvaluation(a, rng);
    if (route.status === 'ai_marked') marked++; else if (route.status === 'needs_teacher') needsTeacher++; else unreadable++;
    rows.push({
      student_id: studentId, mock_exam_id: examId, question_id: a.questionId, question_no: a.questionNo,
      extracted_text: a.transcription || null, ai_score: a.score, max_score: a.maxScore, confidence: a.confidence,
      ai_feedback: [a.feedback, route.reason && route.status !== 'ai_marked' ? `(Sent for teacher check: ${route.reason})` : ''].filter(Boolean).join(' ') || null,
      status: route.status, review_status: reviewStatusForAnswer(route.status), teacher_score: null, teacher_note: null, reviewed_at: null,
    });
  }
  if (rows.length) {
    const { error } = await service.from('handwritten_evaluations').upsert(rows, { onConflict: 'mock_exam_id,question_id' });
    if (error) throw error;
  }
  await syncPaperReviewStatus(service, examId);
  return { marked, needsTeacher, unreadable };
}

/** Rolls the answers' review statuses up to the paper (mock_exams.review_status). Best effort: never blocks marking. */
export async function syncPaperReviewStatus(service: SupabaseClient, examId: string): Promise<void> {
  try {
    const { data } = await service.from('handwritten_evaluations').select('status').eq('mock_exam_id', examId);
    const st = rollUpReviewStatus((data ?? []).map((r: any) => r.status));
    if (st) await service.from('mock_exams').update({ review_status: st }).eq('id', examId);
  } catch { /* the per-answer status is the source of truth */ }
}

/** Records one stage of the pipeline on the paper, so a failed run shows where it stopped. Best effort. */
export async function recordEvalStage(service: SupabaseClient, examId: string, rec: StageRecord, review?: ReviewStatus): Promise<void> {
  try {
    const { data } = await service.from('mock_exams').select('eval_stages').eq('id', examId).maybeSingle();
    const patch: Record<string, unknown> = { eval_stages: addStage((data?.eval_stages as StageRecord[] | null) ?? null, rec) };
    if (review) patch.review_status = review;
    await service.from('mock_exams').update(patch).eq('id', examId);
  } catch { /* never blocks */ }
}

export interface PaperReport {
  autoScore: number;
  autoTotal: number;
  writtenScore: number;
  writtenTotalMarked: number;
  writtenTotalAll: number;
  waitingForTeacher: number;
  unreadable: number;
  pendingNotMarked: number;
  items: { questionNo: number; maxScore: number; score: number | null; status: string; feedback: string | null; teacherNote: string | null }[];
  complete: boolean;
  note: string;
  reviewStatus: ReviewStatus | null;
}

/** Typed (auto-marked) part plus handwritten part. Marks still waiting for a teacher are not counted, and said so. */
export async function getPaperReport(service: SupabaseClient, studentId: string, examId: string): Promise<PaperReport> {
  const exam = await loadPaperExam(service, studentId, examId);
  const result = exam.result as { score: number; total: number; pendingWritten?: { questionId: string; marks: number }[] } | null;
  const pending = result?.pendingWritten ?? [];
  const { data: rows } = await service.from('handwritten_evaluations').select('*').eq('student_id', studentId).eq('mock_exam_id', examId).order('question_no');
  const byQ = new Map((rows ?? []).map((r: any) => [r.question_id, r]));
  let writtenScore = 0, markedTotal = 0, waiting = 0, unreadable = 0;
  const items = pending.map((p, i) => {
    const r: any = byQ.get(p.questionId);
    const sc = r ? finalScore(r) : null;
    if (r && sc !== null) { writtenScore += sc; markedTotal += r.max_score; }
    else if (r && r.status === 'needs_teacher') waiting++;
    else if (r && r.status === 'unreadable') unreadable++;
    return { questionNo: r?.question_no ?? i + 1, maxScore: p.marks, score: sc, status: r?.status ?? 'not_marked', feedback: r?.ai_feedback ?? null, teacherNote: r?.teacher_note ?? null };
  });
  const notMarked = items.filter((x) => x.status === 'not_marked').length;
  const writtenTotalAll = pending.reduce((a, p) => a + p.marks, 0);
  const complete = !!result && waiting === 0 && notMarked === 0 && unreadable === 0;
  const note = !result
    ? 'Submit your typed answers first.'
    : complete
    ? 'All answers are marked. AI-assisted evaluation using CBSE-aligned marking criteria, with human review for uncertain responses.'
    : 'Some written answers are not counted yet: they are waiting for a teacher, could not be read, or have not been marked. AI-assisted evaluation with human review for uncertain responses.';
  return { autoScore: result?.score ?? 0, autoTotal: result?.total ?? 0, writtenScore, writtenTotalMarked: markedTotal, writtenTotalAll, waitingForTeacher: waiting, unreadable, pendingNotMarked: notMarked, items, complete, note, reviewStatus: ((exam as any).review_status ?? rollUpReviewStatus((rows ?? []).map((r: any) => r.status))) as ReviewStatus | null };
}

// ---------- teacher side ----------
export async function listTeacherQueue(service: SupabaseClient, limit = 30) {
  const { data, error } = await service
    .from('handwritten_evaluations')
    .select('id, question_no, max_score, confidence, created_at, mock_exams(subjects(name))')
    .eq('status', 'needs_teacher')
    .order('created_at')
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, questionNo: r.question_no, maxScore: r.max_score, confidence: r.confidence, createdAt: r.created_at, subject: r.mock_exams?.subjects?.name ?? '' }));
}

/** One item for review: the question, the key, the AI's reading and marks, and short-lived links to the page photos. No student name or email. */
export async function getTeacherItem(service: SupabaseClient, evalId: string) {
  const { data: ev } = await service.from('handwritten_evaluations').select('*, mock_exams(subjects(name))').eq('id', evalId).maybeSingle();
  if (!ev) throw new Error('not_found');
  const { data: q } = await service.from('diagnostic_questions').select('prompt, expected_answer, explanation').eq('id', ev.question_id).single();
  const { data: sheets } = await service.from('answer_sheets').select('page_no, storage_path').eq('mock_exam_id', ev.mock_exam_id).order('page_no');
  const pages: { pageNo: number; url: string }[] = [];
  for (const s of sheets ?? []) {
    const { data: signed } = await service.storage.from(SHEET_BUCKET).createSignedUrl(s.storage_path, 600);
    if (signed?.signedUrl) pages.push({ pageNo: s.page_no, url: signed.signedUrl });
  }
  const key = q?.expected_answer && typeof q.expected_answer === 'object' ? String((q.expected_answer as any).value ?? '') : String(q?.expected_answer ?? '');
  return {
    id: ev.id, subject: ev.mock_exams?.subjects?.name ?? '', questionNo: ev.question_no, prompt: q?.prompt ?? '', answerKey: key, explanation: q?.explanation ?? null,
    maxScore: ev.max_score, aiScore: ev.ai_score, confidence: ev.confidence, aiReading: ev.extracted_text, aiFeedback: ev.ai_feedback, status: ev.status, pages,
  };
}

export async function submitTeacherScore(service: SupabaseClient, teacherUserId: string, evalId: string, score: number, note: string): Promise<void> {
  const { data: ev } = await service.from('handwritten_evaluations').select('id, max_score, status').eq('id', evalId).maybeSingle();
  if (!ev) throw new Error('not_found');
  if (!Number.isInteger(score) || score < 0 || score > ev.max_score) throw new Error('bad_score');
  const { error } = await service
    .from('handwritten_evaluations')
    .update({ teacher_score: score, teacher_note: note.slice(0, 600) || null, teacher_user_id: teacherUserId, reviewed_at: new Date().toISOString(), status: 'teacher_done', review_status: 'HUMAN_REVIEWED' })
    .eq('id', evalId);
  if (error) throw error;
  const { data: ev2 } = await service.from('handwritten_evaluations').select('mock_exam_id').eq('id', evalId).maybeSingle();
  if (ev2?.mock_exam_id) { await syncPaperReviewStatus(service, ev2.mock_exam_id); await recordEvalStage(service, ev2.mock_exam_id, { stage: 'teacher_review', ok: true, at: new Date().toISOString() }); }
}

export async function loadAgreement(service: SupabaseClient): Promise<{ overall: AgreementStats; bySubject: { subject: string; stats: AgreementStats }[]; queue: number; unreadable: number }> {
  const { data } = await service.from('handwritten_evaluations').select('ai_score, teacher_score, max_score, status, mock_exams(subjects(name))').limit(20000);
  const rows = (data ?? []) as any[];
  const done = rows.filter((r) => r.status === 'teacher_done');
  const subjects = new Map<string, any[]>();
  for (const r of done) subjects.set(r.mock_exams?.subjects?.name ?? 'Subject', [...(subjects.get(r.mock_exams?.subjects?.name ?? 'Subject') ?? []), r]);
  return {
    overall: agreementStats(done),
    bySubject: [...subjects.entries()].map(([subject, rs]) => ({ subject, stats: agreementStats(rs) })),
    queue: rows.filter((r) => r.status === 'needs_teacher').length,
    unreadable: rows.filter((r) => r.status === 'unreadable').length,
  };
}

// ---------- keeping a de-identified question/answer bank after account deletion ----------
/**
 * Called by the founder's deletion tool BEFORE the student is deleted. Does nothing unless the founder switched
 * ANSWER_BANK_ENABLED on in config.ts AND this family gave the separate consent. Stores no student id, name or email.
 * Photos are kept only if ANSWER_BANK_KEEP_PHOTOS is also on; otherwise only the typed-out answer text and marks are kept.
 */
export async function retainAnswerBank(service: SupabaseClient, studentId: string): Promise<{ retained: number; skippedReason?: string }> {
  if (!ANSWER_BANK_ENABLED) return { retained: 0, skippedReason: 'answer bank switched off' };
  const { data: st } = await service.from('students').select('answer_bank_consent').eq('id', studentId).single();
  if (!st?.answer_bank_consent) return { retained: 0, skippedReason: 'no consent' };
  const { data: evals } = await service.from('handwritten_evaluations').select('*, mock_exams(subject_id)').eq('student_id', studentId);
  let retained = 0;
  for (const e of (evals ?? []) as any[]) {
    const sc = finalScore(e);
    if (sc === null || !e.extracted_text) continue;
    const { error } = await service.from('answer_bank').insert({ subject_id: e.mock_exams?.subject_id ?? null, question_id: e.question_id, extracted_text: e.extracted_text, score: sc, max_score: e.max_score });
    if (!error) retained++;
  }
  if (ANSWER_BANK_KEEP_PHOTOS) {
    const { data: sheets } = await service.from('answer_sheets').select('storage_path').eq('student_id', studentId);
    for (const s of sheets ?? []) {
      const dest = `bank/${crypto.randomUUID()}.jpg`;
      const { error } = await service.storage.from(SHEET_BUCKET).copy(s.storage_path, dest);
      if (!error) await service.from('answer_bank').insert({ photo_path: dest });
    }
  }
  return { retained };
}

/** Deletes every stored photo of a student (used by the deletion tool). */
export async function removeAllSheets(service: SupabaseClient, studentId: string): Promise<void> {
  const { data: sheets } = await service.from('answer_sheets').select('storage_path').eq('student_id', studentId);
  const paths = (sheets ?? []).map((s: any) => s.storage_path);
  if (paths.length) await service.storage.from(SHEET_BUCKET).remove(paths);
}

export const MAX_PAGES = MAX_SHEET_PAGES;
