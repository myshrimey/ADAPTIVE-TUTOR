// v62: competency / prerequisite graph. Pure code, no database. A competency is a skill AT A CLASS LEVEL; the graph
// links Class 10 skills to the earlier-class skills they need, so a diagnostic can walk downward without assuming
// "enrolled in Class 10" means "Class 10 competency".
export interface Competency {
  id: string;
  code: string;
  subjectId?: string | null;
  classLevel: number;
  chapter?: string | null;
  topic?: string | null;
  name: string;
  domain: string;
  description?: string | null;
  cognitiveLevel?: string;
  importance: number; // 1-5, importance for the target exam
  minMastery?: number;
  skillId?: string | null;
}
export interface Edge { competencyId: string; requiresId: string }

export class CompetencyGraph {
  readonly byId = new Map<string, Competency>();
  private req = new Map<string, string[]>();
  private dep = new Map<string, string[]>();
  constructor(comps: Competency[], edges: Edge[]) {
    for (const c of comps) this.byId.set(c.id, c);
    for (const e of edges) {
      if (!this.byId.has(e.competencyId) || !this.byId.has(e.requiresId) || e.competencyId === e.requiresId) continue;
      const r = this.req.get(e.competencyId) ?? [];
      if (!r.includes(e.requiresId)) r.push(e.requiresId);
      this.req.set(e.competencyId, r);
      const d = this.dep.get(e.requiresId) ?? [];
      if (!d.includes(e.competencyId)) d.push(e.competencyId);
      this.dep.set(e.requiresId, d);
    }
  }
  get(id: string): Competency | undefined { return this.byId.get(id); }
  all(): Competency[] { return [...this.byId.values()]; }
  prerequisites(id: string): string[] { return this.req.get(id) ?? []; }
  dependents(id: string): string[] { return this.dep.get(id) ?? []; }
  /** Everything this competency needs, nearest first, up to `depth` steps. */
  ancestors(id: string, depth = 99): string[] {
    const out: string[] = [];
    const seen = new Set<string>([id]);
    let frontier = [id];
    for (let d = 0; d < depth && frontier.length; d++) {
      const next: string[] = [];
      for (const f of frontier) for (const p of this.prerequisites(f)) if (!seen.has(p)) { seen.add(p); out.push(p); next.push(p); }
      frontier = next;
    }
    return out;
  }
  /** Everything that needs this competency (transitively). */
  descendants(id: string): string[] {
    const out: string[] = [];
    const seen = new Set<string>([id]);
    let frontier = [id];
    while (frontier.length) {
      const next: string[] = [];
      for (const f of frontier) for (const p of this.dependents(f)) if (!seen.has(p)) { seen.add(p); out.push(p); next.push(p); }
      frontier = next;
    }
    return out;
  }
  /** Prerequisites before dependents. Ties by class level, then name. Cycles cannot hang it. */
  topoOrder(ids: string[]): string[] {
    const set = new Set(ids);
    const done = new Set<string>();
    const out: string[] = [];
    const visit = (id: string, stack: Set<string>) => {
      if (done.has(id) || stack.has(id)) return;
      stack.add(id);
      for (const p of this.prerequisites(id)) if (set.has(p)) visit(p, stack);
      stack.delete(id);
      done.add(id);
      out.push(id);
    };
    const sorted = [...ids].sort((a, b) => (this.byId.get(a)?.classLevel ?? 0) - (this.byId.get(b)?.classLevel ?? 0) || (this.byId.get(a)?.name ?? '').localeCompare(this.byId.get(b)?.name ?? ''));
    for (const id of sorted) visit(id, new Set());
    return out;
  }
  /** True if adding requires -> competency would make a cycle. */
  wouldCycle(competencyId: string, requiresId: string): boolean {
    return competencyId === requiresId || this.ancestors(requiresId).includes(competencyId);
  }
}
