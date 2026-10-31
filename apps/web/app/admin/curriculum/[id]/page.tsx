import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { versionDetail, VERSION_STATUS_LABEL, DOC_TYPE_LABEL, NODE_LABEL } from '@adaptive-tutor/core';
import { ReviewBoard } from '@/components/curriculum/ReviewBoard';
import { DownloadSource } from '@/components/curriculum/DownloadSource';

export const dynamic = 'force-dynamic';
const stamp = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—');
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const g = await adminPageGate('academic'); if ('gate' in g) return g.gate;
  const { id } = await params; const d = await versionDetail(createServiceClient(), id);
  if (!d) return <main className="page"><div className="shell"><AdminNav /><p>Version not found.</p></div></main>;
  const v = d.version; const c = d.check;
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <p><a href="/admin/curriculum">← All curriculum versions</a></p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{v.board} {v.academic_year} · Class {v.class_level} · {v.subject_label} · v{v.version}</h1>
      <p><strong>{VERSION_STATUS_LABEL[v.status] ?? v.status}</strong>{v.published_at ? ` · published ${stamp(v.published_at)} by ${v.published_by}` : ''}{v.approved_at ? ` · approved ${stamp(v.approved_at)} by ${v.approved_by}` : ''}</p>
      {v.status_note && <p style={{ color: 'var(--slate)' }}>{v.status_note}</p>}
      <p>Source: {v.source_reference ?? 'not entered'}</p>
      {d.documents.map((x: any) => <p key={x.id} style={{ color: 'var(--slate)' }}>{DOC_TYPE_LABEL[x.doc_type] ?? x.doc_type}: {x.file_name} ({Math.round((x.size_bytes ?? 0) / 1024)} KB), uploaded by {x.uploaded_by} on {stamp(x.uploaded_at)}. Read as: {x.process_method ?? '—'}. {x.storage_path ? <DownloadSource docId={x.id} /> : 'Original file not stored.'}</p>)}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Checks</h2>
      <p>{Object.entries(c.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${NODE_LABEL[k as keyof typeof NODE_LABEL]?.toLowerCase()}${n === 1 ? '' : 's'}`).join(' · ') || 'No items'}. Chapters with topics: {c.completeness.chaptersWithTopics ?? 'n/a'}{c.completeness.chaptersWithTopics !== null ? '%' : ''}. Topics with learning outcomes: {c.completeness.topicsWithOutcomes ?? 'n/a'}{c.completeness.topicsWithOutcomes !== null ? '%' : ''}. Average automatic confidence: {c.avgConfidence ?? 'n/a'}.</p>
      <ul>{c.issues.map((i, k) => <li key={k}><strong>{i.level === 'error' ? 'Error' : i.level === 'warning' ? 'Warning' : 'Note'}:</strong> {i.message}</li>)}{c.issues.length === 0 && <li>No problems found. This does not prove the outline is correct: compare it with the source.</li>}</ul>
      <ReviewBoard versionId={id} status={v.status} nodes={d.nodes} superAdmin={!!g.superAdmin} canRollback />
      <h2 style={{ fontSize: 'var(--step-1)' }}>History</h2>
      <table className="data-table"><thead><tr><th>When</th><th>What</th><th>By</th></tr></thead><tbody>{d.events.map((e: any) => <tr key={e.id}><td>{stamp(e.at)}</td><td>{String(e.event).replace(/_/g, ' ')}</td><td>{e.actor ?? 'system'}</td></tr>)}</tbody></table>
    </div></main>
  );
}
