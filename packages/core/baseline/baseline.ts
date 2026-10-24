// v62: turns the evidence into a baseline: a profile per domain (never one class label), gaps with severity, a starting
// point, a personal learning path and the reports. Pure code. All wording is neutral: no "weak student", no "Class 7 student".
import { CompetencyGraph, type Competency } from './graph';
import { estimateAll, type CompetencyEstimate, type EvidenceConfidence, type EvidenceItem } from './evidence';
import { evidenceList, type AdaptiveState, type Investigation } from './selector';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATERIAL_GAP';
export const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NO_MATERIAL_GAP'];

export interface DomainProfile {
  domain: string;
  label: string;
  demonstratedLevel: number | null;
  developingLevel: number | null;
  assessedLevels: number[];
  text: string;
  confidence: EvidenceConfidence;
  evidence: number;
}
export interface DimensionProfile { dimension: string; correctShare: number | null; answers: number; text: string }
export interface LearningGap {
  rootId: string;
  rootName: string;
  rootClass: number;
  floorId?: string;
  floorName?: string;
  floorClass?: number;
  severity: Severity;
  levelsBelow: number | null;
  atLeast: boolean;
  affectedTargetIds: string[];
  affectedNames: string[];
  why: string;
  recommended: string;
}
export interface PathNode { seq: number; competencyId: string; name: string; classLevel: number; stage: PathStage; reason: string; skillId?: string | null }
export type PathStage = 'prerequisite_repair' | 'foundation' | 'core' | 'application' | 'reasoning';
export interface Baseline {
  targetClass: number;
  profile: DomainProfile[];
  dimensions: DimensionProfile[];
  overall: { text: string; lowLevel: number | null; highLevel: number | null; varies: boolean };
  gaps: LearningGap[];
  strengths: string[];
  confidence: EvidenceConfidence;
  confidenceNote: string;
  questionsAsked: number;
  startingPoint: PathNode | null;
  path: PathNode[];
  milestones: string[];
  targetsDemonstrated: number;
  targetsTotal: number;
}

export const DOMAIN_LABELS: Record<string, string> = { arithmetic: 'Arithmetic and number', algebra: 'Algebra', geometry: 'Geometry and trigonometry', mensuration: 'Mensuration', data: 'Data and probability', general: 'General' };
const DIMENSION_LABELS: Record<string, string> = { knowledge: 'Recall of facts and rules', conceptual: 'Understanding of concepts', application: 'Applying a method', analysis: 'Breaking a problem down', reasoning: 'Multi-step reasoning', problem_solving: 'Solving an unfamiliar problem', interpretation: 'Reading graphs, tables and situations', communication: 'Explaining reasoning' };

const roundLevel = (x: number) => Math.round(x);

function levelMastery(graph: CompetencyGraph, est: Map<string, CompetencyEstimate>, domain: string, level: number): { m: number; n: number; direct: number } | null {
  // Skills asked directly at this level speak for the level. Skills only inferred from harder answers are used only when
  // nothing at the level was asked directly, so a weakly-inferred neighbour cannot drag down a level that was tested.
  const rows: Array<{ e: CompetencyEstimate }> = [];
  for (const c of graph.all()) {
    if (c.domain !== domain || c.classLevel !== level) continue;
    const e = est.get(c.id);
    if (e && (e.evidenceCount > 0 || e.inferredCount > 0)) rows.push({ e });
  }
  if (rows.length === 0) return null;
  const directRows = rows.filter((r) => r.e.evidenceCount > 0);
  const use = directRows.length ? directRows : rows;
  let sw = 0, sm = 0, direct = 0;
  for (const { e } of use) {
    const w = e.evidenceCount > 0 ? e.evidenceCount : 0.4 * e.inferredCount;
    sw += w; sm += w * e.mastery; direct += e.evidenceCount;
  }
  return { m: sm / sw, n: use.length, direct };
}

