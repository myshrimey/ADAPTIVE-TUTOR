// v62: database layer of the adaptive baseline engine. Server-only (service client): the student never reads these tables,
// so an answer key can never reach the browser. All decisions come from the pure modules next to this file.
import type { SupabaseClient } from '@supabase/supabase-js';
import { CompetencyGraph, type Competency } from './graph';
import { mathsCompetencies, type Class10Skill } from './seed-graph';
import { newState, decideNext, recordAnswer, estimates, DEFAULT_ENGINE_CONFIG, type AdaptiveState, type EngineConfig, type Decision } from './selector';
import { classifyError, estimateFrom, evidenceStrength, type EvidenceItem } from './evidence';
import { buildBaseline, compareEstimates, studentReport, type Baseline } from './baseline';
import { foundationCodes, generateFoundationItem, seededRng } from './foundation-items';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { inputKindOf, validateAnswer, type InputKind } from '../answers/input';

export const BASELINE_SETTING_KEY = 'baseline_engine';
export interface EngineSettings extends EngineConfig { enabled: boolean; allowUnreviewed: boolean }
export const DEFAULT_ENGINE_SETTINGS: EngineSettings = { ...DEFAULT_ENGINE_CONFIG, enabled: true, allowUnreviewed: true };

/** Only whole numbers in sensible ranges are kept; anything else falls back to the default. */
export function cleanEngineSettings(raw: any): EngineSettings {
  const d = DEFAULT_ENGINE_SETTINGS;
  const n = (v: any, lo: number, hi: number, def: number) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x) : def; };
  const minQuestions = n(raw?.minQuestions, 5, 60, d.minQuestions);
  const maxQuestions = Math.max(minQuestions, n(raw?.maxQuestions, 10, 120, d.maxQuestions));
  const recommendedMin = Math.min(maxQuestions, Math.max(minQuestions, n(raw?.recommendedMin, 5, 100, d.recommendedMin)));
  const recommendedMax = Math.min(maxQuestions, Math.max(recommendedMin, n(raw?.recommendedMax, 5, 100, d.recommendedMax)));
  const ct = Number(raw?.confidenceThreshold);
  return {
    minQuestions, recommendedMin, recommendedMax, maxQuestions,
    confidenceThreshold: Number.isFinite(ct) && ct >= 0.5 && ct <= 0.98 ? ct : d.confidenceThreshold,
    prereqDepth: n(raw?.prereqDepth, 1, 6, d.prereqDepth),
    targetClass: 10,
    enabled: raw?.enabled === false ? false : true,
    allowUnreviewed: raw?.allowUnreviewed === false ? false : true,
  };
}
export async function loadEngineSettings(service: SupabaseClient): Promise<EngineSettings> {
  const { data } = await service.from('commerce_settings').select('value').eq('key', BASELINE_SETTING_KEY).maybeSingle();
  return cleanEngineSettings((data as any)?.value);
}
export async function saveEngineSettings(service: SupabaseClient, raw: any): Promise<EngineSettings> {
  const v = cleanEngineSettings(raw);
  const { error } = await service.from('commerce_settings').upsert({ key: BASELINE_SETTING_KEY, value: v, note: 'v62 adaptive baseline engine' }, { onConflict: 'key' });
  if (error) throw new Error('Could not save the engine settings.');
  return v;
}

// ---------------------------------------------------------------- graph in the database -----------------------------
interface SkillRow { id: string; name: string; slug: string; retired?: boolean; chapter: string }

async function loadSkills(service: SupabaseClient, subjectId: string): Promise<{ skills: Class10Skill[]; subjectSlug: string }> {
  const { data: subj } = await service.from('subjects').select('slug').eq('id', subjectId).maybeSingle();
  const { data: chapters } = await service.from('chapters').select('id, name').eq('subject_id', subjectId);
  const chapterName = new Map(((chapters ?? []) as any[]).map((c) => [c.id, c.name as string]));
  const chIds = [...chapterName.keys()];
  const rows: SkillRow[] = [];
  const topicChapter = new Map<string, string>();
  for (let i = 0; i < chIds.length; i += 100) {
    const { data: topics } = await service.from('topics').select('id, chapter_id').in('chapter_id', chIds.slice(i, i + 100));
    for (const t of (topics ?? []) as any[]) topicChapter.set(t.id, t.chapter_id);
  }
  const tIds = [...topicChapter.keys()];
  for (let i = 0; i < tIds.length; i += 100) {
    const { data: sk } = await service.from('skills').select('id, name, slug, retired, topic_id').in('topic_id', tIds.slice(i, i + 100));
    for (const s of (sk ?? []) as any[]) if (!s.retired) rows.push({ id: s.id, name: s.name, slug: s.slug, chapter: chapterName.get(topicChapter.get(s.topic_id)!) ?? '' });
  }
  const ids = rows.map((r) => r.id);
  const reqs: Array<{ skill_id: string; requires_skill_id: string }> = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await service.from('prerequisites').select('skill_id, requires_skill_id').in('skill_id', ids.slice(i, i + 100));
    reqs.push(...((data ?? []) as any[]));
  }
  const slugOf = new Map(rows.map((r) => [r.id, r.slug]));
  return { subjectSlug: (subj as any)?.slug ?? 'subject', skills: rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, chapter: r.chapter, requiresSlugs: reqs.filter((q) => q.skill_id === r.id).map((q) => slugOf.get(q.requires_skill_id)).filter((x): x is string => !!x) })) };
}

