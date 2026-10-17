import type { SupabaseClient } from '@supabase/supabase-js';

// Founder-only numbers (master prompt §35): is the product being used, is it working, is it
// paying. Reads with the SERVICE client (the caller must already have passed the admin check).
// Only counts and averages: nothing here returns a student's name, answers or private text.
// Definitions are in docs/COMMERCIAL_METRICS.md.

const DAY = 86400000;
const MIN_SESSIONS_FOR_OUTCOME = 5;

export interface InterventionOutcome {
  strategy: string; // a teaching move used in the session, or 'gentler_pace'
  sessions: number;
  avgMasteryChange: number | null; // average (ending - starting) mastery of the session's skill; null if too few
  enough: boolean;
}

export interface FounderMetrics {
  generatedAt: string;
  students: { total: number; byPlan: Record<string, number>; activated: number; activatedPercent: number | null };
  activity: {
    activeLast7: number;
    activeLast30: number;
    sessionsLast7: number;
    sessionsLast30: number;
    finishedPercent: number | null; // completed / started, last 30 days
    sessionsPerActiveStudent30: number | null;
    returnedWithin7DaysPercent: number | null; // of students whose first session was 7+ days ago
    returnedBase: number;
  };
  money: { confirmedPayments: number; confirmedAmountInr: number; pendingPayments: number; paidPlanStudents: number; freePlanStudents: number };
  content: { subject: string; status: string; verified: number; needsReview: number; rejected: number; gatesPassed: number }[];
  teachers: { approved: number; reviewsLast30: number };
  interventions: InterventionOutcome[];
  interventionNote: string;
}

async function count(q: PromiseLike<{ count: number | null }>): Promise<number> {
  const r = await q;
  return r.count ?? 0;
}

