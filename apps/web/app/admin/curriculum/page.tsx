import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { createServiceClient } from '@/lib/supabase-server';
import { listCurriculumOverview, VERSION_STATUS_LABEL } from '@adaptive-tutor/core';
import { UploadForm } from '@/components/curriculum/UploadForm';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate('academic'); if ('gate' in g) return g.gate;
  const rows = await listCurriculumOverview(createServiceClient());
  return (
    <main className="page"><div className="shell" style={{ paddingTop: 'var(--space-4)' }}><AdminNav />
      <h1 style={{ fontSize: 'var(--step-2)' }}>Curriculum and syllabus</h1>
      <p style={{ color: 'var(--slate)', maxWidth: '66ch' }}>Upload an official syllabus, check the outline Sahayak reads from it against the source, then approve and publish. Only the founder can approve, publish or roll back. A new upload never replaces the published version by itself, and nothing is deleted.</p>
      <p><a href="/api/admin/curriculum/template">Download the CSV template</a> · <a href="/admin/configuration">Older version register</a></p>
      <table className="data-table"><thead><tr><th>Board</th><th>Year</th><th>Class</th><th>Subject</th><th>Lang</th><th>Version</th><th>Status</th><th>Items</th><th></th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td>{r.board}</td><td>{r.academic_year}</td><td>{r.class_level}</td><td>{r.subject_label ?? '—'}</td><td>{r.language}</td><td>v{r.version}</td><td><strong>{VERSION_STATUS_LABEL[r.status] ?? r.status}</strong></td><td>{r.nodes}</td><td><a href={`/admin/curriculum/${r.id}`}>Review</a></td></tr>)}
        {rows.length === 0 && <tr><td colSpan={9}>Nothing uploaded yet.</td></tr>}
      </tbody></table>
      <div style={{ marginTop: 'var(--space-4)' }}><UploadForm /></div>
    </div></main>
  );
}