export function buildProfile(graph: CompetencyGraph, est: Map<string, CompetencyEstimate>, targetClass: number): DomainProfile[] {
  const domains = [...new Set(graph.all().map((c) => c.domain))].filter((d) => d !== 'general');
  const out: DomainProfile[] = [];
  for (const domain of domains) {
    const levels = [...new Set(graph.all().filter((c) => c.domain === domain).map((c) => c.classLevel))].sort((a, b) => a - b);
    const per = levels.map((l) => ({ l, v: levelMastery(graph, est, domain, l) })).filter((x) => x.v);
    const label = DOMAIN_LABELS[domain] ?? domain;
    if (per.length === 0) { out.push({ domain, label, demonstratedLevel: null, developingLevel: null, assessedLevels: [], text: 'not enough evidence yet', confidence: 'low', evidence: 0 }); continue; }
    const secure = per.filter((x) => x.v!.m >= 0.66);
    const dem = secure.length ? Math.max(...secure.map((x) => x.l)) : null;
    const developing = per.filter((x) => x.v!.m >= 0.45 && x.v!.m < 0.66 && (dem === null || x.l > dem)).map((x) => x.l);
    const dev = developing.length ? Math.max(...developing) : null;
    const evidence = per.reduce((s, x) => s + x.v!.direct, 0);
    const conf: EvidenceConfidence = evidence >= 6 ? 'high' : evidence >= 3 ? 'medium' : 'low';
    let text: string;
    if (dem !== null && dem >= targetClass) text = `target-level (Class ${targetClass}) skills demonstrated`;
    else if (dem !== null) text = `demonstrated around Class ${dem}${dev && dev > dem ? `, developing towards Class ${dev}` : ''} skills`;
    else if (dev !== null) text = `developing around Class ${dev} skills`;
    else text = `needs strengthening from Class ${per[0].l} skills`;
    out.push({ domain, label, demonstratedLevel: dem, developingLevel: dev, assessedLevels: per.map((x) => x.l), text, confidence: conf, evidence });
  }
  return out;
}

export function buildDimensions(state: AdaptiveState): DimensionProfile[] {
  const by = new Map<string, { s: number; n: number }>();
  for (const a of state.answered) {
    if (!a.dimension) continue;
    const cur = by.get(a.dimension) ?? { s: 0, n: 0 };
    cur.n++; cur.s += a.correct ? 1 : a.errorType && ['CALCULATION_ERROR', 'CARELESS_ERROR', 'READING_ERROR', 'QUESTION_MISREAD'].includes(a.errorType) ? 0.45 : 0;
    by.set(a.dimension, cur);
  }
  return [...by.entries()].map(([dimension, v]) => {
    const share = v.n >= 2 ? Math.round((v.s / v.n) * 100) / 100 : null;
    const label = DIMENSION_LABELS[dimension] ?? dimension;
    const text = share === null ? `${label}: not enough evidence yet` : share >= 0.75 ? `${label}: secure so far` : share >= 0.5 ? `${label}: developing` : `${label}: needs strengthening`;
    return { dimension, correctShare: share, answers: v.n, text };
  }).sort((a, b) => a.dimension.localeCompare(b.dimension));
}

const levelOf = (graph: CompetencyGraph, id?: string) => (id ? graph.get(id)?.classLevel : undefined);

function severityFor(k: number, levelsBelow: number | null, broad: number, devOnly: boolean): Severity {
  if (devOnly) return 'LOW';
  if (k >= 3 || (broad >= 5 && k >= 2) || ((levelsBelow ?? 0) >= 2 && k >= 2)) return 'CRITICAL';
  if (k === 2 || (levelsBelow ?? 0) >= 2) return 'HIGH';
  if (k === 1 && (levelsBelow ?? 0) >= 1) return 'MEDIUM';
  return 'MEDIUM';
}

