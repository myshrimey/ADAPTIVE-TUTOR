import { loadEngagementHome, challengesForStudent, featureOn, E, trE, type EngagementHome } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const { studentId, service } = await studentPage();
  const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  const h: EngagementHome = await loadEngagementHome(service, studentId, ctx);
  const org = await challengesForStudent(service, studentId).catch(() => []);
  const hour = new Date(Date.now() + 5.5 * 3600000).getUTCHours();
  const greet = L(hour < 12 ? 'greet.morning' : hour < 17 ? 'greet.afternoon' : 'greet.evening');
  const { data: st } = await service.from('students').select('display_name').eq('id', studentId).maybeSingle();
  const m = h.mission; const doneN = m ? m.items.filter((i) => i.done).length : 0;
  return (
    <main className="page"><div className="shell">
      <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
        <p className="hero__eyebrow">{L('today.eyebrow')}</p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{greet}{st?.display_name ? `, ${st.display_name}` : ''}</h1>
        {h.on.streaks && <p className="hero__lede" style={{ marginBottom: 0 }}>{trE(h.streak.message, lang)}</p>}
      </div>
      {h.achievements.newlyUnlocked.length > 0 && <p className="alert" style={{ borderLeftColor: 'var(--mastered)', background: 'var(--mastered-bg)', color: 'var(--mastered)' }}>{L('today.newAch')}: {h.achievements.newlyUnlocked.map((x) => trE(x, lang)).join(', ')}</p>}
      {h.notices.length > 0 && <div style={{ marginTop: 'var(--space-2)' }}>{h.notices.map((n) => <p key={n} className="tip-card__body" style={{ margin: '0.2rem 0' }}>• {trE(n, lang)}</p>)}</div>}

      <div className="stat-tile-row">
        {h.on.xp && <div className="stat-tile stat-tile--gradient"><span className="stat-tile__value">{h.xpTotal}</span><span className="stat-tile__label">{L('today.xp', { n: h.xpToday })}</span></div>}
        {h.on.streaks && <div className="stat-tile"><span className="stat-tile__value">{h.streak.current}</span><span className="stat-tile__label">{L('today.streak', { n: h.streak.longest })}</span></div>}
        <div className="stat-tile"><span className="stat-tile__value">{h.mistakes.open}</span><span className="stat-tile__label">{L('today.mistakes')}</span></div>
      </div>
      {h.on.streaks && <p style={{ margin: '0.6rem 0' }}>{h.streak.weekDays.map((d) => <span key={d.day} title={d.day} style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 11, marginRight: 6, background: d.active ? 'var(--marigold-deep)' : 'var(--line)' }} />)} <span style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{L('today.last7')}</span></p>}

      {m && h.on.missions && (
        <section className="tip-card fade-slide-in" style={{ marginTop: 'var(--space-3)' }}>
          <span className="tip-card__eyebrow">{L('today.mission')} · {trE(m.title, lang)}</span>
          <p className="tip-card__body"><strong>{L('today.progress', { a: doneN, b: m.items.length })}</strong>{m.status === 'complete' ? L('today.complete') : ''}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {m.items.map((i) => <li key={i.id} style={{ padding: '0.25rem 0' }}>{i.done ? '☑' : '☐'} {i.href && !i.done ? <a href={i.href}>{trE(i.label, lang)}</a> : trE(i.label, lang)}{i.target > 1 && !i.done ? <span style={{ color: 'var(--slate)' }}> ({i.progress}/{i.target})</span> : null}</li>)}
          </ul>
        </section>
      )}

      {h.battles.length > 0 && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{L('today.battle')}</h2>
          <p style={{ color: 'var(--slate)' }}>{L('today.battleSub')}</p>
          <ol>{h.battles.map((b) => <li key={b.skillId}>{b.chapterName ? `${b.chapterName}: ` : ''}{b.name} <span style={{ color: 'var(--slate)' }}>({b.subjectName}, {b.score}%)</span> <a className="btn btn--accent btn--small" href={`/battle?skill=${b.skillId}`}>{L('today.startBattle')}</a></li>)}</ol>
        </section>
      )}

      {org.length > 0 && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{L('today.org')}</h2>
          {org.map((c) => <p key={c.id}><strong>{c.title}</strong> · {L('today.orgLine', { n: c.size, d: c.endsOn, f: c.groupFinished, g: c.groupSize })} {c.done ? <>· <strong>{L('today.yourScore', { s: c.myScore ?? '' })}</strong></> : <a className="btn btn--accent btn--small" href={`/challenge/start?mode=org&org=${c.id}`}>{L('today.start')}</a>}</p>)}
        </section>
      )}

      <section style={{ marginTop: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--step-1)' }}>{L('today.challenges')}</h2>
        <p><a className="btn btn--ghost btn--small" href="/challenge">{L('today.modes')}</a> {h.on.daily_challenge && <a className="btn btn--ghost btn--small" href="/challenge/daily">{L('today.daily')}{h.daily.some((d) => !d.done) ? '' : L('today.done')}</a>} <a className="btn btn--ghost btn--small" href="/mistakes">{L('today.mistakeBook')}</a> <a className="btn btn--ghost btn--small" href="/journey">{L('today.journey')}</a> <a className="btn btn--ghost btn--small" href="/achievements">{L('today.achievements')}</a> <a className="btn btn--ghost btn--small" href="/leaderboard">{L('today.progressLb')}</a> {featureOn(ctx.settings, studentId, 'friend_challenge') && <a className="btn btn--ghost btn--small" href="/friend">{L('today.friend')}</a>} {featureOn(ctx.settings, studentId, 'referral') && <a className="btn btn--ghost btn--small" href="/invite">{L('today.invite')}</a>}</p>
      </section>

      {h.bests.length > 0 && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{L('today.best')}</h2>
          <ul>{h.bests.slice(0, 6).map((b, i) => <li key={i}>{trE(b.label, lang)}{b.scope ? ` · ${b.scope}` : ''}: <strong>{b.value}{b.unit}</strong>{b.previous !== null ? <span style={{ color: 'var(--slate)' }}> ({L('today.was', { v: `${b.previous}${b.unit}` })})</span> : ''}</li>)}</ul>
        </section>
      )}

      <section className="tip-card" style={{ marginTop: 'var(--space-3)' }}>
        <span className="tip-card__eyebrow">{L('today.achieved')}</span>
        {h.achievedToday.length ? <ul style={{ margin: 0 }}>{h.achievedToday.map((a) => <li key={a}>✓ {trE(a, lang)}</li>)}</ul> : <p className="tip-card__body">{L('today.nothing')}</p>}
        <p className="tip-card__body"><strong>{L('today.next')}</strong> · {trE(h.nextStep, lang)}</p>
      </section>
      <p style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>{L('today.foot')}</p>
    </div></main>
  );
}
