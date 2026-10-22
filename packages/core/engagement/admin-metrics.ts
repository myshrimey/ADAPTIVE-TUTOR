import type { SupabaseClient } from '@supabase/supabase-js';
import { activeDays } from './store';
import { dayOf } from './streak';
import { bucket, ENGAGEMENT_FEATURES, type EngagementSettings } from './config';
import { MIN_N, avg, compareGroups, dailyTrend, dauWauMau, retention, returnRate, share, shiftDay, type Activity } from './metrics';

// Founder metrics. Counts of what happened, never estimates. Reads with the service key; no names or contact details are returned.
export async function loadEngagementMetrics(service: SupabaseClient, settings: EngagementSettings, now = new Date()) {
  const today = dayOf(now); const since = new Date(now.getTime() - 120 * 86400000).toISOString(); const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const { data: studs } = await service.from('students').select('id, created_at').limit(20000);
  const students = (studs ?? []) as any[]; const ids = new Set(students.map((s) => s.id));
  const activity: Activity = new Map(); const add = (id: string, at: string) => { if (!ids.has(id)) return; (activity.get(id) ?? activity.set(id, new Set()).get(id)!).add(dayOf(at)); };
  const pull = async (table: string, col: string) => { const { data } = await service.from(table).select(`student_id, ${col}`).gte(col, since).limit(100000); for (const r of (data ?? []) as any[]) add(r.student_id, r[col]); };
  await Promise.all([pull('learning_sessions', 'started_at'), pull('question_attempts', 'created_at'), pull('diagnostic_attempts', 'started_at'), pull('mock_exams', 'started_at'), pull('challenge_attempts', 'started_at')]);
  const joined = new Map<string, string>(students.map((s) => [s.id as string, dayOf(s.created_at)]));
  const act = dauWauMau(activity, today);
  const r = (n: number) => retention(joined, activity, n, today);
  const active30 = new Set([...activity.entries()].filter(([, d]) => [...d].some((x) => x >= shiftDay(today, -29))).map(([id]) => id));

  const [ses, miss, quizEv, mockAll, mistakes, achv, streaks, flags, scored, access, links] = await Promise.all([
    service.from('learning_sessions').select('student_id, status, started_at, completed_at').gte('started_at', d30).limit(50000),
    service.from('daily_missions').select('status').gte('day', shiftDay(today, -29)).limit(50000),
    service.from('learning_events').select('id', { count: 'exact', head: true }).eq('event_type', 'post_session_quiz_completed').gte('created_at', d30),
    service.from('mock_exams').select('status').gte('started_at', d30).limit(20000),
    service.from('mistake_book').select('status').limit(100000),
    service.from('student_achievements').select('code', { count: 'exact', head: true }).gte('unlocked_at', d30),
    service.from('student_engagement').select('student_id, current_streak, longest_streak').limit(20000),
    service.from('engagement_flags').select('id, student_id, kind, detail, created_at, reviewed').order('created_at', { ascending: false }).limit(50),
    service.from('challenge_attempts').select('student_id, accuracy, total, completed_at, mode').eq('status', 'completed').gte('total', 5).in('mode', ['practice', 'challenge', 'mixed', 'boss', 'weakness', 'org', 'session_quiz']).gte('completed_at', d30).limit(50000),
    service.from('student_access').select('student_id, plan_code, access_until').limit(20000),
    service.from('student_links').select('student_id').eq('status', 'active').eq('link_type', 'parent').limit(20000),
  ]);
  const sessions = (ses.data ?? []) as any[]; const done = sessions.filter((x) => x.status === 'completed');
  const mins = done.map((x) => (new Date(x.completed_at).getTime() - new Date(x.started_at).getTime()) / 60000).filter((m) => m > 0 && m <= 90);
  const missions = (miss.data ?? []) as any[]; const mocks = (mockAll.data ?? []) as any[]; const mb = (mistakes.data ?? []) as any[];
  const st = (streaks.data ?? []) as any[];

  // Learning improvement: students with at least two scored rounds in 30 days; first vs latest accuracy, split by how often they studied.
  const by = new Map<string, { at: string; pct: number }[]>();
  for (const x of (scored.data ?? []) as any[]) if (x.accuracy !== null) (by.get(x.student_id) ?? by.set(x.student_id, []).get(x.student_id)!).push({ at: x.completed_at, pct: Number(x.accuracy) });
  const high: number[] = [], low: number[] = [], all: number[] = [];
  for (const [id, arr] of by) { if (arr.length < 2) continue; arr.sort((a, b) => (a.at < b.at ? -1 : 1)); const d = arr[arr.length - 1].pct - arr[0].pct; all.push(d); const days = [...(activity.get(id) ?? [])].filter((x) => x >= shiftDay(today, -29)).length; (days >= 8 ? high : low).push(d); }

  // Commercial association: how engaged students differ from others on paid use. Association only.
  const paid = new Set(((access.data ?? []) as any[]).filter((a) => a.plan_code !== 'free' && (!a.access_until || a.access_until >= today)).map((a) => a.student_id));
  const parentLinked = new Set(((links.data ?? []) as any[]).map((l) => l.student_id));
  const mockStudents = new Set<string>(); { const { data } = await service.from('mock_exams').select('student_id').eq('status', 'submitted').limit(20000); for (const x of (data ?? []) as any[]) mockStudents.add(x.student_id); }
  const eng = (id: string) => [...(activity.get(id) ?? [])].filter((x) => x >= shiftDay(today, -29)).length >= 8;
  const grp = (hi: boolean) => students.filter((s) => eng(s.id) === hi).map((s) => s.id as string);
  const commercial = (['high', 'low'] as const).map((k) => { const g = grp(k === 'high'); return { group: k === 'high' ? 'Studied on 8+ days in 30' : 'Studied on fewer days', n: g.length, paidShare: share(g.filter((i) => paid.has(i)).length, g.length), mockShare: share(g.filter((i) => mockStudents.has(i)).length, g.length), parentLinkedShare: share(g.filter((i) => parentLinked.has(i)).length, g.length) }; });

  // Experiments: the same deterministic split the app uses.
  const experiments = ENGAGEMENT_FEATURES.filter((f) => settings.experiments[f]).map((f) => {
    const pct = settings.experiments[f].pct; const arm = (on: boolean) => students.filter((s) => (bucket(s.id, f) < pct) === on && joined.get(s.id)! <= shiftDay(today, -7));
    const stat = (g: any[]) => ({ n: g.length, activeLast7: share(g.filter((s) => [...(activity.get(s.id) ?? [])].some((d) => d >= shiftDay(today, -6))).length, g.length) });
    return { feature: f, pct, on: stat(arm(true)), off: stat(arm(false)) };
  });

  return {
    asOf: today, totalStudents: students.length, active30: active30.size, ...act,
    d1: r(1), d7: r(7), d30: r(30), returnRate: returnRate(activity, today), trend: dailyTrend(activity, today, 30),
    sessionsPerStudent: active30.size >= MIN_N ? Math.round((sessions.length / active30.size) * 10) / 10 : null,
    learningSessionsPerStudent: active30.size >= MIN_N ? Math.round((done.length / active30.size) * 10) / 10 : null,
    avgLearningMinutes: mins.length >= MIN_N ? avg(mins) : null,
    missionCompletion: { created: missions.length, complete: missions.filter((m) => m.status === 'complete').length, pct: share(missions.filter((m) => m.status === 'complete').length, missions.length) },
    quizzesCompleted30: quizEv.count ?? 0,
    mockCompletion: { started: mocks.length, submitted: mocks.filter((m) => m.status === 'submitted').length, pct: share(mocks.filter((m) => m.status === 'submitted').length, mocks.length) },
    mistakes: { total: mb.length, corrected: mb.filter((m) => m.status === 'corrected').length, pct: share(mb.filter((m) => m.status === 'corrected').length, mb.length) },
    achievementsUnlocked30: achv.count ?? 0,
    streaks: { atLeast3: st.filter((x) => x.current_streak >= 3).length, atLeast7: st.filter((x) => x.current_streak >= 7).length, atLeast14: st.filter((x) => x.current_streak >= 14).length, longest: st.reduce((m, x) => Math.max(m, x.longest_streak ?? 0), 0) },
    improvement: { overall: all.length >= MIN_N ? avg(all) : null, n: all.length, ...compareGroups(high, low) },
    commercial, experiments,
    flags: ((flags.data ?? []) as any[]).map((f) => ({ id: f.id, kind: f.kind, detail: f.detail, createdAt: f.created_at, reviewed: f.reviewed })),
  };
}
export type EngagementMetrics = Awaited<ReturnType<typeof loadEngagementMetrics>>;
