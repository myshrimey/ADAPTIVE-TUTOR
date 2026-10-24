// v62: the adaptive diagnostic state machine. Pure and deterministic given its inputs, so it can be tested with
// simulated students. Every decision carries a plain-words reason (stored in adaptive_decisions).
import { CompetencyGraph, type Competency } from './graph';
import { estimateAll, isExecutionError, type ErrorType, type EvidenceItem, type CompetencyEstimate } from './evidence';

export interface EngineConfig {
  minQuestions: number;
  recommendedMin: number;
  recommendedMax: number;
  maxQuestions: number;
  /** 0..1: the share (by importance) of the target topics that must be settled before the diagnostic may stop */
  confidenceThreshold: number;
  prereqDepth: number;
  targetClass: number;
}
export const DEFAULT_ENGINE_CONFIG: EngineConfig = { minQuestions: 15, recommendedMin: 20, recommendedMax: 30, maxQuestions: 50, confidenceThreshold: 0.8, prereqDepth: 3, targetClass: 10 };

export type Phase = 'target_probe' | 'gap_detection' | 'prerequisite_probe' | 'confirmation' | 'baseline' | 'done';
export type ProbeKind = 'target' | 'confirm' | 'prereq' | 'escalate' | 'spot';

export interface Answered {
  step: number;
  competencyId: string;
  difficulty: number;
  correct: boolean;
  partial?: number | null;
  errorType?: ErrorType | null;
  seconds?: number | null;
  expectedSeconds?: number | null;
  hintUsed?: boolean;
  kind: ProbeKind;
  phase: Phase;
  itemKey?: string;
  dimension?: string;
  questionType?: string;
  investigationId?: number;
}
export interface Investigation {
  id: number;
  rootId: string;
  /** failing competencies, root first, deepest last */
  chain: string[];
  tried: string[];
  passed: string[];
  status: 'descending' | 'located' | 'exhausted';
  floorId?: string;
  floorConfirmed?: boolean;
}
export interface AdaptiveState {
  config: EngineConfig;
  /** one competency per target topic group, in the order they are probed */
  targetOrder: string[];
  answered: Answered[];
  investigations: Investigation[];
  nextInvId: number;
  /** mini-reassessment: only these competencies are the target */
  focusIds?: string[];
}
export interface Decision {
  action: 'ask' | 'finish';
  competencyId?: string;
  difficulty?: number;
  kind?: ProbeKind;
  phase: Phase;
  reason: string;
  investigationId?: number;
}

export const groupOf = (c: Competency) => c.chapter || c.topic || c.name;

export function buildTargetOrder(graph: CompetencyGraph, cfg: EngineConfig, askable: (id: string) => boolean, focusIds?: string[]): string[] {
  const pool = focusIds ? focusIds.map((i) => graph.get(i)).filter((c): c is Competency => !!c) : graph.all().filter((c) => c.classLevel === cfg.targetClass);
  const groups = new Map<string, Competency[]>();
  for (const c of pool) { if (!askable(c.id)) continue; const g = groupOf(c); (groups.get(g) ?? groups.set(g, []).get(g)!).push(c); }
  const picked = [...groups.entries()].map(([g, cs]) => ({ g, c: [...cs].sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name))[0], imp: Math.max(...cs.map((x) => x.importance)) }));
  picked.sort((a, b) => b.imp - a.imp || a.g.localeCompare(b.g));
  return picked.map((p) => p.c.id);
}

export function newState(graph: CompetencyGraph, askable: (id: string) => boolean, config: Partial<EngineConfig> = {}, focusIds?: string[]): AdaptiveState {
  const cfg = { ...DEFAULT_ENGINE_CONFIG, ...config };
  return { config: cfg, targetOrder: buildTargetOrder(graph, cfg, askable, focusIds), answered: [], investigations: [], nextInvId: 1, focusIds };
}

