import type { Lang } from '@adaptive-tutor/core';

export interface LegalSection {
  heading: string;
  body: string[]; // paragraphs
}

export interface LegalContent {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
}

export function LegalPageLayout({ content }: { content: LegalContent }) {
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-5)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{content.title}</h1>
          <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{content.lastUpdated}</p>
          {content.intro && <p>{content.intro}</p>}
          {content.sections.map((s, i) => (
            <section key={i} style={{ marginTop: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--step-1)' }}>{s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} style={{ color: 'var(--ink)' }}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

export type { Lang };
