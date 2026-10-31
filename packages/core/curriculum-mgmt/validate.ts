import type { NodeKind } from './constants';
export interface CheckNode { id?: string; kind: NodeKind; name: string; parent_id?: string | null; parentKey?: string | null; key?: string; source_page?: number | null; page?: number | null; flagged?: boolean; confidence?: number | null }
export interface CurrIssue { level: 'error' | 'warning' | 'info'; message: string }
export interface CurrCheck { counts: Record<string, number>; issues: CurrIssue[]; errors: number; warnings: number; flagged: number; avgConfidence: number | null; completeness: { chaptersWithTopics: number | null; topicsWithOutcomes: number | null } }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
/** Plain checks on an outline: counts, missing sections, duplicates, empty names, uncertain items. It never says the outline is CORRECT: only a person comparing it with the source can. */
export function checkOutline(nodes: CheckNode[]): CurrCheck {
  const issues: CurrIssue[] = []; const counts: Record<string, number> = { unit: 0, chapter: 0, topic: 0, learning_outcome: 0, assessment_objective: 0 };
  const pid = (n: CheckNode) => n.parent_id ?? n.parentKey ?? null; const id = (n: CheckNode) => n.id ?? n.key ?? '';
  for (const n of nodes) counts[n.kind] = (counts[n.kind] ?? 0) + 1;
  if (!nodes.length) issues.push({ level: 'error', message: 'The outline is empty. Paste the outline text or upload the CSV template.' });
  if (nodes.length && !counts.chapter && !counts.topic) issues.push({ level: 'error', message: 'No chapters or topics were found.' });
  const kids = new Map<string, CheckNode[]>(); for (const n of nodes) { const p = pid(n); if (p) { (kids.get(p) ?? kids.set(p, []).get(p)!).push(n); } }
  const seen = new Map<string, number>();
  for (const n of nodes) {
    if (!n.name.trim()) issues.push({ level: 'error', message: `A ${n.kind.replace('_', ' ')} has no name.` });
    const dk = `${pid(n) ?? ''}|${n.kind}|${n.name.trim().toLowerCase()}`; seen.set(dk, (seen.get(dk) ?? 0) + 1);
  }
  for (const [k, c] of seen) if (c > 1) issues.push({ level: 'warning', message: `Duplicate: "${k.split('|')[2]}" appears ${c} times under the same parent.` });
  const chapters = nodes.filter((n) => n.kind === 'chapter'), topics = nodes.filter((n) => n.kind === 'topic');
  const chWith = chapters.filter((c) => (kids.get(id(c)) ?? []).some((k) => k.kind === 'topic')).length;
  const tpWith = topics.filter((t) => (kids.get(id(t)) ?? []).some((k) => k.kind === 'learning_outcome')).length;
  for (const c of chapters) if (!(kids.get(id(c)) ?? []).some((k) => k.kind === 'topic')) issues.push({ level: 'warning', message: `Chapter "${c.name}" has no topics.` });
  if (topics.length && !counts.learning_outcome) issues.push({ level: 'info', message: 'No learning outcomes are listed. They stay empty unless the source states them: nothing is invented.' });
  const nopage = nodes.filter((n) => !(n.source_page ?? n.page)).length; if (nodes.length && nopage === nodes.length) issues.push({ level: 'info', message: 'No source page numbers were recorded. Add them so a reviewer can check each item against the document.' });
  const flagged = nodes.filter((n) => n.flagged).length; if (flagged) issues.push({ level: 'warning', message: `${flagged} item(s) are flagged as uncertain and must be cleared before approval.` });
  const conf = nodes.map((n) => n.confidence).filter((x): x is number => typeof x === 'number');
  return { counts, issues, errors: issues.filter((i) => i.level === 'error').length, warnings: issues.filter((i) => i.level === 'warning').length, flagged, avgConfidence: conf.length ? Math.round((conf.reduce((a, b) => a + b, 0) / conf.length) * 100) / 100 : null, completeness: { chaptersWithTopics: pct(chWith, chapters.length), topicsWithOutcomes: pct(tpWith, topics.length) } };
}
