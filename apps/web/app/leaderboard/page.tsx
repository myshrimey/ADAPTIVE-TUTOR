import { loadClassBoard, weeklyStats, loadEngagementHome, getEngagementRow, featureOn, type BoardRow } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';
import { LeaderboardJoin } from '@/components/engagement/LeaderboardJoin';

export const dynamic = 'force-dynamic';
function Board({ title, rows }: { title: string; rows: BoardRow[] }) {
  return <div style={{ marginTop: '0.8rem' }}><strong>{title}</strong>{rows.length === 0 ? <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>Not enough activity yet.</p> : <ol style={{ margin: '0.2rem 0' }}>{rows.map((r) => <li key={r.rank} style={{ fontWeight: r.you ? 700 : 400 }}>{r.nickname}{r.you ? ' (you)' : ''} · {r.value} {r.unit}</li>)}</ol>}</div>;
}
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const row = await getEngagementRow(service, studentId);
  const me = (await weeklyStats(service, [{ studentId, nickname: 'You' }], ctx.settings.leaderboard.window_days))[0];
  const boardOn = featureOn(ctx.settings, studentId, 'leaderboard');
  const board = boardOn && row.leaderboard_opt_in ? await loadClassBoard(service, studentId, ctx.settings) : null;
  const h = await loadEngagementHome(service, studentId, ctx);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>My progress</h1>
      <p style={{ color: 'var(--slate)' }}>You mainly compete with yourself. Last {ctx.settings.leaderboard.window_days} days:</p>
      <ul>
        <li>Rounds finished: <strong>{me?.challengesDone ?? 0}</strong></li>
        <li>Accuracy: <strong>{me?.accuracy ?? 'not enough rounds yet'}{me?.accuracy != null ? '%' : ''}</strong>{me?.prevAccuracy != null && me?.accuracy != null ? ` (the week before: ${me.prevAccuracy}%)` : ''}</li>
        <li>Mistakes corrected: <strong>{me?.mistakesCorrected ?? 0}</strong></li>
        <li>Study days: <strong>{me?.activeDays ?? 0}</strong></li>
      </ul>
      {h.bests.length > 0 && <p>Personal bests: {h.bests.slice(0, 4).map((b) => `${b.label}${b.scope ? ' (' + b.scope + ')' : ''} ${b.value}${b.unit}`).join(' · ')}</p>}
      {boardOn && (
        <section style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>Class board (optional)</h2>
          <LeaderboardJoin optedIn={!!row.leaderboard_opt_in} nickname={row.nickname ?? null} />
          {board && (board.hidden ? <p>{board.note}</p> : <><Board title="Top Score" rows={board.topScore} /><Board title="Most Improved" rows={board.mostImproved} /><Board title="Study days" rows={board.consistency} /><Board title="Mistakes corrected" rows={board.mistakes} /><p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{board.note}</p></>)}
        </section>
      )}
    </div></main>
  );
}
