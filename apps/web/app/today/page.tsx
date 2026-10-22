import { loadEngagementHome, challengesForStudent, type EngagementHome } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
const LEVEL = ['Consistency', 'Learning', 'Improvement', 'Assessment', 'Mistakes', 'CBSE preparation'];

export default async function TodayPage() {
  const { studentId, service } = await studentPage();
  const ctx = await engineCtx(service);
  const h: EngagementHome = await loadEngagementHome(service, studentId, ctx);
  const org = await challengesForStudent(service, studentId).catch(() => []);
  const hour = new Date(Date.now() + 5.5 * 3600000).getUTCHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const { data: st } = await service.from('students').select('display_name').eq('id', studentId).maybeSingle();
  const m = h.mission; const doneN = m ? m.items.filter((i) => i.done).length : 0;
  return (
    <main className="page"><div className="shell">
      <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
        <p className="hero__eyebrow">Today</p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{greet}{st?.display_name ? `, ${st.display_name}` : ''}</h1>
        {h.on.streaks && <p className="hero__lede" style={{ marginBottom: 0 }}>{h.streak.message}</p>}
      </div>
      {h.achievements.newlyUnlocked.length > 0 && <p className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>New achievement{h.achievements.newlyUnlocked.length === 1 ? '' : 's'}: {h.achievements.newlyUnlocked.join(', ')}</p>}
      {h.notices.length > 0 && <div style={{ marginTop: 'var(--space-2)' }}>{h.notices.map((n) => <p key={n} className="tip-card__body" style={{ margin: '0.2rem 0' }}>• {n}</p>)}</div>}

      <div className="stat-tile-row">
        {h.on.xp && <div className="stat-tile stat-tile--gradient"><span className="stat-tile__value">{h.xpTotal}</span><span className="stat-tile__label">Sahayak XP · {h.xpToday} today</span></div>}
        {h.on.streaks && <div className="stat-tile"><span className="stat-tile__value">{h.streak.current}</span><span className="stat-tile__label">day streak · longest {h.streak.longest}</span></div>}
        <div className="stat-tile"><span className="stat-tile__value">{h.mistakes.open}</span><span className="stat-tile__label">mistakes to review</span></div>
      </div>
      {h.on.streaks && <p style={{ margin: '0.6rem 0' }}>{h.streak.weekDays.map((d) => <span key={d.day} title={d.day} style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 11, marginRight: 6, background: d.active ? 'var(--marigold-deep)' : 'var(--line)' }} />)} <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>last 7 days</span></p>}

      {m && h.on.missions && (
        <section className="tip-card fade-slide-in" style={{ marginTop: 'var(--space-3)' }}>
          <span className="tip-card__eyebrow">Today&apos;s Mission · {m.title}</span>
          <p className="tip-card__body"><strong>Progress: {doneN}/{m.items.length}</strong>{m.status === 'complete' ? ' · Mission complete. Well done.' : ''}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {m.items.map((i) => <li key={i.id} style={{ padding: '0.25rem 0' }}>{i.done ? '☑' : '☐'} {i.href && !i.done ? <a href={i.href}>{i.label}</a> : i.label}{i.target > 1 && !i.done ? <span style={{ color: 'var(--slate)' }}> ({i.progress}/{i.target})</span> : null}</li>)}
          </ul>
        </section>
      )}

      {h.battles.length > 0 && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Weakness Battle</h2>
          <p style={{ color: 'var(--slate)' }}>Your current challenges:</p>
          <ol>{h.battles.map((b) => <li key={b.skillId}>{b.chapterName ? `${b.chapterName}: ` : ''}{b.name} <span style={{ color: 'var(--slate)' }}>({b.subjectName}, {b.score}%)</span> <a className="btn btn--accent btn--small" href={`/battle?skill=${b.skillId}`}>Start battle</a></li>)}</ol>
        </section>
      )}

      {org.length > 0 && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>From your tutor or centre</h2>
          {org.map((c) => <p key={c.id}><strong>{c.title}</strong> · {c.size} questions · ends {c.endsOn} · {c.groupFinished} of {c.groupSize} finished {c.done ? <>· <strong>Your score {c.myScore}</strong></> : <a className="btn btn--accent btn--small" href={`/challenge/start?mode=org&org=${c.id}`}>Start</a>}</p>)}
        </section>
      )}

      <section style={{ marginTop: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Challenges</h2>
        <p><a className="btn btn--ghost btn--small" href="/challenge">Practice, Challenge, Mixed and Boss Battle</a> {h.on.daily_challenge && <a className="btn btn--ghost btn--small" href="/challenge/daily">CBSE Challenge of the Day{h.daily.some((d) => !d.done) ? '' : ' (done)'}</a>} <a className="btn btn--ghost btn--small" href="/mistakes">My Mistake Book</a> <a className="btn btn--ghost btn--small" href="/journey">Study journey</a> <a className="btn btn--ghost btn--small" href="/achievements">Achievements</a> <a className="btn btn--ghost btn--small" href="/leaderboard">My progress &amp; leaderboard</a></p>
      </section>

      {h.bests.length > 0 && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Beat your best</h2>
          <ul>{h.bests.slice(0, 6).map((b, i) => <li key={i}>{b.label}{b.scope ? ` · ${b.scope}` : ''}: <strong>{b.value}{b.unit}</strong>{b.previous !== null ? <span style={{ color: 'var(--slate)' }}> (was {b.previous}{b.unit})</span> : ''}</li>)}</ul>
        </section>
      )}

      <section className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
        <span className="tip-card__eyebrow">WHAT YOU ACHIEVED TODAY</span>
        {h.achievedToday.length ? <ul style={{ margin: 0 }}>{h.achievedToday.map((a) => <li key={a}>✓ {a}</li>)}</ul> : <p className="tip-card__body">Nothing yet today. A short round is enough to begin.</p>}
        <p className="tip-card__body"><strong>YOUR NEXT STEP</strong> · {h.nextStep}</p>
      </section>
      <p style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>XP rewards learning, not clicking. Challenges never change your mastery scores.</p>
    </div></main>
  );
}
