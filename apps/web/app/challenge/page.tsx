import { loadSubjectCatalogue } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { getServerLang } from '@/lib/language';
import { E } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const MODES = ['practice', 'challenge', 'mixed', 'boss'];
export default async function Page() {
  const { studentId, service } = await studentPage();
  const lang = await getServerLang(); const L = (k: string) => E(k, lang);
  const MODES_V = MODES.map((m) => ({ mode: m, name: L(`mode.${m}`), text: L(`mode.${m}.t`) }));
  const cat = (await loadSubjectCatalogue(service, studentId)).filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('ch.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('ch.sub')}</p>
      {cat.length === 0 && <p>{L('ch.register')}</p>}
      {cat.map((c) => (
        <section key={c.id} className="chapter-row" style={{ display: 'block', marginTop: '0.8rem' }}>
          <strong>{c.name}</strong>
          <p style={{ margin: '0.4rem 0' }}>{MODES_V.map((m) => <a key={m.mode} className="btn btn--ghost btn--small" style={{ marginRight: 6 }} title={m.text} href={`/challenge/start?mode=${m.mode}&subject=${c.id}`}>{m.name}</a>)}</p>
        </section>
      ))}
      <ul style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{MODES_V.map((m) => <li key={m.mode}><strong>{m.name}:</strong> {m.text}</li>)}</ul>
    </div></main>
  );
}
