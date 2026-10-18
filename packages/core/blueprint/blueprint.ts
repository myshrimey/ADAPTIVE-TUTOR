// Blueprint-driven paper assembly (v45). Pure logic: no database, no AI.
//
// IMPORTANT HONESTY NOTES
//  - The section layout and unit weights below are PLANNING blueprints written from the publicly known
//    shape of the CBSE Class 10 theory paper. They are not copied from an official document and must be
//    checked against the official 2026-27 sample paper before the founder calls any paper "board pattern".
//  - A paper is only as complete as the question bank. Questions carry a marks value only when a person set
//    it (or the default: 1 for MCQ, 2 for short answer / numeric). Sections that need 3, 4 or 5 mark questions
//    stay empty until teachers set those marks; the validator says so and the paper is labelled PARTIAL.
//  - "CBSE-aligned" is the normal mode. Challenge Mode only changes selection (harder, more application,
//    less time); it never claims to be harder than the board paper.

export type QType = 'mcq' | 'short_answer' | 'numeric';

export interface BlueprintSection {
  id: string;
  name: string;
  marksPerQuestion: number;
  count: number;
  types: QType[];
}

export interface Blueprint {
  id: string;
  title: string;
  subjectSlugs: string[];
  totalMarks: number;
  durationMinutes: number;
  sections: BlueprintSection[];
  /** Relative weight per chapter slug (marks of its unit split equally across its chapters). Missing = equal. */
  chapterWeights: Record<string, number>;
  basis: string;
}

const STD_BASIS = 'Planning blueprint (not official). Confirm against the CBSE 2026-27 sample paper before calling it board pattern.';

const SECTIONS_MATHS_SCIENCE = (b: number, c: number, d: number): BlueprintSection[] => [
  { id: 'A', name: 'Section A: multiple choice (1 mark each)', marksPerQuestion: 1, count: 20, types: ['mcq'] },
  { id: 'B', name: 'Section B: very short answer (2 marks each)', marksPerQuestion: 2, count: b, types: ['short_answer', 'numeric'] },
  { id: 'C', name: 'Section C: short answer (3 marks each)', marksPerQuestion: 3, count: c, types: ['short_answer', 'numeric'] },
  { id: 'D', name: 'Section D: long answer (5 marks each)', marksPerQuestion: 5, count: d, types: ['short_answer', 'numeric'] },
  { id: 'E', name: 'Section E: case-based (4 marks each)', marksPerQuestion: 4, count: 3, types: ['short_answer', 'numeric', 'mcq'] },
];

function unitWeights(units: { marks: number; chapters: string[] }[]): Record<string, number> {
  const w: Record<string, number> = {};
  for (const u of units) for (const c of u.chapters) w[c] = u.marks / u.chapters.length;
  return w;
}

export const BLUEPRINTS: Blueprint[] = [
  {
    id: 'maths-planning-v1',
    title: 'Mathematics (planning blueprint, 80 marks)',
    subjectSlugs: ['maths', 'maths-basic'],
    totalMarks: 80,
    durationMinutes: 180,
    sections: SECTIONS_MATHS_SCIENCE(5, 6, 4),
    chapterWeights: unitWeights([
      { marks: 6, chapters: ['real-numbers'] },
      { marks: 20, chapters: ['polynomials', 'pair-linear-equations', 'quadratic-equations', 'arithmetic-progressions'] },
      { marks: 6, chapters: ['coordinate-geometry'] },
      { marks: 15, chapters: ['triangles', 'circles'] },
      { marks: 12, chapters: ['intro-trigonometry', 'applications-of-trigonometry'] },
      { marks: 10, chapters: ['areas-related-to-circles', 'surface-areas-volumes'] },
      { marks: 11, chapters: ['statistics', 'probability'] },
    ]),
    basis: STD_BASIS,
  },
  {
    id: 'science-planning-v1',
    title: 'Science (planning blueprint, 80 marks)',
    subjectSlugs: ['science'],
    totalMarks: 80,
    durationMinutes: 180,
    sections: SECTIONS_MATHS_SCIENCE(6, 7, 3),
    // Heredity and "Our Environment / natural resources" are not in the question bank yet, so only present chapters are weighted.
    chapterWeights: unitWeights([
      { marks: 25, chapters: ['chemical-reactions-equations', 'acids-bases-salts', 'metals-non-metals', 'carbon-compounds'] },
      { marks: 20, chapters: ['life-processes', 'control-coordination', 'reproduction-in-organisms'] },
      { marks: 12, chapters: ['light-reflection-refraction'] },
      { marks: 13, chapters: ['electricity', 'magnetic-effects-current'] },
    ]),
    basis: STD_BASIS,
  },
  {
    id: 'social-science-planning-v1',
    title: 'Social Science (planning blueprint, 75 marks without map work)',
    subjectSlugs: ['social-science'],
    totalMarks: 75,
    durationMinutes: 180,
    sections: [
      { id: 'A', name: 'Section A: multiple choice (1 mark each)', marksPerQuestion: 1, count: 20, types: ['mcq'] },
      { id: 'B', name: 'Section B: very short answer (2 marks each)', marksPerQuestion: 2, count: 4, types: ['short_answer'] },
      { id: 'C', name: 'Section C: short answer (3 marks each)', marksPerQuestion: 3, count: 5, types: ['short_answer'] },
      { id: 'D', name: 'Section D: long answer (5 marks each)', marksPerQuestion: 5, count: 4, types: ['short_answer'] },
      { id: 'E', name: 'Section E: case-based (4 marks each)', marksPerQuestion: 4, count: 3, types: ['short_answer', 'mcq'] },
    ],
    chapterWeights: {},
    basis: STD_BASIS + ' The map-work section is not included.',
  },
];

