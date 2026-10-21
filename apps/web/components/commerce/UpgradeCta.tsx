'use client';
import { TrackView } from './TrackView';
import { CtaLink } from './CtaLink';
import { WtpPrompt } from './WtpPrompt';

// A calm, contextual offer. Never blocks anything. Records that it was seen and whether it was clicked.
export function UpgradeCta({ kind, source }: { kind: 'readiness' | 'mock' | 'programme'; source: string }) {
  const copy = {
    readiness: { title: "See your child's detailed Board Readiness", body: 'Subject-by-subject readiness, the chapters to work on first, and a study plan, all from the evidence in this assessment.', view: 'readiness_offer_viewed', click: 'readiness_purchase_intent', wtp: 'board_readiness' },
    mock: { title: 'Get your handwritten answers evaluated', body: 'Write on paper, upload your answers, and understand where marks were lost.', view: 'mock_offer_viewed', click: 'upgrade_clicked', wtp: 'handwritten_mock' },
    programme: { title: 'Create a targeted preparation programme', body: 'The same weak areas keep coming back. A structured plan can focus practice where it matters.', view: 'upgrade_clicked', click: 'upgrade_clicked', wtp: '' },
  }[kind];
  return (
    <div className="chapter-row no-print" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
      <TrackView event={copy.view === 'upgrade_clicked' ? 'pricing_page_view' : copy.view} source={source} />
      <div style={{ fontWeight: 600 }}>{copy.title}</div>
      <div style={{ fontSize: '0.92rem' }}>{copy.body}</div>
      <p style={{ margin: '0.4rem 0 0' }}><CtaLink href="/plans" event={copy.click} source={source} className="btn btn--ghost btn--small">See plans</CtaLink> <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Terms &amp; Conditions Apply.</span></p>
      {copy.wtp && <WtpPrompt feature={copy.wtp} title="A quick question" />}
    </div>
  );
}
