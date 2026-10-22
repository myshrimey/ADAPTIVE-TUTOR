import { loadClassBoard, weeklyStats, loadEngagementHome, getEngagementRow, featureOn, E, trE, type BoardRow, type ELang } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';
import { LeaderboardJoin } from '@/components/engagement/LeaderboardJoin';

export const dynamic = 'force-dynamic';
function Board({ title, rows, lang }: { title: string; rows: BoardRow[]; lang: ELang }) {
  return <div style={{ marginTop: '0.8rem' }}><strong>{title}</strong>{rows.length === 0 ? <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>{E('lb.empty', lang)}</p> : <ol style={{ margin: '0.2rem 0' }}>{rows.map((r) => <li key={r.rank} style={{ fontWeight: r.you ? 700 : 400 }}>{r.nickname}{r.you ? E('lb.you', lang) : ''} · {r.value} {r.unit}</li>)}</ol>}</div>;
}
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  const row = await getEngagementRow(service, studentId);
  const me = (await weeklyStats(service, [{ studentId, nickname: 'You' }], ctx.settings.leaderboard.window_days))[0];
  const boardOn = featureOn(ctx.settings, studentId, 'leaderboard');
  const board = boardOn && row.leaderboard_opt_in ? await loadClassBoard(service, studentId, ctx.settings) : null;
  const h = await loadEngagementHome(service, studentId, ctx);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('lb.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('lb.sub', { n: ctx.settings.leaderboard.window_days })}</p>
      <ul>
        <li>{L('lb.rounds')} <strong>{me?.challengesDone ?? 0}</strong></li>
        <li>{L('lb.acc')} <strong>{me?.accuracy ?? L('lb.accNone')}{me?.accuracy != null ? '%' : ''}</strong>{me?.prevAccuracy != null && me?.accuracy != null ? L('lb.prev', { p: me.prevAccuracy }) : ''}</li>
        <li>{L('lb.corr')} <strong>{me?.mistakesCorrected ?? 0}</strong></li>
        <li>{L('lb.days')} <strong>{me?.activeDays ?? 0}</strong></li>
      </ul>
      {h.bests.length > 0 && <p>{L('lb.bests')} {h.bests.slice(0, 4).map((b) => `${trE(b.label, lang)}${b.scope ? ' (' + b.scope + ')' : ''} ${b.value}${b.unit}`).join(' · ')}</p>}
      {boardOn && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{L('lb.class')}</h2>
          <LeaderboardJoin optedIn={!!row.leaderboard_opt_in} nickname={row.nickname ?? null} lang={lang} />
          {board && (board.hidden ? <p>{trE(board.note, lang)}</p> : <><Board lang={lang} title={L('lb.top')} rows={board.topScore} /><Board lang={lang} title={L('lb.most')} rows={board.mostImproved} /><Board lang={lang} title={L('lb.studyDays')} rows={board.consistency} /><Board lang={lang} title={L('lb.fixed')} rows={board.mistakes} /><p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{trE(board.note, lang)}</p></>)}
        </section>
      )}
    </div></main>
  );
}
