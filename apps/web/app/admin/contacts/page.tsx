import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadContacts, writeAudit, INVITE_ROLES, INVITE_ROLE_LABEL } from '@adaptive-tutor/core';
import ContactRowEditor from './ContactRowEditor';

export const dynamic = 'force-dynamic';

// v136: Contact book. Super Admin only. Shows FULL email, phone and WhatsApp, so every opening is written to the Audit log (without the values).
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 80) : '';
  const role = typeof sp.role === 'string' && (INVITE_ROLES as readonly string[]).concat(['admin']).includes(sp.role) ? sp.role : '';
  const service = createServiceClient();
  const { rows, truncated } = await loadContacts(service, { q, role });
  await writeAudit(service, { actorEmail: g.email, actorRole: 'super_admin', action: 'contact.view', entity: 'contact_book', outcome: 'success', detail: { shown: rows.length, filtered: !!(q || role) } });
  const box = { padding: '4px 8px', marginRight: 8, marginBottom: 6 } as const;
  const th = { paddingRight: 12 } as const;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Contact book</h1>
        <p style={{ color: 'var(--slate)' }}>Super Admin only. Full email, phone and WhatsApp of every account. Opening this page and every edit are recorded in the Audit log (the numbers themselves are not). Changing an email also changes the sign-in email. Signed in as {g.email}.</p>
        <AdminNav />
        <form method="get" style={{ margin: '12px 0' }}>
          <input name="q" defaultValue={q} placeholder="Search name, email, phone, id" style={box} aria-label="Search" />
          <select name="role" defaultValue={role} style={box} aria-label="Role"><option value="">Any role</option>{INVITE_ROLES.map((r) => <option key={r} value={r}>{INVITE_ROLE_LABEL[r]}</option>)}<option value="admin">Admin</option></select>
          <button type="submit" style={box}>Filter</button> <a href="/admin/contacts">Clear</a>
        </form>
        <p>{rows.length} shown{truncated ? ' (capped at 500; narrow the search)' : ''}. Parent details come from the family Profile page and are read-only here.</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead><tr style={{ textAlign: 'left' }}>{['Role', 'Name', 'Email', 'Phone', 'WhatsApp', 'Note', '', 'Parent (from Profile)'].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.userId} style={{ verticalAlign: 'top' }}>
              <td style={th}>{r.role}</td><td style={th}>{r.name ?? r.username ?? ''}</td>
              <ContactRowEditor userId={r.userId} email={r.email} phone={r.phone} whatsapp={r.whatsapp} note={r.note} />
              <td style={th}>{[r.parentName, r.parentPhone, r.parentWhatsapp && `WhatsApp ${r.parentWhatsapp}`, r.parentEmail].filter(Boolean).join(' · ')}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div></main>
  );
}
