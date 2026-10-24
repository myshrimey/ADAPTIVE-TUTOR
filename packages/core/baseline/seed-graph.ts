// v62: builds the Maths competency graph from the Class 10 skills (already in the database / seed files) plus the Class 6-9
// foundation. Pure: works from plain rows, so the same code builds the test graph and the database rows.
import type { Competency, Edge } from './graph';
import { FOUNDATION_MATHS, CLASS10_BRIDGES, classTenDomain } from './foundation-maths';

export interface Class10Skill { id: string; slug: string; name: string; chapter: string; requiresSlugs: string[] }

const HEAVY_CHAPTERS = /polynomial|linear equations|quadratic|trigonometry|arithmetic progression/i;
function cognitiveOf(slug: string): string {
  if (/^(formulate|prove)/.test(slug)) return 'analyse';
  if (/^(interpret|relate|identify|determine)/.test(slug)) return 'understand';
  return 'apply';
}

export const c10Code = (slug: string) => `m10.${slug}`;

export function mathsCompetencies(skills: Class10Skill[], idOf: (code: string) => string = (c) => c): { comps: Competency[]; edges: Edge[] } {
  const comps: Competency[] = [];
  const edges: Edge[] = [];
  for (const f of FOUNDATION_MATHS) {
    comps.push({ id: idOf(f.code), code: f.code, classLevel: f.classLevel, chapter: f.chapter, topic: f.name, name: f.name, domain: f.domain, description: f.idea, cognitiveLevel: 'apply', importance: f.importance ?? 3, skillId: null });
    for (const r of f.requires) edges.push({ competencyId: idOf(f.code), requiresId: idOf(r) });
  }
  const slugs = new Set(skills.map((s) => s.slug));
  for (const sk of skills) {
    const code = c10Code(sk.slug);
    comps.push({ id: idOf(code), code, classLevel: 10, chapter: sk.chapter, topic: sk.name, name: sk.name, domain: classTenDomain(sk.slug), cognitiveLevel: cognitiveOf(sk.slug), importance: HEAVY_CHAPTERS.test(sk.chapter) ? 4 : 3, skillId: sk.id });
    for (const r of sk.requiresSlugs) if (slugs.has(r)) edges.push({ competencyId: idOf(code), requiresId: idOf(c10Code(r)) });
    for (const f of CLASS10_BRIDGES[sk.slug] ?? []) edges.push({ competencyId: idOf(code), requiresId: idOf(f) });
  }
  return { comps, edges };
}

/** What a student should do next from a path: the first step not yet done. */
export function nextLearningStep<T extends { competencyId: string }>(path: T[], doneIds: Iterable<string>): T | null {
  const done = new Set(doneIds);
  return path.find((n) => !done.has(n.competencyId)) ?? null;
}