/** Evidence list used for estimates: every answer, plus weak "inferred" support for the prerequisites of a correct harder answer. */
export function evidenceList(state: AdaptiveState, graph: CompetencyGraph): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  for (const a of state.answered) {
    out.push({ competencyId: a.competencyId, correct: a.correct, partial: a.partial, difficulty: a.difficulty, seconds: a.seconds, expectedSeconds: a.expectedSeconds, hintUsed: a.hintUsed, errorType: a.errorType, dimension: a.dimension, questionType: a.questionType });
    if (a.correct && a.difficulty >= 3 && !a.hintUsed) {
      for (const p of graph.ancestors(a.competencyId, 2)) out.push({ competencyId: p, correct: true, difficulty: Math.max(1, a.difficulty - 1), inferred: true });
    }
  }
  return out;
}

export const estimates = (state: AdaptiveState, graph: CompetencyGraph) => estimateAll(evidenceList(state, graph));

const directAnswers = (state: AdaptiveState, id: string) => state.answered.filter((a) => a.competencyId === id);

/** A target topic group is settled when we know enough about it to stop asking, in either direction. */
export function groupSettled(state: AdaptiveState, graph: CompetencyGraph, compId: string): boolean {
  const c = graph.get(compId);
  if (!c) return true;
  const g = groupOf(c);
  const inGroup = (id: string) => { const x = graph.get(id); return !!x && groupOf(x) === g; };
  const ans = state.answered.filter((a) => inGroup(a.competencyId) && a.kind !== 'prereq');
  if (ans.length === 0) return false;
  const last = ans[ans.length - 1];
  const wrong = ans.filter((a) => !a.correct);
  if (last.correct && last.difficulty >= 3) return true;
  if (last.correct && ans.filter((a) => a.correct).length >= 2) return true;
  if (wrong.length > 0 && !last.correct && isExecutionError(last.errorType) && ans.filter((a) => a.competencyId === last.competencyId).length === 1) return false; // slip not yet checked
  const invs = state.investigations.filter((i) => inGroup(i.rootId));
  if (invs.some((i) => i.status !== 'descending')) return true;
  if (wrong.filter((a) => !isExecutionError(a.errorType)).length >= 2) return true;
  return false;
}

/** 0 = nothing left uncertain, 1 = nothing known. Weighted by importance for the target. */
export function uncertainty(state: AdaptiveState, graph: CompetencyGraph): number {
  let total = 0, open = 0;
  for (const id of state.targetOrder) {
    const c = graph.get(id);
    const w = c?.importance ?? 3;
    total += w;
    if (!groupSettled(state, graph, id)) open += w;
  }
  const descending = state.investigations.filter((i) => i.status === 'descending').length;
  if (total === 0) return 0;
  return Math.min(1, (open + descending * 2) / total);
}

const nm = (graph: CompetencyGraph, id?: string) => (id ? graph.get(id)?.name ?? 'this skill' : 'this skill');
const cls = (graph: CompetencyGraph, id?: string) => (id ? graph.get(id)?.classLevel : undefined);

function pendingSlip(state: AdaptiveState): Answered | null {
  // The latest wrong answer that looks like a slip in working, with no second look at that competency yet.
  for (let i = state.answered.length - 1; i >= 0; i--) {
    const a = state.answered[i];
    if (a.correct) continue;
    if (!isExecutionError(a.errorType)) continue;
    if (state.answered.filter((x) => x.competencyId === a.competencyId).length === 1) return a;
  }
  return null;
}

function openInvestigation(state: AdaptiveState, graph: CompetencyGraph, rootId: string): Investigation | null {
  if (state.investigations.some((i) => i.rootId === rootId)) return null;
  if (graph.prerequisites(rootId).length === 0) return null;
  const inv: Investigation = { id: state.nextInvId++, rootId, chain: [rootId], tried: [], passed: [], status: 'descending' };
  state.investigations.push(inv);
  return inv;
}