export function buildGaps(graph: CompetencyGraph, est: Map<string, CompetencyEstimate>, state: AdaptiveState): LearningGap[] {
  const T = state.config.targetClass;
  const isFocus = (c: Competency) => (state.focusIds ? state.focusIds.includes(c.id) : c.classLevel === T);
  const roots = new Map<string, { floorId?: string; atLeast: boolean }>();
  for (const inv of state.investigations) {
    const lowestFailing = inv.chain[inv.chain.length - 1];
    roots.set(lowestFailing, { floorId: inv.status === 'located' ? inv.floorId : undefined, atLeast: inv.status === 'exhausted' });
  }
  for (const c of graph.all()) {
    if (!isFocus(c)) continue;
    const e = est.get(c.id);
    if (!e || e.evidenceCount === 0) continue;
    if ((e.status === 'requires_strengthening' || e.status === 'developing') && ![...roots.keys()].some((r) => r === c.id || graph.descendants(r).includes(c.id))) roots.set(c.id, { atLeast: false });
  }
  const gaps: LearningGap[] = [];
  for (const [rootId, info] of roots) {
    const root = graph.get(rootId)!;
    const re = est.get(rootId);
    const reach = [rootId, ...graph.descendants(rootId)].map((i) => graph.get(i)!).filter(Boolean);
    const affected = reach.filter((c) => isFocus(c) && (est.get(c.id)?.status !== 'demonstrated'));
    const affectedAsked = affected.filter((c) => (est.get(c.id)?.evidenceCount ?? 0) > 0);
    const devOnly = !!re && re.status === 'developing' && affectedAsked.every((c) => est.get(c.id)?.status !== 'requires_strengthening') && !state.investigations.some((i) => i.chain.includes(rootId) && i.chain.length > 1);
    const floorClass = info.floorId ? levelOf(graph, info.floorId) : undefined;
    const levelsBelow = floorClass != null ? T - floorClass : info.atLeast ? T - root.classLevel + 1 : root.classLevel < T ? T - root.classLevel + 1 : 0;
    const sev = severityFor(affectedAsked.length || 1, levelsBelow, reach.length, devOnly);
    const names = affected.map((c) => c.name);
    const where = floorClass != null ? `Skills up to "${graph.get(info.floorId!)!.name}" (Class ${floorClass}) were demonstrated; the first skill needing work is "${root.name}" (Class ${root.classLevel}).` : `"${root.name}" (Class ${root.classLevel}) needs strengthening${info.atLeast ? '; the evidence did not find a secure lower step within the limit checked, so this may start earlier' : ''}.`;
    gaps.push({
      rootId, rootName: root.name, rootClass: root.classLevel, floorId: info.floorId, floorName: info.floorId ? graph.get(info.floorId)?.name : undefined, floorClass,
      severity: sev, levelsBelow: root.classLevel >= T && !info.floorId ? 0 : levelsBelow, atLeast: info.atLeast,
      affectedTargetIds: affected.map((c) => c.id), affectedNames: names,
      why: names.length ? `${where} It is needed for: ${names.slice(0, 4).join('; ')}${names.length > 4 ? ` and ${names.length - 4} more` : ''}.` : where,
      recommended: `Start with "${root.name}", then move up through the skills that depend on it, then return to the Class ${T} topics.`,
    });
  }
  return gaps.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.rootClass - b.rootClass || a.rootName.localeCompare(b.rootName));
}

function stageFor(c: Competency, T: number): PathStage {
  if (c.classLevel < T) return 'prerequisite_repair';
  const cl = (c.cognitiveLevel ?? 'apply').toLowerCase();
  if (cl === 'analyse' || cl === 'analyze' || cl === 'reasoning') return 'reasoning';
  if (cl === 'apply') return 'application';
  return 'core';
}

