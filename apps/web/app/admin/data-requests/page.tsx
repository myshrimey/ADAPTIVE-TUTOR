import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { DataRequestButtons } from '@/components/DataRequestButtons';

export const dynamic = 'force-dynamic';

export default async function AdminDataRequestsPage() {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;
  const service = createServiceClient();
  const { data } = await service.from('data_requests').select('*').order('requested_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as any[];
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Data deletion requests</h1>
          <AdminNav />
          <p style={{ color: 'var(--slate)' }}>
            A family asked for a student&apos;s data to be deleted. &quot;Delete everything&quot; removes the student, all learning records, mock and written-answer records, payment records and the login, and cannot be undone. Download the payments sheet from Funnel first if your accounts need it, and agree the rules for keeping anything (for example payment records) with your accountant or lawyer. Anything you keep must be listed in the privacy policy.
          </p>
        </div>
        {rows.length === 0 ? <p>No requests.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}><th>Student</th><th>Requested</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td>{r.student_label ?? <span style={{ color: 'var(--slate)' }}>(cleared)</span>}</td>
                  <td>{String(r.requested_at).slice(0, 10)}</td>
                  <td>{r.status}{r.completed_at ? ` · ${String(r.completed_at).slice(0, 10)}` : ''}</td>
                  <td>{r.status === 'requested' && <DataRequestButtons requestId={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
