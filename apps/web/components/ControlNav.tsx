import type { ReactNode } from 'react';

const LINKS: [string, string][] = [['/admin/control', 'Overview and prompts'], ['/admin/control/objectives', 'Objectives'], ['/admin/control/tasks', 'Task backlog'], ['/admin/control/decisions', 'Decisions'], ['/admin/control/current', 'Current execution'], ['/admin/control/dependencies', 'Dependencies'], ['/admin/control/testing', 'Testing & QA'], ['/admin/control/history', 'History']];
export function ControlNav({ here }: { here: string }) {
  return (
    <nav aria-label="Development control" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '8px 0 12px', fontSize: '0.92rem' }}>
      {LINKS.map(([href, label]) => <a key={href} href={href} style={href === here ? { fontWeight: 700, textDecoration: 'underline' } : undefined}>{label}</a>)}
    </nav>
  );
}
const COLOUR: Record<string, string> = { 'COMPLETED': '#1b6b3a', 'ACCEPTED BY FOUNDER': '#1b6b3a', 'READY FOR TESTING': '#0b5c8a', 'TESTING': '#0b5c8a', 'IN PROGRESS': '#8a5a00', 'PARTIALLY COMPLETED': '#8a5a00', 'BLOCKED': '#b03a2e', 'NOT STARTED': '#555', 'DEFERRED': '#6b3fa0', 'CANCELLED': '#777' };
export function StatusChip({ s }: { s: string }): ReactNode {
  return <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 10, border: `1px solid ${COLOUR[s] ?? '#999'}`, color: COLOUR[s] ?? '#555', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>{s}</span>;
}
export function SourceNote({ source }: { source: 'database' | 'bundled' }) {
  return source === 'database'
    ? <p style={{ color: 'var(--slate)', fontSize: '0.82rem' }}>Showing the database copy.</p>
    : <p className="alert" style={{ fontSize: '0.86rem' }}>Showing the copy that ships with this version, read only. The database tables are not set up or are empty. Run <code>npm run db:migrate</code>, then press &quot;Load from documents&quot; below to fill them.</p>;
}