export const isMathsFamily = (slug: string) => slug === 'maths' || slug === 'maths-basic' || slug.startsWith('math');

/** Desired competencies and prerequisite links for a subject (pure given the skill rows). */
export function desiredGraph(subjectSlug: string, skills: Class10Skill[]): { comps: Competency[]; edges: Array<{ competencyId: string; requiresId: string }> } {
  if (isMathsFamily(subjectSlug)) return mathsCompetencies(skills);
  // Other subjects: Class 10 skills and their recorded prerequisites only. No earlier-class graph exists for them yet.
  const comps: Competency[] = [];
  const edges: Array<{ competencyId: string; requiresId: string }> = [];
  const slugs = new Set(skills.map((s) => s.slug));
  for (const sk of skills) {
    const code = `${subjectSlug}10.${sk.slug}`;
    comps.push({ id: code, code, classLevel: 10, chapter: sk.chapter, topic: sk.name, name: sk.name, domain: 'general', cognitiveLevel: 'apply', importance: 3, skillId: sk.id });
    for (const r of sk.requiresSlugs) if (slugs.has(r)) edges.push({ competencyId: code, requiresId: `${subjectSlug}10.${r}` });
  }
  return { comps, edges };
}

export interface LoadedGraph { graph: CompetencyGraph; subjectSlug: string; hasFoundation: boolean }

/** Makes sure the subject's competencies and links exist in the database (adds only what is missing), then loads them. */
const GRAPH_CACHE = new Map<string, { at: number; v: LoadedGraph }>();
export function clearGraphCache() { GRAPH_CACHE.clear(); }
export async function ensureGraph(service: SupabaseClient, subjectId: string): Promise<LoadedGraph> {
  const hit = GRAPH_CACHE.get(subjectId);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  const v = await buildGraph(service, subjectId);
  GRAPH_CACHE.set(subjectId, { at: Date.now(), v });
  return v;
}
async function buildGraph(service: SupabaseClient, subjectId: string): Promise<LoadedGraph> {
  const { skills, subjectSlug } = await loadSkills(service, subjectId);
  const want = desiredGraph(subjectSlug, skills);
  const { data: have } = await service.from('competencies').select('id, code').eq('subject_id', subjectId);
  const haveCodes = new Set(((have ?? []) as any[]).map((r) => r.code));
  const missing = want.comps.filter((c) => !haveCodes.has(c.code));
  const rowOf = (c: Competency) => ({ code: c.code, subject_id: subjectId, class_level: c.classLevel, chapter: c.chapter ?? null, topic: c.topic ?? null, name: c.name, description: c.description ?? null, domain: c.domain, cognitive_level: c.cognitiveLevel ?? 'apply', importance: c.importance, skill_id: c.skillId ?? null, status: 'needs_review', source: c.classLevel === 10 ? 'curriculum_skill' : 'authored_foundation' });
  for (let i = 0; i < missing.length; i += 100) {
    const { error } = await service.from('competencies').upsert(missing.slice(i, i + 100).map(rowOf), { onConflict: 'code' });
    if (error) throw new Error('Could not save the competency graph.');
  }
  const { data: all } = await service.from('competencies').select('id, code, class_level, chapter, topic, name, domain, cognitive_level, importance, skill_id, description, min_expected_mastery').eq('subject_id', subjectId);
  const idByCode = new Map(((all ?? []) as any[]).map((r) => [r.code, r.id]));
  const { data: haveEdges } = await service.from('competency_prerequisites').select('competency_id, requires_competency_id').in('competency_id', [...idByCode.values()].slice(0, 1000));
  const edgeKey = (a: string, b: string) => a + '>' + b;
  const haveE = new Set(((haveEdges ?? []) as any[]).map((e) => edgeKey(e.competency_id, e.requires_competency_id)));
  const newEdges = want.edges.map((e) => ({ competency_id: idByCode.get(e.competencyId), requires_competency_id: idByCode.get(e.requiresId) })).filter((e) => e.competency_id && e.requires_competency_id && !haveE.has(edgeKey(e.competency_id, e.requires_competency_id)));
  for (let i = 0; i < newEdges.length; i += 200) await service.from('competency_prerequisites').upsert(newEdges.slice(i, i + 200), { onConflict: 'competency_id,requires_competency_id' });
  const { data: edgeRows } = await service.from('competency_prerequisites').select('competency_id, requires_competency_id').in('competency_id', [...idByCode.values()].slice(0, 1000));
  const comps: Competency[] = ((all ?? []) as any[]).filter((r) => r.class_level <= 10).map((r) => ({ id: r.id, code: r.code, subjectId, classLevel: r.class_level, chapter: r.chapter, topic: r.topic, name: r.name, domain: r.domain, description: r.description, cognitiveLevel: r.cognitive_level, importance: r.importance, minMastery: Number(r.min_expected_mastery ?? 0.7), skillId: r.skill_id }));
  const graph = new CompetencyGraph(comps, ((edgeRows ?? []) as any[]).map((e) => ({ competencyId: e.competency_id, requiresId: e.requires_competency_id })));
  return { graph, subjectSlug, hasFoundation: isMathsFamily(subjectSlug) };
}

