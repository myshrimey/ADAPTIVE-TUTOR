import { FEATURE_COPY, type PremiumFeature } from '@/lib/premium';
import { UpgradeCta } from '@/components/commerce/UpgradeCta';
import { TERMS_LINE } from '@adaptive-tutor/core';

// What a free user sees for a paid feature: what it is, and a calm way to see plans. Nothing is hidden that they already have for free.
export function Locked({ feature, who = 'you' }: { feature: PremiumFeature; who?: string }) {
  const c = FEATURE_COPY[feature];
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{c.title}</h1>
        <p>{c.body}</p>
        <ul>{c.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        <p className="alert">This is part of Sahayak&apos;s paid plans. {who === 'you' ? 'Your free learning, quizzes and basic report stay free.' : 'The free learning, quizzes and basic report stay free.'} <a href="/plans">See plans</a>. {TERMS_LINE}</p>
        <UpgradeCta kind={feature === 'board_readiness' ? 'readiness' : 'programme'} source={`locked_${feature}`} />
      </div>
    </div></main>
  );
}
