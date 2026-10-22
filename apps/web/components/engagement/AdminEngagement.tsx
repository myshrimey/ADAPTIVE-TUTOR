'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
async function call(body: unknown) { return (await fetch('/api/admin/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(); }

export function FlagReviewButton({ id }: { id: string }) {
  const r = useRouter();
  return <button className="btn btn--ghost btn--small" onClick={async () => { await call({ action: 'flag_reviewed', id }); r.refresh(); }}>Mark as seen</button>;
}

export function SettingsForm({ settings, achievements }: { settings: any; achievements: { code: string; title: string; xp: number; active: boolean; category: string }[] }) {
  const r = useRouter(); const [s, setS] = useState<any>(settings); const [msg, setMsg] = useState('');
  const setPath = (path: string[], v: any) => setS((o: any) => { const n = JSON.parse(JSON.stringify(o)); let c = n; path.slice(0, -1).forEach((k) => (c = c[k] ??= {})); c[path[path.length - 1]] = v; return n; });
  async function save() { setMsg('Saving…'); const x = await call({ action: 'save_settings', settings: s }); setMsg(x.error ? `Not saved: ${x.error}` : 'Saved.'); if (!x.error) r.refresh(); }
  const num = (path: string[], label: string, v: number) => <label style={{ display: 'block', margin: '0.3rem 0' }}>{label} <input className="field__input" style={{ width: 90 }} type="number" value={v} onChange={(e) => setPath(path, Number(e.target.value))} /></label>;
  const XP_LABEL: Record<string, string> = { diagnostic: 'Diagnostic completed', learning_session: 'Learning session (base)', learning_session_correct_cap: 'Learning session: max extra for correct answers', practice_correct: 'Per correct practice answer', practice_attempt: 'Per honest wrong attempt', mistake_corrected: 'Mistake corrected', quiz_complete: 'Round finished', mock_complete: 'Mock completed', revision: 'Revision round (mistake review / comeback)', weak_practice_bonus: 'Weakness Battle finished', personal_best: 'New personal best', mission_complete: 'Mission completed', boss_complete: 'Boss Battle finished', daily_challenge: 'Challenge of the Day', daily_cap: 'Daily cap on practice XP', min_seconds_per_answer: 'Answers faster than this many seconds earn nothing', recent_question_days: 'A question seen in the last N days earns no XP again', backfill_days: 'First time: count activity from the last N days' };
  return (
    <div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Switches</h2>
      <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Turn a feature off for everyone. &quot;Share of students&quot; (0 to 100) turns it on for only that share, the same students every time, so you can compare groups on the Student engagement page. 100 or empty = everyone.</p>
      {Object.keys(s.features).map((f) => <p key={f} style={{ margin: '0.3rem 0' }}><label><input type="checkbox" checked={!!s.features[f]} onChange={(e) => setPath(['features', f], e.target.checked)} /> {f.replace(/_/g, ' ')}</label> · share of students: <input className="field__input" style={{ width: 70 }} type="number" min={0} max={100} placeholder="100" value={s.experiments?.[f]?.pct ?? ''} onChange={(e) => { const v = e.target.value; setS((o: any) => { const n = JSON.parse(JSON.stringify(o)); n.experiments ??= {}; if (v === '') delete n.experiments[f]; else n.experiments[f] = { pct: Number(v) }; return n; }); }} /></p>)}
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Friend challenge and referral now have screens but are OFF until you switch them on. Friend challenge lets two students who know each other's code play the same 5 questions and see each other's nickname and score only (no chat). Read it once before switching it on, because these are school-age students.</p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Today&apos;s Mission</h2>
      {num(['mission', 'items'], 'Items per mission (1 to 6, keep it small)', s.mission.items)}{num(['mission', 'max_items'], 'Never more than', s.mission.max_items)}{num(['mission', 'questions_target'], 'Fallback: answer this many questions', s.mission.questions_target)}
      <h2 style={{ fontSize: 'var(--step-1)' }}>XP rules</h2>
      {Object.keys(s.xp).map((k) => <div key={k}>{num(['xp', k], XP_LABEL[k] ?? k, s.xp[k])}</div>)}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Notifications and leaderboard</h2>
      {num(['notifications', 'max_per_day'], 'In-app prompts shown at most per day (0 = none)', s.notifications.max_per_day)}{num(['leaderboard', 'min_members'], 'Board shows only when this many students joined', s.leaderboard.min_members)}{num(['leaderboard', 'window_days'], 'Leaderboard window (days)', s.leaderboard.window_days)}
      <p><button className="btn btn--accent" onClick={save}>Save settings</button> <span>{msg}</span></p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Achievements</h2>
      <AchievementEditor items={achievements} />
    </div>
  );
}
function AchievementEditor({ items }: { items: { code: string; title: string; xp: number; active: boolean; category: string }[] }) {
  const [rows, setRows] = useState(items); const [msg, setMsg] = useState('');
  async function save(i: number) { const x = await call({ action: 'achievement', code: rows[i].code, xp: rows[i].xp, active: rows[i].active }); setMsg(x.error ? `Not saved: ${x.error}` : `Saved ${rows[i].title}.`); }
  return <div>{rows.map((a, i) => <p key={a.code} style={{ margin: '0.25rem 0' }}>{a.title} <span style={{ color: 'var(--slate)' }}>({a.category})</span> · XP <input className="field__input" style={{ width: 70 }} type="number" value={a.xp} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, xp: Number(e.target.value) } : r)))} /> <label><input type="checkbox" checked={a.active} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, active: e.target.checked } : r)))} /> on</label> <button className="btn btn--ghost btn--small" onClick={() => save(i)}>Save</button></p>)}<p>{msg}</p></div>;
}