export function buildPath(graph: CompetencyGraph, est: Map<string, CompetencyEstimate>, state: AdaptiveState, gaps: LearningGap[]): PathNode[] {
  const T = state.config.targetClass;
  const isFocus = (c: Competency) => (state.focusIds ? state.focusIds.includes(c.id) : c.classLevel === T);
  const include = new Map<string, string>(); // id -> reason
  // First untested prerequisites under a failing chain whose floor was not found (so the path can start a little lower, with a check first).
  const frontier = new Set<string>();
  for (const inv of state.investigations) {
    if (inv.status === 'located') continue;
    const last = inv.chain[inv.chain.length - 1];
    for (const p of graph.prerequisites(last)) { const pc = graph.get(p); if (pc && pc.classLevel < T && !inv.passed.includes(p) && est.get(p)?.status !== 'demonstrated') frontier.add(p); }
  }
  for (const g of gaps) {
    if (g.severity === 'NO_MATERIAL_GAP') continue;
    const set = [g.rootId, ...graph.descendants(g.rootId)].filter((id) => {
      const c = graph.get(id); const e = est.get(id);
      if (!c) return false;
      if (e?.status === 'demonstrated') return false;
      if (c.classLevel > T) return false;
      // Lower-class items are kept only when the evidence points at them: the gap itself, a skill answered wrongly or
      // only partly, or the first untested step below a gap whose floor was not found. Skills nobody asked about are
      // NOT added wholesale (that would send a student back through classes they may already know).
      if (id === g.rootId) return true;
      if (c.classLevel >= T) return g.affectedTargetIds.some((t) => t === id || graph.ancestors(t).includes(id));
      if (e && e.evidenceCount > 0) return g.affectedTargetIds.some((t) => graph.ancestors(t).includes(id));
      return frontier.has(id);
    });
    for (const id of set) {
      if (include.has(id)) continue;
      const c = graph.get(id)!;
      const target = g.affectedNames[0] ?? g.rootName;
      include.set(id, c.classLevel < T
        ? `You are learning this Class ${c.classLevel} skill because it is a prerequisite for "${target}" in Class ${T}.`
        : `This Class ${T} topic builds on "${g.rootName}" (Class ${g.rootClass}), which comes first in your path.`);
    }
  }
  // Target topics not yet shown to be secure and not already in the path: begin with a short check.
  for (const c of graph.all()) {
    if (!isFocus(c) || include.has(c.id)) continue;
    const e = est.get(c.id);
    if (e?.status === 'demonstrated') continue;
    include.set(c.id, e && e.evidenceCount > 0 ? `This Class ${T} topic is still developing; practice will strengthen it.` : `This Class ${T} topic has not been checked in depth yet; it starts with a quick check.`);
  }
  const ordered = graph.topoOrder([...include.keys()]);
  return ordered.map((id, i) => { const c = graph.get(id)!; return { seq: i + 1, competencyId: id, name: c.name, classLevel: c.classLevel, stage: stageFor(c, T), reason: include.get(id)!, skillId: c.skillId ?? null }; });
}

