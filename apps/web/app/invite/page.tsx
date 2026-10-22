import { getOrCreateReferralCode, referralStats, featureOn, E } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';
import { getServerLang } from '@/lib/language';
import { InviteBox } from '@/components/engagement/InviteBox';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  if (!featureOn(ctx.settings, studentId, 'referral')) return <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>{L('rf.title')}</h1><p>{L('fr.off')}</p></div></main>;
  const code = await getOrCreateReferralCode(service, studentId); const st = await referralStats(service, studentId);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('rf.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('rf.sub')}</p>
      <InviteBox code={code} usedACode={st.usedACode} lang={lang} />
      <p>{L('rf.stats', { n: st.signedUp, m: st.firstDiagnostic })}</p>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{L('rf.note')}</p>
    </div></main>
  );
}
