import type { Metric } from '@adaptive-tutor/core';

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const LABEL_COLOR: Record<string, string> = { ACTUAL: '#1b6b3a', ESTIMATED: '#8a5a00', ASSUMED: '#6b3fa0', INSUFFICIENT: '#666' };
const RAG_COLOR: Record<string, string> = { green: '#1f9d55', amber: '#e0a100', red: '#d03a2f', grey: '#aaa' };

export function Tag({ label }: { label: string }) {
  return <span title={label === 'ACTUAL' ? 'Counted from records' : label === 'ESTIMATED' ? 'Calculated from partial data or list prices' : label === 'ASSUMED' ? 'Depends on an assumption you set' : 'Cannot be calculated yet'} style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', color: LABEL_COLOR[label] ?? '#666', border: `1px solid ${LABEL_COLOR[label] ?? '#666'}`, borderRadius: 4, padding: '0 4px', marginLeft: 6, verticalAlign: 'middle' }}>{label}</span>;
}
export function Dot({ rag }: { rag?: string }) { return rag ? <span aria-label={`status ${rag}`} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: RAG_COLOR[rag] ?? '#aaa', marginRight: 6 }} /> : null; }

export function Stat({ label, m, money = false, suffix = '' }: { label: string; m: Metric; money?: boolean; suffix?: string }) {
  const text = m.value === null ? 'Insufficient data' : money ? inr(m.value) : `${m.value.toLocaleString('en-IN')}${suffix}`;
  return (
    <div className="stat-tile" title={m.note}>
      <div className="stat-tile__value" style={m.value === null ? { fontSize: '1rem', color: 'var(--slate)' } : undefined}><Dot rag={m.rag} />{text}</div>
      <div className="stat-tile__label">{label}<Tag label={m.label} /></div>
      {m.note && <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>{m.note}</div>}
    </div>
  );
}
export function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (<section style={{ marginTop: 'var(--space-4)' }}><h2 style={{ fontSize: 'var(--step-1)', marginBottom: 2 }}>{title}</h2>{hint && <p style={{ color: 'var(--slate)', fontSize: '0.86rem', margin: '0 0 0.4rem' }}>{hint}</p>}{children}</section>);
}
export function Grid({ children }: { children: React.ReactNode }) { return <div className="stat-tile-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>{children}</div>; }