export function buildBaseline(graph: CompetencyGraph, state: AdaptiveState, extra: EvidenceItem[] = []): Baseline {
  const est = estimateAll([...evidenceList(state, graph), ...extra]);
  const T = state.config.targetClass;
  const profile = buildProfile(graph, est, T);
  const dimensions = buildDimensions(state);
  const gaps = buildGaps(graph, est, state);
  const path = buildPath(graph, est, state, gaps);
  const levels = profile.map((p) => p.demonstratedLevel).filter((x): x is number => x != null);
  const low = levels.length ? Math.min(...levels) : null, high = levels.length ? Math.max(...levels) : null;
  const varies = low != null && high != null && high - low >= 2;
  let overallText: string;
  if (low === null) overallText = 'There is not enough evidence yet to describe current skills across domains.';
  else if (low >= T) overallText = `Current evidence shows target-level (Class ${T}) skills across the topics checked.`;
  else overallText = `Current demonstrated competency is approximately aligned with Class ${roundLevel(low)}${high! > low ? `–${roundLevel(high!)}` : ''} prerequisite skills${varies ? ', with significant variation between domains' : ''}. This is not an official class placement.`;
  const focus = graph.all().filter((c) => (state.focusIds ? state.focusIds.includes(c.id) : c.classLevel === T));
  const targetsDemonstrated = focus.filter((c) => est.get(c.id)?.status === 'demonstrated').length;
  const direct = state.answered.length;
  const assessedDomains = profile.filter((p) => p.evidence > 0).length;
  const confidence: EvidenceConfidence = direct >= 25 && assessedDomains >= 3 ? 'high' : direct >= 12 && assessedDomains >= 2 ? 'medium' : 'low';
  const confidenceNote = confidence === 'high' ? 'Many questions across several domains support this picture.' : confidence === 'medium' ? 'The picture is reasonable but some skills have only one or two questions behind them.' : 'Few questions so far; treat this as a first starting point and expect it to be refined.';
  const strengths = profile.filter((p) => p.demonstratedLevel != null && p.demonstratedLevel >= T).map((p) => p.label)
    .concat(profile.filter((p) => p.demonstratedLevel != null && p.demonstratedLevel < T && !gaps.some((g) => graph.get(g.rootId)?.domain === p.domain)).map((p) => p.label));
  const startingPoint = path.find((n) => n.stage === 'prerequisite_repair') ?? path[0] ?? null;
  return { targetClass: T, profile, dimensions, overall: { text: overallText, lowLevel: low, highLevel: high, varies }, gaps, strengths: [...new Set(strengths)], confidence, confidenceNote, questionsAsked: direct, startingPoint, path, milestones: ['Mock examination', 'Readiness check'], targetsDemonstrated, targetsTotal: focus.length };
}

// ---------------------------------------------------------------- wording (reports) ----------------------------------
export const BANNED_PHRASES = ['weak student', 'poor student', 'class 7 student', 'class 8 student', 'class 9 student', 'below-average', 'below average child', 'slow learner', 'lazy', 'dumb', 'failed the test'];

export const PARENT_EXPLANATION = "Your child's school class and current demonstrated skill level are not necessarily the same. Sahayak has identified specific prerequisite skills that may need strengthening before some Class 10 concepts can be mastered. Sahayak is identifying the starting point, not judging the child.";

const sevWord: Record<Severity, string> = { CRITICAL: 'a skill many other topics depend on', HIGH: 'affects several topics', MEDIUM: 'affects some topics', LOW: 'a small gap', NO_MATERIAL_GAP: 'no material gap' };

export function studentReport(b: Baseline, subjectName: string): string[] {
  const lines: string[] = [];
  lines.push('YOUR STARTING POINT');
  lines.push(`You are preparing for CBSE Class ${b.targetClass} ${subjectName}.`);
  lines.push(b.gaps.length === 0 ? `Sahayak found that your skills are already close to what Class ${b.targetClass} expects in the topics it checked.` : 'Sahayak found that your current skills are uneven across topics, which is normal.');
  if (b.strengths.length) lines.push(`Strong areas: ${b.strengths.join(', ')}.`);
  const dev = b.profile.filter((p) => p.demonstratedLevel == null || p.demonstratedLevel < b.targetClass).map((p) => p.label);
  if (dev.length) lines.push(`Areas to strengthen: ${dev.join(', ')}.`);
  if (b.startingPoint) lines.push(`Recommended starting point: ${b.startingPoint.name}.`);
  lines.push(b.gaps.length ? 'You do NOT need to repeat everything from earlier classes. Sahayak will teach only the prerequisite skills needed to reach your Class ' + b.targetClass + ' goals.' : 'You can go straight to the Class ' + b.targetClass + ' topics.');
  lines.push(`How sure is Sahayak? ${b.confidence}. ${b.confidenceNote}`);
  return lines;
}

