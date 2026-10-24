import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { listRegister, provenanceSummary, ORIGINS, ORIGIN_LABEL, MIN_GROWTH_PER_SESSION } from '@adaptive-tutor/core';
import { ReviewButtons, RequestButtons } from '@/components/RegisterActions';
import { QuestionContribute } from '@/components/QuestionContribute';

export const dynamic = 'force-dynamic';
const STATUS_WORD: Record<string, string> = { verified: 'verified', needs_review: 'needs review', rejected: 'rejected', APPROVED: 'verified', ADMIN_REVIEWED: 'verified', DRAFT: 'needs review', AI_GENERATED: 'needs review', AI_REVIEWED: 'needs review', RETIRED: 'rejected' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = await searchParams;
  const service = createServiceClient();
  const [rows, summary, { data: reqs }] = await Promise.all([
    listRegister(service, { table: (sp.table as any) || 'all', origin: sp.origin || undefined, role: sp.role || undefined, status: sp.status || undefined, reviewed: (sp.reviewed as any) || undefined, limit: 100 }),
    provenanceSummary(service),
    service.from('question_requests').select('id, requester_role, requested_by, topic_text, wanted_count, fulfilled_count, status, created_at, note, skills(name)').order('created_at', { ascending: false }).limit(50),
  ]);
  const reqUsers = new Map<string, string>();
  const ids = [...new Set(((reqs ?? []) as any[]).map((r) => r.requested_by).filter(Boolean))];
  if (ids.length) {
    const [{ data: a }, { data: t }] = await Promise.all([service.from('adult_profiles').select('user_id, display_name').in('user_id', ids), service.from('teacher_profiles').select('user_id, display_name').in('user_id', ids)]);
    for (const x of [...(a ?? []), ...(t ?? [])] as any[]) reqUsers.set(x.user_id, x.display_name);
  }
  const sel: React.CSSProperties = { padding: '0.3rem', marginRight: '0.4rem' };
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Question register</h1>
        <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Every question in the bank, with where it came from, who uploaded it, who reviewed it, and which request it answers. Rule: every session in every subject owes that subject at least {MIN_GROWTH_PER_SESSION} new questions (they are written in the background and wait here for review).</p>
        <AdminNav />
      </div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Where the {summary.total.toLocaleString('en-IN')} questions came from</h2>
      <p style={{ color: 'var(--slate)' }}>{summary.reviewed.toLocaleString('en-IN')} have been reviewed by a person. Questions from before v62 show as &quot;Original question bank&quot; or &quot;Written by AI (older)&quot;.</p>
      <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Source</th><th align="right">Questions</th><th align="right">Verified</th></tr></thead><tbody>
        {summary.byOrigin.map((o) => <tr key={o.origin}><td>{o.label}</td><td align="right">{o.count.toLocaleString('en-IN')}</td><td align="right">{o.verified.toLocaleString('en-IN')}</td></tr>)}
      </tbody></table>
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Who uploaded</h2>
      {summary.byContributor.length === 0 ? <p style={{ color: 'var(--slate)' }}>No teacher, tutor, centre or admin upload yet.</p> :
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Name</th><th align="left">Role</th><th align="right">Uploaded</th><th align="right">Verified</th><th align="right">Rejected</th><th align="right">Waiting</th></tr></thead><tbody>
          {summary.byContributor.map((c, i) => <tr key={i}><td>{c.name}</td><td>{c.role}</td><td align="right">{c.uploaded}</td><td align="right">{c.verified}</td><td align="right">{c.rejected}</td><td align="right">{c.pending}</td></tr>)}
        </tbody></table>}
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Requests for questions</h2>
      {(reqs ?? []).length === 0 ? <p style={{ color: 'var(--slate)' }}>No requests yet.</p> :
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Asked by</th><th align="left">For</th><th align="right">Done / wanted</th><th align="left">Status</th><th align="left">Action</th></tr></thead><tbody>
          {((reqs ?? []) as any[]).map((r) => <tr key={r.id}><td>{reqUsers.get(r.requested_by) ?? 'Unknown'} ({r.requester_role})</td><td>{r.skills?.name ?? r.topic_text ?? 'Subject'}{r.note ? ` — ${r.note}` : ''}</td><td align="right">{r.fulfilled_count} / {r.wanted_count}</td><td>{String(r.status).replace('_', ' ')}</td><td><RequestButtons id={r.id} status={r.status} /></td></tr>)}
        </tbody></table>}
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Questions (latest 100 matching)</h2>
      <form method="get" style={{ marginBottom: '0.6rem' }}>
        <select name="table" defaultValue={sp.table ?? 'all'} style={sel}><option value="all">All banks</option><option value="questions">Practice/quiz/mock</option><option value="diagnostic_questions">Diagnostic</option><option value="baseline_items">Earlier-class (adaptive)</option></select>
        <select name="origin" defaultValue={sp.origin ?? ''} style={sel}><option value="">Any source</option>{ORIGINS.map((o) => <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>)}</select>
        <select name="role" defaultValue={sp.role ?? ''} style={sel}><option value="">Anyone</option><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="tutor">Tutor</option><option value="centre">Coaching centre</option></select>
        <select name="status" defaultValue={sp.status ?? ''} style={sel}><option value="">Any status</option><option value="needs_review">Needs review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
        <select name="reviewed" defaultValue={sp.reviewed ?? ''} style={sel}><option value="">Reviewed or not</option><option value="yes">Reviewed by a person</option><option value="no">Not reviewed</option></select>
        <button className="btn btn--ghost btn--small">Filter</button>
      </form>
      <div style={{ overflowX: 'auto' }}><table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}><thead><tr><th align="left">Question</th><th align="left">Skill</th><th align="left">Source</th><th align="left">Uploaded by</th><th align="left">Status</th><th align="left">Reviewed by</th><th align="left">Teacher feedback</th><th align="left">Action</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.table + r.id} style={{ borderTop: '1px solid var(--line)' }}>
          <td style={{ maxWidth: 320 }}>{r.prompt.slice(0, 120)}</td><td>{r.skillName ?? ''}</td><td>{ORIGIN_LABEL[r.origin] ?? r.origin}</td>
          <td>{r.contributorName ? `${r.contributorName} (${r.contributorRole})` : r.contributorRole === 'system' ? 'System' : ''}{r.orgName && r.orgName !== r.contributorName ? ` · ${r.orgName}` : ''}</td>
          <td>{STATUS_WORD[r.status] ?? r.status}</td><td>{r.reviewedBy ? `${r.reviewedBy}${r.reviewedAt ? ' · ' + new Date(r.reviewedAt).toLocaleDateString('en-IN') : ''}` : '—'}</td>
          <td>{r.teacherReviews.map((t) => `${t.name}: ${t.verdict.replace('_', ' ')}`).join('; ') || '—'}</td>
          <td><ReviewButtons table={r.table} id={r.id} /></td></tr>)}
        {rows.length === 0 && <tr><td colSpan={8} style={{ color: 'var(--slate)' }}>Nothing matches.</td></tr>}
      </tbody></table></div>
      <div style={{ marginTop: 'var(--space-4)', maxWidth: 640 }}><QuestionContribute admin /></div>
    </div></main>
  );
}