/** Pure: average mastery change per strategy from per-session rows. Exported for tests. */
export function summariseInterventions(
  sessions: { id: string; delta: number; strategies: string[]; gentler: boolean }[]
): InterventionOutcome[] {
  const buckets = new Map<string, number[]>();
  for (const s of sessions) {
    const keys = new Set(s.strategies);
    if (s.gentler) keys.add('gentler_pace');
    for (const k of keys) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(s.delta);
    }
  }
  return [...buckets.entries()]
    .map(([strategy, ds]) => ({
      strategy,
      sessions: ds.length,
      enough: ds.length >= MIN_SESSIONS_FOR_OUTCOME,
      avgMasteryChange: ds.length >= MIN_SESSIONS_FOR_OUTCOME ? Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 : null,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export async function loadFounderMetrics(service: SupabaseClient, now: Date = new Date()): Promise<FounderMetrics> {
  const iso = (ms: number) => new Date(now.getTime() - ms).toISOString();

  const total = await count(service.from('students').select('id', { count: 'exact', head: true }));
  const { data: access } = await service.from('student_access').select('plan_code');
  const byPlan: Record<string, number> = {};
  for (const a of access ?? []) byPlan[a.plan_code] = (byPlan[a.plan_code] ?? 0) + 1;

  const { data: diagDone } = await service.from('diagnostic_attempts').select('student_id').eq('status', 'completed').limit(20000);
  const activated = new Set((diagDone ?? []).map((d: any) => d.student_id)).size;

  const { data: sess } = await service.from('learning_sessions').select('id, student_id, status, started_at, starting_mastery, ending_mastery').order('started_at', { ascending: true }).limit(50000);
  const rows = (sess ?? []) as any[];
  const t7 = now.getTime() - 7 * DAY;
  const t30 = now.getTime() - 30 * DAY;
  const in7 = rows.filter((r) => new Date(r.started_at).getTime() >= t7);
  const in30 = rows.filter((r) => new Date(r.started_at).getTime() >= t30);
  const active30 = new Set(in30.map((r) => r.student_id)).size;

  const first = new Map<string, number>();
  const days = new Map<string, number[]>();
  for (const r of rows) {
    const t = new Date(r.started_at).getTime();
    if (!first.has(r.student_id)) first.set(r.student_id, t);
    if (!days.has(r.student_id)) days.set(r.student_id, []);
    days.get(r.student_id)!.push(t);
  }
  let base = 0;
  let returned = 0;
  for (const [sid, f] of first) {
    if (now.getTime() - f < 7 * DAY) continue; // too new to judge
    base++;
    if ((days.get(sid) ?? []).some((t) => t > f + 12 * 3600000 && t <= f + 7 * DAY)) returned++;
  }

  const { data: pays } = await service.from('pilot_payments').select('status, amount');
  const confirmed = (pays ?? []).filter((p: any) => p.status === 'confirmed');
  const paidPlans = Object.entries(byPlan).filter(([k]) => k !== 'free').reduce((a, [, n]) => a + n, 0);

  // Content progress per subject.
  const { data: subjects } = await service.from('subjects').select('id, name, status').order('name');
  const { data: gates } = await service.from('subject_gate_signoffs').select('subject_id, passed');
  const content: FounderMetrics['content'] = [];
  for (const sub of subjects ?? []) {
    const { data: chs } = await service.from('chapters').select('id').eq('subject_id', sub.id);
    const chIds = (chs ?? []).map((c: any) => c.id);
    let verified = 0, needsReview = 0, rejected = 0;
    if (chIds.length) {
      const { data: tps } = await service.from('topics').select('id').in('chapter_id', chIds);
      const tIds = (tps ?? []).map((t: any) => t.id);
      const { data: sks } = tIds.length ? await service.from('skills').select('id').in('topic_id', tIds) : { data: [] as any[] };
      const sIds = (sks ?? []).map((s: any) => s.id);
      if (sIds.length) {
        for (const [status, set] of [['verified', 0], ['rejected', 1], ['needs_review', 2]] as const) {
          const c = await count(service.from('diagnostic_questions').select('id', { count: 'exact', head: true }).in('skill_id', sIds).eq('content_status', status));
          if (set === 0) verified = c; else if (set === 1) rejected = c; else needsReview = c;
        }
      }
    }
    content.push({ subject: sub.name, status: sub.status, verified, needsReview, rejected, gatesPassed: (gates ?? []).filter((g: any) => g.subject_id === sub.id && g.passed).length });
  }

  const approved = await count(service.from('teacher_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'approved'));
  const reviews30 = await count(service.from('content_reviews').select('id', { count: 'exact', head: true }).gte('updated_at', iso(30 * DAY)));

  // Intervention -> outcome: completed sessions of the last 90 days that have both mastery readings.
  const t90 = now.getTime() - 90 * DAY;
  const measurable = rows.filter((r) => r.status === 'completed' && r.starting_mastery != null && r.ending_mastery != null && new Date(r.started_at).getTime() >= t90);
  const ids = measurable.map((r) => r.id);
  const strat = new Map<string, Set<string>>();
  const gentler = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: ms } = await service.from('messages').select('session_id, strategy').in('session_id', chunk).not('strategy', 'is', null).limit(20000);
    for (const m of ms ?? []) {
      if (!strat.has(m.session_id)) strat.set(m.session_id, new Set());
      strat.get(m.session_id)!.add(m.strategy);
    }
    const { data: rv } = await service.from('recovery_events').select('session_id').in('session_id', chunk);
    for (const e of rv ?? []) gentler.add(e.session_id);
  }
  const interventions = summariseInterventions(
    measurable.map((r) => ({ id: r.id, delta: Number(r.ending_mastery) - Number(r.starting_mastery), strategies: [...(strat.get(r.id) ?? [])], gentler: gentler.has(r.id) }))
  );

  return {
    generatedAt: now.toISOString(),
    students: { total, byPlan, activated, activatedPercent: total ? Math.round((activated / total) * 100) : null },
    activity: {
      activeLast7: new Set(in7.map((r) => r.student_id)).size,
      activeLast30: active30,
      sessionsLast7: in7.length,
      sessionsLast30: in30.length,
      finishedPercent: in30.length ? Math.round((in30.filter((r) => r.status === 'completed').length / in30.length) * 100) : null,
      sessionsPerActiveStudent30: active30 ? Math.round((in30.length / active30) * 10) / 10 : null,
      returnedWithin7DaysPercent: base ? Math.round((returned / base) * 100) : null,
      returnedBase: base,
    },
    money: {
      confirmedPayments: confirmed.length,
      confirmedAmountInr: Math.round(confirmed.reduce((a: number, p: any) => a + Number(p.amount), 0)),
      pendingPayments: (pays ?? []).filter((p: any) => p.status === 'pending').length,
      paidPlanStudents: paidPlans,
      freePlanStudents: byPlan['free'] ?? 0,
    },
    content,
    teachers: { approved, reviewsLast30: reviews30 },
    interventions,
    interventionNote:
      'These are averages for sessions in which a teaching move or a gentler pace was used. They show association, not cause: a session that needed more help may differ from one that did not. A row appears with numbers only after 5 or more sessions.',
  };
}
