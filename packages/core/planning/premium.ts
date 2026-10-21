import type { StudyPlan, WeakSkill } from './study-plan';

// Paid planning products built only from recorded evidence (same rules as the free study plan).
// They never predict marks. "Estimated readiness based on Sahayak assessment evidence."

export const READINESS_NOTE = 'Estimated readiness based on Sahayak assessment evidence. It is guidance, not a prediction of marks, and Sahayak does not guarantee results.';

// ---------- Exam rescue: a short sprint on the weakest, most foundational skills ----------
export interface RescueSubject { subjectId: string; name: string; priority: 'start' | 'focus' | 'steady' | 'insufficient'; hasBaseline: boolean; weakSkills: WeakSkill[] }
export interface RescueDay { day: number; subject: string; minutes: number; task: string }
export interface RescuePlan { days: RescueDay[]; needsEvidence: boolean; note: string }

export function composeRescue(input: { subjects: RescueSubject[]; days: number; dailyMinutes: number | null }): RescuePlan {
  const days = Math.min(30, Math.max(3, Math.floor(input.days) || 7));
  const minutes = input.dailyMinutes && input.dailyMinutes >= 15 ? Math.min(180, input.dailyMinutes) : 45;
  const rank = { start: 0, focus: 1, insufficient: 2, steady: 3 } as const;
  // Task queues per subject: repair a weak prerequisite first, then the weak skill itself.
  const queues = input.subjects
    .filter((s) => s.hasBaseline && s.weakSkills.length)
    .sort((a, b) => rank[a.priority] - rank[b.priority])
    .map((s) => {
      const q: { subject: string; task: string }[] = [];
      const seen = new Set<string>();
      for (const w of s.weakSkills.slice(0, 8)) {
        const pre = w.weakPrerequisites[0];
        if (pre && !seen.has(pre.skillId)) { seen.add(pre.skillId); q.push({ subject: s.name, task: `Repair the base first: ${pre.name} (${Math.round(pre.score)}% now). It sits under ${w.name}.` }); }
        if (!seen.has(w.skillId)) { seen.add(w.skillId); q.push({ subject: s.name, task: `Practise ${w.name} (${Math.round(w.score)}% now) until you get most answers right without help.` }); }
      }
      return q;
    });
  if (!queues.length) return { days: [], needsEvidence: true, note: 'Sahayak needs a finished diagnostic with some weak skills found before it can plan a rescue sprint. Take a diagnostic first.' };
  const out: RescueDay[] = [];
  const last = days; // the last day is always a timed mixed check
  let d = 1;
  while (d < last) {
    if (queues.every((q) => q.length === 0)) break;
    // A short review day after every three practice days.
    if (d % 4 === 0) { out.push({ day: d, subject: 'All', minutes, task: 'Look again at the mistakes from the last three days. Redo any you got wrong, without looking at the answer first.' }); d++; continue; }
    // Weighted turn: the first (highest priority) subject gets two turns for each turn of the others.
    const pick = queues.find((q, i) => q.length && (i === 0 || d % 3 !== 0)) ?? queues.find((q) => q.length)!;
    const t = pick.shift()!;
    out.push({ day: d, subject: t.subject, minutes, task: t.task });
    d++;
  }
  out.push({ day: Math.max(d, out.length + 1), subject: 'All', minutes, task: 'Timed mixed practice on the skills above, then review every mistake. Take a mock if you can.' });
  return { days: out, needsEvidence: false, note: 'A short, focused sprint on what the evidence shows is weakest. It is guidance, not a promise of marks. Rebuilt from your latest practice each time.' };
}

// ---------- Board preparation programme: week by week ----------
export interface ProgrammeWeek { week: number; items: { subject: string; steps: string[] }[]; checkpoint: string | null }
export interface Programme { weeks: ProgrammeWeek[]; weeksTotal: number; datesSet: boolean }

export function composeProgramme(plan: StudyPlan, opts: { datesSet: boolean; maxWeeks?: number }): Programme {
  const weeksTotal = Math.max(1, Math.min(opts.maxWeeks ?? 16, plan.weeksLeft || 1));
  const queues = plan.subjects.map((s) => ({ name: s.name, steps: s.steps.filter((x) => x.kind !== 'keep_going').map((x) => x.text), keep: s.steps.find((x) => x.kind === 'keep_going')?.text ?? null }));
  const weeks: ProgrammeWeek[] = [];
  for (let w = 1; w <= weeksTotal; w++) {
    const items: ProgrammeWeek['items'] = [];
    const finalStretch = w > weeksTotal - 2 && weeksTotal >= 4;
    for (const q of queues) {
      const take = q.steps.splice(0, 2);
      if (take.length) items.push({ subject: q.name, steps: take });
      else if (finalStretch) items.push({ subject: q.name, steps: [`Timed ${q.name} practice twice this week and review every mistake.`] });
      else items.push({ subject: q.name, steps: [q.keep ?? `Revise ${q.name}: a short mixed practice on skills you have already covered.`] });
    }
    weeks.push({ week: w, items, checkpoint: w % 2 === 0 || w === weeksTotal ? 'Checkpoint: do a short chapter check on this fortnight\'s skills. The plan rebuilds from the result.' : null });
  }
  return { weeks, weeksTotal, datesSet: opts.datesSet };
}