export function parentReport(b: Baseline, subjectName: string): string[] {
  const lines: string[] = [PARENT_EXPLANATION, `Target: CBSE Class ${b.targetClass} ${subjectName}.`, b.overall.text];
  for (const p of b.profile) lines.push(`${p.label}: ${p.text} (confidence: ${p.confidence}).`);
  if (b.gaps.length) { lines.push('Main gaps:'); for (const g of b.gaps.slice(0, 5)) lines.push(`- ${g.rootName} (typically Class ${g.rootClass}): ${sevWord[g.severity]}. ${g.affectedNames.length ? 'It supports: ' + g.affectedNames.slice(0, 3).join(', ') + '.' : ''}`); }
  if (b.strengths.length) lines.push(`Strengths: ${b.strengths.join(', ')}.`);
  if (b.startingPoint) lines.push(`Recommended starting point: ${b.startingPoint.name}.`);
  lines.push(`Target readiness (Sahayak readiness indicator, not a prediction of marks): ${b.targetsDemonstrated} of ${b.targetsTotal} target topics show early evidence of being secure.`);
  lines.push(`Confidence in this assessment: ${b.confidence}. ${b.confidenceNote}`);
  return lines;
}

export function tutorReport(b: Baseline, subjectName: string): string[] {
  const lines: string[] = [`Target: CBSE Class ${b.targetClass} ${subjectName}.`, 'Current profile:'];
  for (const p of b.profile) lines.push(`- ${p.label}: ${p.text}; evidence ${p.evidence} answers; confidence ${p.confidence}.`);
  if (b.dimensions.length) { lines.push('Skill types:'); for (const d of b.dimensions) lines.push(`- ${d.text}`); }
  const g = b.gaps[0];
  if (g) {
    lines.push(`Priority intervention: ${g.rootName} (${g.severity}).`);
    const repair = b.path.filter((n) => n.stage === 'prerequisite_repair').length;
    lines.push(`Suggested: ${repair} prerequisite learning step${repair === 1 ? '' : 's'} + 5 targeted practice questions per step + 1 confirmation check.`);
  } else lines.push('No priority intervention: target-level work can begin.');
  return lines;
}

export interface GroupGap { competencyId: string; name: string; share: number; count: number; recommendation: string; text: string }
/** Centre / tutor view over several students' baselines. Shows nothing below 3 students so one child is never singled out. */
export function aggregateGaps(rows: Array<{ gaps: Array<Pick<LearningGap, 'rootId' | 'rootName'>> }>, label = 'your linked students'): GroupGap[] | 'insufficient_data' {
  const n = rows.length;
  if (n < 3) return 'insufficient_data';
  const counts = new Map<string, { name: string; c: number }>();
  for (const r of rows) for (const id of new Set(r.gaps.map((g) => g.rootId))) { const cur = counts.get(id) ?? { name: r.gaps.find((g) => g.rootId === id)!.rootName, c: 0 }; cur.c++; counts.set(id, cur); }
  return [...counts.entries()].map(([competencyId, v]) => {
    const share = v.c / n;
    const recommendation = share >= 0.7 ? 'Create a targeted group lesson.' : share >= 0.4 ? 'Run a small-group session.' : 'Handle individually.';
    return { competencyId, name: v.name, share: Math.round(share * 100) / 100, count: v.c, recommendation, text: `${Math.round(share * 100)}% of ${label} show a prerequisite gap in ${v.name}. ${recommendation}` };
  }).sort((a, b) => b.share - a.share);
}

export interface BaselineChange { competencyId: string; name: string; from: string; to: string; text: string }
export function compareEstimates(graph: CompetencyGraph, prev: Record<string, string>, cur: Map<string, CompetencyEstimate>): BaselineChange[] {
  const out: BaselineChange[] = [];
  const words: Record<string, string> = { demonstrated: 'demonstrated', developing: 'developing', requires_strengthening: 'requires strengthening', insufficient_evidence: 'not enough evidence' };
  for (const [id, e] of cur) {
    const before = prev[id];
    if (!before || before === e.status) continue;
    const name = graph.get(id)?.name ?? id;
    out.push({ competencyId: id, name, from: before, to: e.status, text: `${name}: ${words[before] ?? before} → ${words[e.status] ?? e.status}.` });
  }
  return out;
}