/** Fallback for every other subject: objective questions only. */
export const GENERIC_BLUEPRINT: Blueprint = {
  id: 'generic-objective-v1',
  title: 'Practice paper (objective sections)',
  subjectSlugs: [],
  totalMarks: 30,
  durationMinutes: 60,
  sections: [
    { id: 'A', name: 'Section A: multiple choice (1 mark each)', marksPerQuestion: 1, count: 20, types: ['mcq'] },
    { id: 'B', name: 'Section B: short answer (2 marks each)', marksPerQuestion: 2, count: 5, types: ['short_answer', 'numeric'] },
  ],
  chapterWeights: {},
  basis: 'Generic objective layout. This subject has no board-pattern blueprint yet.',
};

export function blueprintFor(subjectSlug: string): Blueprint {
  return BLUEPRINTS.find((b) => b.subjectSlugs.includes(subjectSlug)) ?? GENERIC_BLUEPRINT;
}

export interface PoolQuestion {
  id: string;
  chapterId: string;
  chapterSlug: string;
  type: QType;
  /** Marks a person set, or the planning default for the type. */
  marks: number;
  difficulty: number; // 1..5
  cognitive: string | null;
  seconds: number;
}

export interface AssembledSection {
  section: BlueprintSection;
  questions: PoolQuestion[];
  shortfall: number;
}

export interface PaperValidation {
  complete: boolean;
  totalMarks: number;
  blueprintMarks: number;
  filledPercent: number;
  chaptersCovered: number;
  issues: string[];
}

export interface AssembledPaper {
  blueprintId: string;
  challenge: boolean;
  sections: AssembledSection[];
  durationMinutes: number;
  validation: PaperValidation;
}

type Rng = () => number;

function shuffled<T>(a: T[], rng: Rng): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

type Bucket = 'easy' | 'medium' | 'hard';
const bucketOf = (d: number): Bucket => (d <= 2 ? 'easy' : d === 3 ? 'medium' : 'hard');
export const DIFFICULTY_MIX: Record<'normal' | 'challenge', Record<Bucket, number>> = {
  normal: { easy: 0.4, medium: 0.4, hard: 0.2 },
  challenge: { easy: 0.1, medium: 0.4, hard: 0.5 },
};
const APPLICATION_LEVELS = new Set(['application', 'analysis', 'evaluation', 'apply', 'analyse', 'analyze', 'evaluate', 'higher']);

/** Whole-number quotas per chapter, proportional to weight, using largest remainders. */
export function chapterQuotas(count: number, chapters: { slug: string; weight: number; available: number }[]): Map<string, number> {
  const q = new Map<string, number>();
  const live = chapters.filter((c) => c.available > 0);
  const total = live.reduce((a, c) => a + c.weight, 0);
  if (!live.length || count <= 0) return q;
  const raw = live.map((c) => ({ c, exact: (c.weight / total) * count }));
  for (const r of raw) q.set(r.c.slug, Math.min(Math.floor(r.exact), r.c.available));
  let left = count - [...q.values()].reduce((a, b) => a + b, 0);
  const order = [...raw].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  let guard = 0;
  while (left > 0 && guard++ < 1000) {
    let progressed = false;
    for (const r of order) {
      if (left <= 0) break;
      if ((q.get(r.c.slug) ?? 0) < r.c.available) { q.set(r.c.slug, (q.get(r.c.slug) ?? 0) + 1); left--; progressed = true; }
    }
    if (!progressed) break;
  }
  return q;
}