// ---------------------------------------------------------------- questions ------------------------------------------
export interface PickedItem {
  table: 'diagnostic_questions' | 'questions' | 'baseline_items';
  id: string;
  prompt: string;
  questionType: string;
  options: string[] | null;
  expected: unknown;
  explanation: string | null;
  difficulty: number;
  figureUrl: string | null;
  figureCaption: string | null;
  dimension: string;
  expectedSeconds: number | null;
  reused: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function askableSet(service: SupabaseClient, graph: CompetencyGraph, settings: EngineSettings): Promise<Set<string>> {
  const out = new Set<string>();
  const found = foundationCodes();
  const skillIds = graph.all().filter((c) => c.classLevel === settings.targetClass && c.skillId).map((c) => c.skillId!);
  const have = new Set<string>();
  for (const table of ['diagnostic_questions', 'questions']) {
    for (let i = 0; i < skillIds.length; i += 100) {
      let q = service.from(table).select('skill_id').in('skill_id', skillIds.slice(i, i + 100)).neq('content_status', 'rejected').limit(5000);
      if (!settings.allowUnreviewed) q = q.eq('content_status', 'verified');
      const { data } = await q;
      for (const r of (data ?? []) as any[]) have.add(r.skill_id);
    }
  }
  for (const c of graph.all()) {
    if (c.classLevel === settings.targetClass) { if (c.skillId && have.has(c.skillId)) out.add(c.id); }
    else if (found.includes(c.code)) out.add(c.id);
  }
  return out;
}

async function pickItem(service: SupabaseClient, c: Competency, wanted: number, seen: Set<string>, settings: EngineSettings, seed: number): Promise<PickedItem | null> {
  const nearest = <T extends { id: string; difficulty: number }>(rows: T[]): T | null => {
    const unseen = rows.filter((r) => !seen.has(r.id));
    const pool = unseen.length ? unseen : rows;
    if (!pool.length) return null;
    const best = Math.min(...pool.map((r) => Math.abs((r.difficulty ?? 3) - wanted)));
    const near = pool.filter((r) => Math.abs((r.difficulty ?? 3) - wanted) === best);
    return near[seed % near.length];
  };
  if (c.skillId) {
    const rows: Array<any> = [];
    for (const table of ['diagnostic_questions', 'questions'] as const) {
      let q = service.from(table).select('id, prompt, question_type, options, expected_answer, explanation, difficulty, figure_url, figure_caption').eq('skill_id', c.skillId).neq('content_status', 'rejected').limit(400);
      if (!settings.allowUnreviewed) q = q.eq('content_status', 'verified');
      const { data } = await q;
      for (const r of (data ?? []) as any[]) rows.push({ ...r, _table: table });
    }
    const pick = nearest(rows);
    if (!pick) return null;
    return { table: pick._table, id: pick.id, prompt: pick.prompt, questionType: pick.question_type, options: pick.options ?? null, expected: pick.expected_answer, explanation: pick.explanation ?? null, difficulty: pick.difficulty ?? 3, figureUrl: pick.figure_url ?? null, figureCaption: pick.figure_caption ?? null, dimension: ({ analyse: 'reasoning', apply: 'application', understand: 'conceptual' } as Record<string, string>)[c.cognitiveLevel ?? 'apply'] ?? 'application', expectedSeconds: null, reused: !rows.some((r) => !seen.has(r.id)) };
  }
  // Foundation skills: stored code-written items first, otherwise write a fresh one (the answer is computed, so it is exact).
  const { data: stored } = await service.from('baseline_items').select('id, prompt, question_type, options, expected_answer, explanation, difficulty, cognitive_dimension, expected_time_seconds, family').eq('competency_id', c.id).neq('quality_status', 'RETIRED').limit(300);
  const rows = ((stored ?? []) as any[]).map((r) => ({ ...r, difficulty: r.difficulty ?? 2 }));
  const unseen = rows.filter((r) => !seen.has(r.id));
  const hit = nearest(unseen);
  const closeEnough = hit && Math.abs(hit.difficulty - wanted) <= 1;
  if (!closeEnough) {
    const avoid = new Set(rows.map((r) => norm(String(r.prompt))));
    const made = generateFoundationItem(c.code, wanted, seededRng(seed * 7919 + rows.length + 1), avoid);
    if (made) {
      const { data: ins } = await service.from('baseline_items').insert({ competency_id: c.id, family: made.family, difficulty: made.difficulty, question_type: made.questionType, prompt: made.prompt, options: made.options ?? null, expected_answer: made.expectedAnswer, explanation: made.explanation, cognitive_dimension: made.dimension, quality_status: 'DRAFT', origin: 'code_generated', contributed_role: 'system' } as any).select('id').single();
      if (ins) return { table: 'baseline_items', id: (ins as any).id, prompt: made.prompt, questionType: made.questionType, options: made.options ?? null, expected: made.expectedAnswer, explanation: made.explanation, difficulty: made.difficulty, figureUrl: null, figureCaption: null, dimension: made.dimension, expectedSeconds: null, reused: false };
    }
  }
  const pick = hit ?? nearest(rows);
  if (!pick) return null;
  return { table: 'baseline_items', id: pick.id, prompt: pick.prompt, questionType: pick.question_type, options: pick.options ?? null, expected: pick.expected_answer, explanation: pick.explanation ?? null, difficulty: pick.difficulty, figureUrl: null, figureCaption: null, dimension: pick.cognitive_dimension ?? 'application', expectedSeconds: pick.expected_time_seconds ?? null, reused: !hit };
}

// ---------------------------------------------------------------- sessions -------------------------------------------
export interface SessionWrap { engine: AdaptiveState; prevStatus: Record<string, string>; languageMismatch: boolean }
export interface StudentQuestion {
  sessionId: string; step: number; itemTable: string; itemId: string; competencyId: string;
  prompt: string; questionType: string; options: string[] | null; inputKind: InputKind; difficulty: number;
  figureUrl: string | null; figureCaption: string | null;
  /** plain-words reason shown to the student ("why am I being asked this?") */
  why: string; classLevel: number; skillName: string;
  progress: { answered: number; recommendedMin: number; recommendedMax: number };
}

const WHY: Record<string, (n: string, cl: number, T: number) => string> = {
  target: (n, cl, T) => `This checks "${n}", a topic in Class ${T}.`,
  escalate: (n) => `You did well on "${n}", so this one is a little harder to see how far the skill goes.`,
  prereq: (n, cl, T) => `This checks "${n}" (usually met around Class ${cl}) because it is a building block for the Class ${T} topic before it.`,
  confirm: (n) => `A second question on "${n}" with different numbers, so one slip does not decide the picture.`,
  spot: (n) => `A quick check of "${n}", which the previous topic builds on.`,
};

async function seenFor(service: SupabaseClient, studentId: string, session: { seen_items?: any }): Promise<Set<string>> {
  const out = new Set<string>(((session?.seen_items ?? []) as string[]));
  const { data: ev } = await service.from('student_competency_evidence').select('item_id').eq('student_id', studentId).not('item_id', 'is', null).limit(5000);
  for (const r of (ev ?? []) as any[]) out.add(r.item_id);
  try {
    const { data: att } = await service.from('diagnostic_attempts').select('id').eq('student_id', studentId).limit(200);
    const ids = ((att ?? []) as any[]).map((a) => a.id);
    if (ids.length) { const { data: ans } = await service.from('diagnostic_answers').select('diagnostic_question_id').in('diagnostic_attempt_id', ids).limit(5000); for (const r of (ans ?? []) as any[]) out.add(r.diagnostic_question_id); }
  } catch { /* the older diagnostic's history is a bonus, not required */ }
  return out;
}

export async function startBaseline(service: SupabaseClient, studentId: string, subjectId: string, opts: { mini?: boolean; languageMismatch?: boolean } = {}): Promise<{ sessionId: string; question: StudentQuestion | null; finished?: FinishResult }> {
  const settings = await loadEngineSettings(service);
  if (!settings.enabled) throw new Error('The adaptive check is switched off right now.');
  const { data: open } = await service.from('baseline_sessions').select('id').eq('student_id', studentId).eq('subject_id', subjectId).eq('status', 'in_progress').order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (open) { const q = await currentQuestion(service, (open as any).id); return { sessionId: (open as any).id, question: q.question, finished: q.finished }; }
  const loaded = await ensureGraph(service, subjectId);
  const askable = await askableSet(service, loaded.graph, settings);
  let cfg: Partial<EngineConfig> = { ...settings };
  let focusIds: string[] | undefined;
  if (opts.mini) {
    const prev = await latestBaselineRow(service, studentId, subjectId);
    if (!prev) throw new Error('Take the full check first; the short re-check follows up on it.');
    const ids = new Set<string>();
    for (const g of ((prev.gaps ?? []) as any[])) { ids.add(g.rootId); for (const t of g.affectedTargetIds ?? []) ids.add(t); }
    const { data: weak } = await service.from('student_competency_mastery').select('competency_id, status').eq('student_id', studentId).in('status', ['developing', 'requires_strengthening']);
    for (const w of (weak ?? []) as any[]) ids.add(w.competency_id);
    focusIds = [...ids].filter((i) => loaded.graph.get(i) && askable.has(i)).slice(0, 14);
    if (focusIds.length === 0) throw new Error('Nothing needs a re-check right now.');
    cfg = { ...settings, minQuestions: Math.min(6, focusIds.length), recommendedMin: 8, recommendedMax: 12, maxQuestions: 18, confidenceThreshold: 0.75 };
  }
  const state = newState(loaded.graph, (id) => askable.has(id), cfg, focusIds);
  const { data: prevMastery } = await service.from('student_competency_mastery').select('competency_id, status').eq('student_id', studentId);
  const prevStatus: Record<string, string> = {};
  for (const r of (prevMastery ?? []) as any[]) prevStatus[r.competency_id] = r.status;
  const wrap: SessionWrap = { engine: state, prevStatus, languageMismatch: !!opts.languageMismatch };
  const { data: row, error } = await service.from('baseline_sessions').insert({ student_id: studentId, subject_id: subjectId, kind: opts.mini ? 'mini' : 'full', status: 'in_progress', state: wrap, seen_items: [] }).select('id').single();
  if (error || !row) throw new Error('Could not start the check.');
  const sessionId = (row as any).id as string;
  const nxt = await advance(service, sessionId);
  return { sessionId, question: nxt.question, finished: nxt.finished };
}

async function loadSession(service: SupabaseClient, sessionId: string) {
  const { data } = await service.from('baseline_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!data) throw new Error('This check was not found.');
  return data as any;
}

async function currentQuestion(service: SupabaseClient, sessionId: string): Promise<{ question: StudentQuestion | null; finished?: FinishResult }> {
  const s = await loadSession(service, sessionId);
  if (s.status === 'completed') return { question: null, finished: await finishedResult(service, s) };
  if (s.current) return { question: await viewOf(service, s) };
  return advance(service, sessionId);
}

async function viewOf(service: SupabaseClient, s: any): Promise<StudentQuestion | null> {
  const cur = s.current;
  if (!cur) return null;
  const wrap: SessionWrap = s.state;
  const { data: comp } = await service.from('competencies').select('name, class_level').eq('id', cur.competencyId).maybeSingle();
  const item = await loadItem(service, cur.itemTable, cur.itemId);
  if (!item) return null;
  const name = (comp as any)?.name ?? 'this skill', cl = (comp as any)?.class_level ?? 10;
  const why = (WHY[cur.kind] ?? WHY.target)(name, cl, wrap.engine.config.targetClass);
  return {
    sessionId: s.id, step: cur.step, itemTable: cur.itemTable, itemId: cur.itemId, competencyId: cur.competencyId,
    prompt: item.prompt, questionType: item.questionType, options: item.options, inputKind: inputKindOf(item.questionType, item.expected), difficulty: item.difficulty,
    figureUrl: item.figureUrl, figureCaption: item.figureCaption, why, classLevel: cl, skillName: name,
    progress: { answered: wrap.engine.answered.length, recommendedMin: wrap.engine.config.recommendedMin, recommendedMax: wrap.engine.config.recommendedMax },
  };
}

export async function loadItem(service: SupabaseClient, table: string, id: string): Promise<PickedItem | null> {
  if (table === 'baseline_items') {
    const { data } = await service.from('baseline_items').select('id, prompt, question_type, options, expected_answer, explanation, difficulty, cognitive_dimension, expected_time_seconds').eq('id', id).maybeSingle();
    const r: any = data; if (!r) return null;
    return { table: 'baseline_items', id: r.id, prompt: r.prompt, questionType: r.question_type, options: r.options ?? null, expected: r.expected_answer, explanation: r.explanation ?? null, difficulty: r.difficulty ?? 2, figureUrl: null, figureCaption: null, dimension: r.cognitive_dimension ?? 'application', expectedSeconds: r.expected_time_seconds ?? null, reused: false };
  }
  if (table !== 'questions' && table !== 'diagnostic_questions') return null;
  const { data } = await service.from(table).select('id, prompt, question_type, options, expected_answer, explanation, difficulty, figure_url, figure_caption').eq('id', id).maybeSingle();
  const r: any = data; if (!r) return null;
  return { table, id: r.id, prompt: r.prompt, questionType: r.question_type, options: r.options ?? null, expected: r.expected_answer, explanation: r.explanation ?? null, difficulty: r.difficulty ?? 3, figureUrl: r.figure_url ?? null, figureCaption: r.figure_caption ?? null, dimension: 'application', expectedSeconds: null, reused: false };
}

/** Decide the next step, store WHY (adaptive_decisions), and either set the next question or finish. */
async function advance(service: SupabaseClient, sessionId: string): Promise<{ question: StudentQuestion | null; finished?: FinishResult }> {
  const s = await loadSession(service, sessionId);
  const wrap: SessionWrap = s.state;
  const settings = await loadEngineSettings(service);
  const loaded = await ensureGraph(service, s.subject_id);
  const base = await askableSet(service, loaded.graph, settings);
  const blocked = new Set<string>();
  const seen = await seenFor(service, s.student_id, s);
  for (let tries = 0; tries < 8; tries++) {
    const d: Decision = decideNext(wrap.engine, loaded.graph, (id) => base.has(id) && !blocked.has(id));
    if (d.action === 'finish') {
      await service.from('adaptive_decisions').insert({ attempt_id: sessionId, student_id: s.student_id, step: wrap.engine.answered.length + 1, phase: d.phase, action: 'finish', reason: d.reason });
      await service.from('baseline_sessions').update({ state: wrap, current: null, updated_at: new Date().toISOString() }).eq('id', sessionId);
      return { question: null, finished: await finishSession(service, sessionId) };
    }
    const comp = loaded.graph.get(d.competencyId!)!;
    const item = await pickItem(service, comp, d.difficulty ?? 3, seen, settings, wrap.engine.answered.length + tries * 13 + 1);
    if (!item) { blocked.add(comp.id); continue; }
    const step = wrap.engine.answered.length + 1;
    await service.from('adaptive_decisions').insert({ attempt_id: sessionId, student_id: s.student_id, step, phase: d.phase, action: 'ask', competency_id: comp.id, item_table: item.table, item_id: item.id, reason: d.reason, detail: { kind: d.kind, difficulty: d.difficulty, reused: item.reused } });
    const current = { step, itemTable: item.table, itemId: item.id, competencyId: comp.id, difficulty: item.difficulty, kind: d.kind, phase: d.phase, investigationId: d.investigationId ?? null, shownAt: Date.now() };
    await service.from('baseline_sessions').update({ state: wrap, current, updated_at: new Date().toISOString() }).eq('id', sessionId);
    const s2 = await loadSession(service, sessionId);
    return { question: await viewOf(service, s2) };
  }
  // Nothing askable could be found: finish with what is known (lower confidence is stated in the report).
  return { question: null, finished: await finishSession(service, sessionId) };
}

export interface AnswerFeedback { correct: boolean; correctAnswer: string; explanation: string | null; formatProblem?: string }
export interface FinishResult { baselineId: string | null; baseline: Baseline; studentLines: string[]; changes: Array<{ name: string; text: string }> }
export interface BaselineAnswerResult { feedback: AnswerFeedback | null; question: StudentQuestion | null; finished?: FinishResult }

export async function answerBaseline(service: SupabaseClient, studentId: string, sessionId: string, answer: unknown, opts: { hintUsed?: boolean } = {}): Promise<BaselineAnswerResult> {
  const s = await loadSession(service, sessionId);
  if (s.student_id !== studentId) throw new Error('This check belongs to someone else.');
  if (s.status !== 'in_progress' || !s.current) throw new Error('This check is already finished.');
  const wrap: SessionWrap = s.state;
  const cur = s.current;
  const item = await loadItem(service, cur.itemTable, cur.itemId);
  if (!item) throw new Error('The question could not be loaded.');
  const given = extractString(answer);
  const problem = validateAnswer(inputKindOf(item.questionType, item.expected), given);
  if (problem) return { feedback: { correct: false, correctAnswer: '', explanation: null, formatProblem: problem }, question: await viewOf(service, s) };
  const correct = gradeAnswer(item.expected, answer);
  const seconds = Math.max(1, Math.round((Date.now() - (cur.shownAt ?? Date.now())) / 1000));
  const errorType = classifyError({ correct, expected: extractString(item.expected), given, seconds, expectedSeconds: item.expectedSeconds, hintUsed: opts.hintUsed, languageMismatch: wrap.languageMismatch, questionType: item.questionType });
  recordAnswer(wrap.engine, (await ensureGraph(service, s.subject_id)).graph, { competencyId: cur.competencyId, difficulty: cur.difficulty, correct, partial: null, errorType, seconds, expectedSeconds: item.expectedSeconds, hintUsed: !!opts.hintUsed, kind: cur.kind, phase: cur.phase, itemKey: cur.itemId, dimension: item.dimension, questionType: item.questionType, investigationId: cur.investigationId ?? undefined });
  const strength = evidenceStrength({ competencyId: cur.competencyId, correct, difficulty: cur.difficulty, seconds, expectedSeconds: item.expectedSeconds, hintUsed: !!opts.hintUsed, errorType, questionType: item.questionType });
  await service.from('student_competency_evidence').insert({ student_id: studentId, competency_id: cur.competencyId, attempt_id: sessionId, item_table: cur.itemTable, item_id: cur.itemId, correct, difficulty: cur.difficulty, seconds, hint_used: !!opts.hintUsed, error_type: errorType, evidence_strength: strength, source: s.kind === 'mini' ? 'mini_reassessment' : 'baseline' });
  const seen = [...new Set([...(s.seen_items ?? []), cur.itemId])];
  await service.from('baseline_sessions').update({ state: wrap, current: null, seen_items: seen, questions_answered: wrap.engine.answered.length, updated_at: new Date().toISOString() }).eq('id', sessionId);
  const feedback: AnswerFeedback = { correct, correctAnswer: extractString(item.expected), explanation: item.explanation };
  const nxt = await advance(service, sessionId);
  return { feedback, question: nxt.question, finished: nxt.finished };
}

async function latestBaselineRow(service: SupabaseClient, studentId: string, subjectId: string) {
  const { data } = await service.from('student_baselines').select('*').eq('student_id', studentId).eq('subject_id', subjectId).order('version', { ascending: false }).limit(1).maybeSingle();
  return data as any;
}

async function finishSession(service: SupabaseClient, sessionId: string): Promise<FinishResult> {
  const s = await loadSession(service, sessionId);
  if (s.status === 'completed') return finishedResult(service, s);
  const wrap: SessionWrap = s.state;
  const loaded = await ensureGraph(service, s.subject_id);
  const baseline = buildBaseline(loaded.graph, wrap.engine);
  const est = estimates(wrap.engine, loaded.graph);
  const changes = compareEstimates(loaded.graph, wrap.prevStatus, est).map((c) => ({ competencyId: c.competencyId, name: c.name, from: c.from, to: c.to, text: c.text }));
  const prev = await latestBaselineRow(service, s.student_id, s.subject_id);
  const version = (prev?.version ?? 0) + 1;
  const { data: row } = await service.from('student_baselines').insert({
    student_id: s.student_id, subject_id: s.subject_id, version, attempt_id: sessionId,
    target: { board: 'CBSE', classLevel: baseline.targetClass, exam: 'Class X Board Examination' },
    profile: { domains: baseline.profile, dimensions: baseline.dimensions, strengths: baseline.strengths, questionsAsked: baseline.questionsAsked, targetsDemonstrated: baseline.targetsDemonstrated, targetsTotal: baseline.targetsTotal, confidenceNote: baseline.confidenceNote },
    overall: baseline.overall, gaps: baseline.gaps, starting_point: baseline.startingPoint, confidence: baseline.confidence, changes,
  }).select('id').single();
  const baselineId = (row as any)?.id ?? null;
  // mastery rows for every competency with evidence
  const now = new Date().toISOString();
  const upserts = [...est.values()].map((e) => ({ student_id: s.student_id, competency_id: e.competencyId, alpha: e.alpha, beta: e.beta, mastery: e.mastery, confidence: e.confidence, evidence_count: e.evidenceCount, status: e.status, last_evaluated: now, updated_at: now }));
  for (let i = 0; i < upserts.length; i += 100) await service.from('student_competency_mastery').upsert(upserts.slice(i, i + 100), { onConflict: 'student_id,competency_id' });
  // learning path: supersede the old one
  await service.from('learning_paths').update({ status: 'superseded' }).eq('student_id', s.student_id).eq('subject_id', s.subject_id).eq('status', 'active');
  const { data: lp } = await service.from('learning_paths').insert({ student_id: s.student_id, subject_id: s.subject_id, baseline_id: baselineId, status: 'active' }).select('id').single();
  if (lp && baseline.path.length) {
    const nodes = baseline.path.map((n) => ({ path_id: (lp as any).id, seq: n.seq, competency_id: n.competencyId, stage: n.stage, reason: n.reason, status: 'todo' }));
    for (let i = 0; i < nodes.length; i += 100) await service.from('learning_path_nodes').insert(nodes.slice(i, i + 100));
  }
  await service.from('baseline_sessions').update({ status: 'completed', finished_at: now, baseline_id: baselineId, state: wrap, current: null, updated_at: now }).eq('id', sessionId);
  return { baselineId, baseline, studentLines: studentReport(baseline, 'Mathematics'), changes: changes.map((c) => ({ name: c.name, text: c.text })) };
}

async function finishedResult(service: SupabaseClient, s: any): Promise<FinishResult> {
  const { data: b } = s.baseline_id ? await service.from('student_baselines').select('*').eq('id', s.baseline_id).maybeSingle() : { data: null };
  const loaded = await ensureGraph(service, s.subject_id);
  const baseline = buildBaseline(loaded.graph, (s.state as SessionWrap).engine);
  return { baselineId: s.baseline_id ?? null, baseline, studentLines: studentReport(baseline, 'Mathematics'), changes: (((b as any)?.changes) ?? []).map((c: any) => ({ name: c.name, text: c.text })) };
}

/** Leave a check half-way: nothing is lost, the student continues from the same question later. */
export async function pauseNote(): Promise<string> { return 'Your progress is saved. Come back any time and continue from the same place.'; }

// ---------------------------------------------------------------- reading results -----------------------------------
export interface StoredBaseline { id: string; version: number; createdAt: string; overall: any; profile: any; gaps: any[]; startingPoint: any; confidence: string; changes: any[]; path: Array<{ nodeId?: string; seq: number; competencyId: string; name: string; classLevel: number; stage: string; reason: string; status: string; skillId: string | null }> }

export async function loadStoredBaseline(service: SupabaseClient, studentId: string, subjectId: string): Promise<StoredBaseline | null> {
  const b = await latestBaselineRow(service, studentId, subjectId);
  if (!b) return null;
  const { data: lp } = await service.from('learning_paths').select('id').eq('baseline_id', b.id).maybeSingle();
  let path: StoredBaseline['path'] = [];
  if (lp) {
    const { data: nodes } = await service.from('learning_path_nodes').select('id, seq, competency_id, stage, reason, status, competencies(name, class_level, skill_id)').eq('path_id', (lp as any).id).order('seq');
    path = ((nodes ?? []) as any[]).map((n) => ({ nodeId: n.id, seq: n.seq, competencyId: n.competency_id, name: n.competencies?.name ?? '', classLevel: n.competencies?.class_level ?? 0, stage: n.stage, reason: n.reason, status: n.status, skillId: n.competencies?.skill_id ?? null }));
  }
  return { id: b.id, version: b.version, createdAt: b.created_at, overall: b.overall, profile: b.profile, gaps: b.gaps ?? [], startingPoint: b.starting_point, confidence: b.confidence, changes: b.changes ?? [], path };
}

/** The baseline shaped like the in-memory one, so the same wording functions serve every audience. */
export function asBaseline(sb: StoredBaseline, targetClass = 10): Baseline {
  return {
    targetClass, profile: sb.profile?.domains ?? [], dimensions: sb.profile?.dimensions ?? [], overall: sb.overall, gaps: sb.gaps as any, strengths: sb.profile?.strengths ?? [],
    confidence: sb.confidence as any, confidenceNote: sb.profile?.confidenceNote ?? '', questionsAsked: sb.profile?.questionsAsked ?? 0, startingPoint: sb.startingPoint,
    path: sb.path.map((p) => ({ seq: p.seq, competencyId: p.competencyId, name: p.name, classLevel: p.classLevel, stage: p.stage as any, reason: p.reason, skillId: p.skillId })),
    milestones: ['Mock examination', 'Readiness check'], targetsDemonstrated: sb.profile?.targetsDemonstrated ?? 0, targetsTotal: sb.profile?.targetsTotal ?? 0,
  };
}

// ---------------------------------------------------------------- continuous baseline -------------------------------
/** Any later evidence (quiz, practice, tutor session, path practice) updates the same mastery rows. Best effort; never blocks the caller. */
export async function recordCompetencyEvidence(service: SupabaseClient, studentId: string, o: { competencyId?: string; skillId?: string; correct: boolean; difficulty?: number; source: string; itemTable?: string; itemId?: string; seconds?: number | null }): Promise<void> {
  try {
    let compId = o.competencyId;
    if (!compId && o.skillId) { const { data } = await service.from('competencies').select('id').eq('skill_id', o.skillId).maybeSingle(); compId = (data as any)?.id; }
    if (!compId) return;
    await service.from('student_competency_evidence').insert({ student_id: studentId, competency_id: compId, item_table: o.itemTable ?? null, item_id: o.itemId ?? null, correct: o.correct, difficulty: o.difficulty ?? 3, seconds: o.seconds ?? null, source: o.source, evidence_strength: 1 });
    const { data: rows } = await service.from('student_competency_evidence').select('correct, difficulty, seconds, hint_used, error_type').eq('student_id', studentId).eq('competency_id', compId).limit(200);
    const items: EvidenceItem[] = ((rows ?? []) as any[]).map((r) => ({ competencyId: compId!, correct: r.correct, difficulty: r.difficulty ?? 3, seconds: r.seconds, hintUsed: r.hint_used, errorType: r.error_type }));
    const e = estimateFrom(compId, items);
    const now = new Date().toISOString();
    await service.from('student_competency_mastery').upsert({ student_id: studentId, competency_id: compId, alpha: e.alpha, beta: e.beta, mastery: e.mastery, confidence: e.confidence, evidence_count: e.evidenceCount, status: e.status, last_evaluated: now, updated_at: now }, { onConflict: 'student_id,competency_id' });
  } catch { /* evidence is best-effort */ }
}

/** Practice on one path step. Returns the next item (no answer key) and, after an answer, whether the step is now secure. */
export async function practiceStep(service: SupabaseClient, studentId: string, nodeId: string, answer?: { itemTable: string; itemId: string; answer: unknown }): Promise<{ feedback?: AnswerFeedback; done?: boolean; mastery?: number; item?: { itemTable: string; itemId: string; prompt: string; questionType: string; options: string[] | null; inputKind: InputKind; difficulty: number; figureUrl: string | null; figureCaption: string | null } | null; name?: string }> {
  const { data: node } = await service.from('learning_path_nodes').select('id, path_id, competency_id, status, learning_paths!inner(student_id, subject_id)').eq('id', nodeId).maybeSingle();
  const n: any = node;
  if (!n || n.learning_paths.student_id !== studentId) throw new Error('This step was not found.');
  const { data: comp } = await service.from('competencies').select('id, code, name, class_level, skill_id, chapter, topic, domain, cognitive_level, importance').eq('id', n.competency_id).single();
  const c: any = comp;
  let feedback: AnswerFeedback | undefined;
  if (answer) {
    const item = await loadItem(service, answer.itemTable, answer.itemId);
    if (!item) throw new Error('The question could not be loaded.');
    const given = extractString(answer.answer);
    const problem = validateAnswer(inputKindOf(item.questionType, item.expected), given);
    if (problem) return { feedback: { correct: false, correctAnswer: '', explanation: null, formatProblem: problem }, item: await shapeItem(item), name: c.name };
    const ok = gradeAnswer(item.expected, answer.answer);
    feedback = { correct: ok, correctAnswer: extractString(item.expected), explanation: item.explanation };
    await recordCompetencyEvidence(service, studentId, { competencyId: c.id, correct: ok, difficulty: item.difficulty, source: 'path_practice', itemTable: item.table, itemId: item.id });
  }
  const { data: m } = await service.from('student_competency_mastery').select('mastery, evidence_count, status').eq('student_id', studentId).eq('competency_id', c.id).maybeSingle();
  const mm: any = m;
  const done = !!mm && mm.status === 'demonstrated' && mm.evidence_count >= 3;
  if (done && n.status !== 'done') await service.from('learning_path_nodes').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', nodeId);
  if (done) return { feedback, done: true, mastery: mm.mastery, item: null, name: c.name };
  const settings = await loadEngineSettings(service);
  const seen = await seenFor(service, studentId, {});
  const wanted = mm && mm.mastery >= 0.6 ? 3 : 2;
  const item = await pickItem(service, { id: c.id, code: c.code, classLevel: c.class_level, name: c.name, domain: c.domain, importance: c.importance, skillId: c.skill_id, cognitiveLevel: c.cognitive_level } as Competency, wanted, seen, settings, (mm?.evidence_count ?? 0) + 1);
  return { feedback, done: false, mastery: mm?.mastery, item: item ? await shapeItem(item) : null, name: c.name };
}
async function shapeItem(i: PickedItem) { return { itemTable: i.table, itemId: i.id, prompt: i.prompt, questionType: i.questionType, options: i.options, inputKind: inputKindOf(i.questionType, i.expected), difficulty: i.difficulty, figureUrl: i.figureUrl, figureCaption: i.figureCaption }; }

