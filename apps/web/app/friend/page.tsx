import { loadSubjectCatalogue, listFriendChallenges, featureOn, getEngagementRow, E } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';
import { getServerLang } from '@/lib/language';
import { FriendCreate, FriendJoin, FriendCancel } from '@/components/engagement/FriendPanel';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  const shell = (c: React.ReactNode) => <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>{L('fr.title')}</h1>{c}</div></main>;
  if (!featureOn(ctx.settings, studentId, 'friend_challenge')) return shell(<p>{L('fr.off')}</p>);
  const row = await getEngagementRow(service, studentId);
  if (!row.nickname) return shell(<p>{L('fr.need')} <a href="/leaderboard">→</a></p>);
  const cat = (await loadSubjectCatalogue(service, studentId)).filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  const names = new Map(cat.map((c) => [c.id, c.name]));
  const list = await listFriendChallenges(service, studentId, (id) => (id ? names.get(id) ?? null : null));
  return shell(<>
    <p style={{ color: 'var(--slate)' }}>{L('fr.sub')}</p>
    <FriendCreate subjects={cat.map((c) => ({ id: c.id, name: c.name }))} lang={lang} />
    <p style={{ marginBottom: 0 }}><strong>{L('fr.have')}</strong></p><FriendJoin lang={lang} />
    <h2 style={{ fontSize: 'var(--step-1)' }}>{L('fr.mine')}</h2>
    {list.length === 0 && <p style={{ color: 'var(--slate)' }}>—</p>}
    {list.map((f) => (
      <div key={f.id} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
        <p style={{ margin: 0 }}><strong>{f.subjectName ?? ''}</strong> · {new Date(f.expiresAt).toISOString().slice(0, 10)}</p>
        {f.code && <p style={{ margin: '0.3rem 0' }}>{L('fr.code')} <strong style={{ letterSpacing: 2 }}>{f.code}</strong></p>}
        {f.status === 'done' && f.mine && f.theirs && <p style={{ margin: '0.3rem 0' }}>{L('fr.result', { a: `${f.mine.correct}/${f.mine.total}`, n: f.friendNickname ?? '', b: `${f.theirs.correct}/${f.theirs.total}` })}</p>}
        {f.status === 'play' && <a className="btn btn--accent btn--small" href={`/challenge/start?mode=friend&friend=${f.id}`}>{L('fr.play')}</a>}
        {(f.status === 'waiting' || f.status === 'waiting_friend') && <p style={{ margin: '0.3rem 0', color: 'var(--slate)' }}>{L('fr.waiting')}{f.mine ? ` · ${f.mine.correct}/${f.mine.total}` : ''}</p>}
        {f.status === 'expired' && <p style={{ margin: '0.3rem 0', color: 'var(--slate)' }}>{L('fr.expired')}</p>}
        {f.status === 'waiting' && f.role === 'creator' && <FriendCancel id={f.id} lang={lang} />}
      </div>
    ))}
  </>);
}