export function assemblePaper(pool: PoolQuestion[], bp: Blueprint, opts: { challenge?: boolean; rng?: Rng } = {}): AssembledPaper {
  const rng = opts.rng ?? Math.random;
  const challenge = !!opts.challenge;
  const mix = DIFFICULTY_MIX[challenge ? 'challenge' : 'normal'];
  const used = new Set<string>();
  const sections: AssembledSection[] = [];

  for (const sec of bp.sections) {
    const cands = pool.filter((q) => !used.has(q.id) && q.marks === sec.marksPerQuestion && sec.types.includes(q.type));
    const byChapter = new Map<string, PoolQuestion[]>();
    for (const q of shuffled(cands, rng)) {
      byChapter.set(q.chapterSlug, [...(byChapter.get(q.chapterSlug) ?? []), q]);
    }
    const quotas = chapterQuotas(
      sec.count,
      [...byChapter.entries()].map(([slug, list]) => ({ slug, weight: bp.chapterWeights[slug] ?? 1, available: list.length }))
    );
    // Difficulty targets across the section
    const target: Record<Bucket, number> = {
      easy: Math.round(sec.count * mix.easy), medium: Math.round(sec.count * mix.medium), hard: 0,
    };
    target.hard = Math.max(0, sec.count - target.easy - target.medium);
    const got: Record<Bucket, number> = { easy: 0, medium: 0, hard: 0 };
    const picked: PoolQuestion[] = [];

    // Within each chapter, take questions whose difficulty bucket is furthest below its target
    const score = (q: PoolQuestion) => {
      const b = bucketOf(q.difficulty);
      let s = target[b] - got[b];
      if (challenge && q.cognitive && APPLICATION_LEVELS.has(q.cognitive.toLowerCase())) s += 0.5;
      return s + rng() * 0.01;
    };
    for (const [slug, n] of quotas) {
      const list = byChapter.get(slug) ?? [];
      for (let i = 0; i < n; i++) {
        if (!list.length) break;
        let bi = 0; let bs = -Infinity;
        list.forEach((q, k) => { const s = score(q); if (s > bs) { bs = s; bi = k; } });
        const [chosen] = list.splice(bi, 1);
        picked.push(chosen); used.add(chosen.id); got[bucketOf(chosen.difficulty)]++;
      }
    }
    sections.push({ section: sec, questions: shuffled(picked, rng), shortfall: Math.max(0, sec.count - picked.length) });
  }

  const totalMarks = sections.reduce((a, s) => a + s.questions.reduce((m, q) => m + q.marks, 0), 0);
  const covered = new Set(sections.flatMap((s) => s.questions.map((q) => q.chapterSlug))).size;
  const issues: string[] = [];
  for (const s of sections) {
    if (s.shortfall > 0) {
      issues.push(`${s.section.id}: ${s.questions.length} of ${s.section.count} questions found (${s.section.marksPerQuestion}-mark ${s.section.types.join('/')}); ${s.shortfall} missing.`);
    }
  }
  if (totalMarks === 0) issues.push('No questions could be placed in any section.');
  const secs = sections.filter((s) => s.questions.length > 0);
  const filledSeconds = secs.reduce((a, s) => a + s.questions.reduce((m, q) => m + q.seconds, 0), 0);
  const proportional = bp.durationMinutes * (totalMarks / Math.max(1, bp.totalMarks));
  // Use the larger of: proportional share of the board time, or the questions' own planning times (+20%).
  let minutes = Math.max(15, Math.ceil(Math.max(proportional, (filledSeconds / 60) * 1.2)));
  if (challenge) minutes = Math.max(10, Math.ceil(minutes * 0.9));
  return {
    blueprintId: bp.id,
    challenge,
    sections,
    durationMinutes: minutes,
    validation: {
      complete: issues.length === 0,
      totalMarks,
      blueprintMarks: bp.totalMarks,
      filledPercent: Math.round((totalMarks / bp.totalMarks) * 100),
      chaptersCovered: covered,
      issues,
    },
  };
}
