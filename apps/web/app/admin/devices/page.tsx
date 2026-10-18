import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { MAX_DEVICES_PER_ACCOUNT } from '@adaptive-tutor/core';
import { ResetDevicesButton } from '@/components/ResetDevicesButton';

// Founder-only: which devices each family login has used (2-device limit), with a reset button.
export const dynamic = 'force-dynamic';

export default async function AdminDevicesPage() {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;
  const service = createServiceClient();
  const [{ data: students }, { data: devices }] = await Promise.all([
    service.from('students').select('id, display_name, users(email, auth_user_id)').order('created_at', { ascending: false }).limit(500),
    service.from('account_devices').select('auth_user_id, label, ip, first_seen, last_seen').order('first_seen'),
  ]);
  const byUser = new Map<string, any[]>();
  for (const d of (devices ?? []) as any[]) byUser.set(d.auth_user_id, [...(byUser.get(d.auth_user_id) ?? []), d]);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Devices</h1>
          <AdminNav />
          <p style={{ color: 'var(--slate)' }}>
            Each login may be used on {MAX_DEVICES_PER_ACCOUNT} devices. A device here is a browser on a computer or phone: Sahayak records a random browser id, the IP address and the browser/system description. A website cannot read a computer&apos;s hardware address. Someone who clears their browser data looks like a new device and uses up a place; use &quot;Clear devices&quot; when a family changes computer or phone.
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                <th>Student</th><th>Email</th><th>Devices</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(students ?? []).map((s: any) => {
                const list = byUser.get(s.users?.auth_user_id) ?? [];
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                    <td>{s.display_name}</td>
                    <td>{s.users?.email}</td>
                    <td>
                      {list.length === 0 ? <span style={{ color: 'var(--slate)' }}>none yet</span> : list.map((d, i) => (
                        <div key={i}>{d.label} · IP {d.ip ?? 'unknown'} · first {String(d.first_seen).slice(0, 10)} · last {String(d.last_seen).slice(0, 10)}</div>
                      ))}
                    </td>
                    <td>{list.length > 0 && <ResetDevicesButton studentId={s.id} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