/** Applies one answer to the state (investigations open, deepen or close). Returns the same state object. */
export function recordAnswer(state: AdaptiveState, graph: CompetencyGraph, a: Omit<Answered, 'step'>): AdaptiveState {
  const ans: Answered = { ...a, step: state.answered.length + 1 };
  const priorForComp = directAnswers(state, ans.competencyId);
  state.answered.push(ans);
  const inv = ans.investigationId != null ? state.investigations.find((i) => i.id === ans.investigationId) : undefined;
  if (inv && (ans.kind === 'prereq' || ans.kind === 'confirm')) {
    const p = ans.competencyId;
    if (ans.kind === 'confirm' && inv.floorId === p) { if (ans.correct) inv.floorConfirmed = true; else { inv.status = 'descending'; inv.floorId = undefined; inv.passed = inv.passed.filter((x) => x !== p); if (!inv.chain.includes(p)) inv.chain.push(p); } return state; }
    if (!inv.tried.includes(p)) inv.tried.push(p);
    if (ans.correct) { if (!inv.passed.includes(p)) inv.passed.push(p); }
    else if (isExecutionError(ans.errorType) && priorForComp.length === 0) { inv.tried = inv.tried.filter((x) => x !== p); /* look again before judging */ }
    else {
      if (!inv.chain.includes(p)) inv.chain.push(p);
      inv.passed = [];
      if (inv.chain.length - 1 >= state.config.prereqDepth) { inv.status = 'exhausted'; inv.floorId = undefined; }
    }
    return state;
  }
  if (!ans.correct) {
    const conceptual = !isExecutionError(ans.errorType) || priorForComp.length > 0;
    if (conceptual) openInvestigation(state, graph, ans.competencyId);
  }
  return state;
}

function candidatesFor(state: AdaptiveState, graph: CompetencyGraph, inv: Investigation, askable: (id: string) => boolean): string[] {
  const cur = inv.chain[inv.chain.length - 1];
  return graph.prerequisites(cur).filter((p) => askable(p) && !inv.tried.includes(p) && !inv.chain.includes(p))
    .sort((a, b) => (graph.get(b)?.importance ?? 0) - (graph.get(a)?.importance ?? 0) || (graph.get(b)?.classLevel ?? 0) - (graph.get(a)?.classLevel ?? 0));
}

export function decideNext(state: AdaptiveState, graph: CompetencyGraph, askable: (id: string) => boolean): Decision {
  const cfg = state.config;
  const n = state.answered.length;
  if (n >= cfg.maxQuestions) return { action: 'finish', phase: 'baseline', reason: `Reached the safety limit of ${cfg.maxQuestions} questions for one session. Remaining uncertainty is recorded and can be continued later.` };

  // 1. A wrong answer that looks like a slip in working: look again with different numbers before judging.
  const slip = pendingSlip(state);
  if (slip) {
    return { action: 'ask', competencyId: slip.competencyId, difficulty: slip.difficulty, kind: 'confirm', phase: 'confirmation', investigationId: slip.investigationId,
      reason: `The last answer on "${nm(graph, slip.competencyId)}" looks like a slip in working (${slip.errorType}) rather than a gap in the idea. Asking a similar question with different numbers before drawing any conclusion.` };
  }

  // 2. Walk down the prerequisite graph for a failed skill.
  for (const inv of state.investigations) {
    if (inv.status !== 'descending') continue;
    const cands = candidatesFor(state, graph, inv, askable);
    const cur = inv.chain[inv.chain.length - 1];
    const breadth = Math.min(2, graph.prerequisites(cur).filter(askable).length);
    if (inv.passed.length >= breadth && breadth > 0) { inv.status = 'located'; inv.floorId = inv.passed[inv.passed.length - 1]; continue; }
    if (cands.length === 0) {
      if (inv.passed.length > 0) { inv.status = 'located'; inv.floorId = inv.passed[inv.passed.length - 1]; } else { inv.status = 'exhausted'; }
      continue;
    }
    const p = cands[0];
    const from = cur === inv.rootId ? `"${nm(graph, cur)}" (Class ${cls(graph, cur)})` : `"${nm(graph, cur)}" (Class ${cls(graph, cur)}), itself a prerequisite`;
    return { action: 'ask', competencyId: p, difficulty: 2, kind: 'prereq', phase: 'prerequisite_probe', investigationId: inv.id,
      reason: `${from} was not answered correctly. Checking its prerequisite "${nm(graph, p)}" (Class ${cls(graph, p)}) to find where the gap starts, instead of assuming a lower level.` };
  }

  // 3. Confirm the lowest skill the student has shown (once).
  for (const inv of state.investigations) {
    if (inv.status === 'located' && inv.floorId && !inv.floorConfirmed && n < cfg.maxQuestions - 1 && askable(inv.floorId)) {
      return { action: 'ask', competencyId: inv.floorId, difficulty: 3, kind: 'confirm', phase: 'confirmation', investigationId: inv.id,
        reason: `"${nm(graph, inv.floorId)}" (Class ${cls(graph, inv.floorId)}) was answered correctly. One more, different question to confirm it before treating it as a secure starting point.` };
    }
  }

  // 4. Sweep the target: one question per target topic.
  for (const id of state.targetOrder) {
    if (directAnswers(state, id).length === 0 && !groupSettled(state, graph, id)) {
      const anyWrong = state.answered.some((a) => !a.correct);
      return { action: 'ask', competencyId: id, difficulty: 3, kind: 'target', phase: anyWrong ? 'gap_detection' : 'target_probe',
        reason: `Target check: "${nm(graph, id)}" (Class ${cls(graph, id)}) is part of what the exam expects; asking at medium difficulty first.` };
    }
  }

  // 5. Stop when enough is known.
  const unc = uncertainty(state, graph);
  const settledEnough = unc <= 1 - cfg.confidenceThreshold;
  if (n >= cfg.minQuestions && settledEnough) return { action: 'finish', phase: 'baseline', reason: `Enough evidence: ${Math.round((1 - unc) * 100)}% of the target topics are settled (limit ${Math.round(cfg.confidenceThreshold * 100)}%) after ${n} questions.` };
  if (n >= cfg.recommendedMax && unc <= 0.35) return { action: 'finish', phase: 'baseline', reason: `Reached the recommended length (${cfg.recommendedMax}) with ${Math.round((1 - unc) * 100)}% of target topics settled: enough for a reliable first starting point.` };

  // 6. Strong so far but little evidence: go harder on the same skill.
  const est = estimates(state, graph);
  const lastCorrect = [...state.answered].reverse().filter((a) => a.correct && (a.kind === 'target' || a.kind === 'escalate') && a.difficulty < 5);
  for (const a of lastCorrect) {
    const c = graph.get(a.competencyId);
    if (!c || c.classLevel !== cfg.targetClass && !state.focusIds) continue;
    const harder = state.answered.filter((x) => x.competencyId === a.competencyId && x.kind === 'escalate').length;
    if (harder >= 2) continue;
    if (state.answered.some((x) => x.competencyId === a.competencyId && !x.correct)) continue;
    if (!askable(a.competencyId)) continue;
    return { action: 'ask', competencyId: a.competencyId, difficulty: Math.min(5, a.difficulty + 1), kind: 'escalate', phase: 'target_probe',
      reason: `"${nm(graph, a.competencyId)}" was correct at difficulty ${a.difficulty} with only ${directAnswers(state, a.competencyId).length} answer; raising difficulty and complexity to see whether the skill holds up.` };
  }

  // 7. Spot-check one untested prerequisite of a skill answered correctly (guards against memorised answers).
  const spots = state.answered.filter((a) => a.kind === 'spot').length;
  if (spots < 3) {
    for (const a of state.answered.filter((x) => x.correct && x.kind !== 'prereq')) {
      for (const p of graph.prerequisites(a.competencyId)) {
        if (!askable(p) || directAnswers(state, p).length > 0) continue;
        const e: CompetencyEstimate | undefined = est.get(p);
        if (e && e.evidenceCount > 0) continue;
        return { action: 'ask', competencyId: p, difficulty: 3, kind: 'spot', phase: 'prerequisite_probe',
          reason: `"${nm(graph, a.competencyId)}" was answered correctly. Spot-checking its prerequisite "${nm(graph, p)}" (Class ${cls(graph, p)}) so a lucky or memorised answer does not hide a gap.` };
      }
    }
  }

  // 8. Anything unsettled and still askable.
  for (const id of state.targetOrder) {
    if (!groupSettled(state, graph, id) && askable(id)) {
      return { action: 'ask', competencyId: id, difficulty: 3, kind: 'confirm', phase: 'confirmation', reason: `"${nm(graph, id)}" is still unsettled; asking another question on it.` };
    }
  }
  return { action: 'finish', phase: 'baseline', reason: n < cfg.minQuestions ? `No more suitable questions are available after ${n} (below the usual minimum of ${cfg.minQuestions}); the report will show lower confidence.` : `No further question would add useful evidence after ${n} questions.` };
}
