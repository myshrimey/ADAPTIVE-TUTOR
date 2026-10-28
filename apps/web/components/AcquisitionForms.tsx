'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Opt = [string, string];
type Field = { name: string; label: string; type?: 'text' | 'number' | 'date' | 'select' | 'textarea'; options?: Opt[]; placeholder?: string; required?: boolean; def?: string };
// v76: small admin forms for the acquisition page. Each posts one action to /api/admin/acquisition (admin only) and refreshes the page.
function Form({ title, action, fields, hint, extra, button = 'Save' }: { title: string; action: string; fields: Field[]; hint?: string; extra?: Record<string, unknown>; button?: string }) {
  const router = useRouter(); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const fd = new FormData(e.currentTarget); const body: Record<string, unknown> = { action, ...extra }; for (const f of fields) body[f.name] = String(fd.get(f.name) ?? '');
    try { const r = await fetch('/api/admin/acquisition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) setMsg({ ok: false, t: j.error ?? 'Could not save.' }); else { const n = j.data?.note ?? (j.data?.code ? `Saved. Code: ${j.data.code}` : 'Saved.'); setMsg({ ok: true, t: n }); (e.target as HTMLFormElement).reset(); router.refresh(); }
    } catch { setMsg({ ok: false, t: 'Could not reach the server. Please try again.' }); } finally { setBusy(false); }
  }
  return (
    <details style={{ margin: '0.4rem 0', border: '1px solid var(--line)', borderRadius: 8, padding: '0.4rem 0.7rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{title}</summary>
      {hint && <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>{hint}</p>}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.5rem', alignItems: 'end' }}>
        {fields.map((f) => (
          <label key={f.name} style={{ display: 'grid', gap: 2, fontSize: '0.82rem' }}>{f.label}
            {f.type === 'select' ? <select name={f.name} defaultValue={f.def ?? f.options?.[0]?.[0]}>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : f.type === 'textarea' ? <textarea name={f.name} rows={2} placeholder={f.placeholder} defaultValue={f.def} />
              : <input name={f.name} type={f.type ?? 'text'} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} required={f.required} defaultValue={f.def} />}
          </label>
        ))}
        <div><button className="btn btn--small btn--accent" disabled={busy}>{busy ? 'Saving…' : button}</button></div>
      </form>
      {msg && <p role="status" style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: msg.ok ? '#1b6b3a' : '#b3261e' }}>{msg.t}</p>}
    </details>
  );
}
function Act({ label, action, extra, confirmText }: { label: string; action: string; extra?: Record<string, unknown>; confirmText?: string }) {
  const router = useRouter(); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function go() { if (confirmText && !window.confirm(confirmText)) return; setBusy(true); try { const r = await fetch('/api/admin/acquisition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) }); const j = await r.json().catch(() => ({})); setMsg(j.error ?? (j.data?.saved !== undefined ? `Saved ${j.data.saved} older accounts.` : 'Saved.')); router.refresh(); } catch { setMsg('Could not reach the server.'); } finally { setBusy(false); } }
  return <span><button className="btn btn--ghost btn--small" onClick={go} disabled={busy}>{label}</button> {msg && <span style={{ fontSize: '0.8rem' }}>{msg}</span>}</span>;
}
const SRC: Opt[] = [['', 'Not recorded'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['google', 'Google'], ['referral', 'Referral'], ['tutor', 'Tutor'], ['coaching_centre', 'Coaching centre'], ['school', 'School'], ['government_school', 'Government school'], ['founder', 'Founder'], ['offline', 'Offline'], ['event', 'Event'], ['partner', 'Partner'], ['direct', 'Direct']];

export function AcquisitionForms({ settings, untagged, partnerCodes }: { settings: { minSample: number; model: string; weights: { signup: number; diagnostic: number; active: number; paid: number } }; untagged: { kind: string; id: string; date: string; amount: number; what: string }[]; partnerCodes: string[] }): ReactNode {
  return (
    <div>
      <Form title="Add a partner (tutor, coaching centre, school)" action="partner_create" hint="Makes a code such as TUTOR-ARUN-001. Share it as a link ending ?p=CODE. Rewards or commission stay a manual decision; nothing is promised or paid automatically." button="Create partner"
        fields={[{ name: 'kind', label: 'Type', type: 'select', options: [['tutor', 'Tutor'], ['centre', 'Coaching centre'], ['school', 'School'], ['govt_school', 'Government school'], ['other', 'Other partner']] }, { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Arun Kumar' }, { name: 'status', label: 'Stage', type: 'select', options: [['lead', 'Lead'], ['meeting', 'Meeting'], ['pilot', 'Pilot'], ['active', 'Active']] }, { name: 'notes', label: 'Notes' }]} />
      <Form title="Change a partner's stage or reward note" action="partner_update" hint="Reward status is only a record of YOUR decision." button="Update"
        fields={[{ name: 'code', label: 'Partner code', type: 'select', options: partnerCodes.length ? partnerCodes.map((c) => [c, c] as Opt) : [['', 'No partners yet']] }, { name: 'status', label: 'Stage', type: 'select', options: [['lead', 'Lead'], ['meeting', 'Meeting'], ['pilot', 'Pilot'], ['active', 'Active'], ['paused', 'Paused'], ['closed', 'Closed']] }, { name: 'rewardStatus', label: 'Reward decision (manual)', type: 'select', options: [['none', 'None'], ['under_review', 'Under review'], ['approved', 'Approved'], ['declined', 'Declined'], ['paid_by_hand', 'Paid by hand']] }, { name: 'rewardNote', label: 'Reward note' }]} />
      <Form title="Record an offline sale (UPI, cash, bank)" action="sale" hint="A student sale goes into the same payments table as everything else. Saving a sale does not switch on access: do that at /admin/payments." button="Save sale"
        fields={[{ name: 'who', label: 'Customer is', type: 'select', options: [['student', 'A student (by username)'], ['organisation', 'A tutor / centre / school / other']] }, { name: 'username', label: 'Student username (students only)' }, { name: 'customerKind', label: 'Organisation type', type: 'select', options: [['tutor', 'Tutor'], ['centre', 'Coaching centre'], ['school', 'School'], ['govt_school', 'Government school'], ['parent', 'Parent'], ['other', 'Other']] }, { name: 'customerName', label: 'Organisation name (kept private)' },
          { name: 'offer', label: 'Offer / product' }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'paymentDate', label: 'Payment date', type: 'date', required: true }, { name: 'reference', label: 'Payment reference' }, { name: 'status', label: 'Payment status (students)', type: 'select', options: [['pending', 'Pending'], ['confirmed', 'Confirmed'], ['rejected', 'Rejected']] },
          { name: 'activation', label: 'Activation date', type: 'date' }, { name: 'expiry', label: 'Expiry', type: 'date' }, { name: 'source', label: 'Where the customer came from', type: 'select', options: SRC }, { name: 'campaign', label: 'Campaign' }, { name: 'partner', label: 'Partner code' }, { name: 'referralCode', label: 'Invite code quoted' }, { name: 'notes', label: 'Notes' }]} />
      {untagged.length > 0 && (
        <details style={{ margin: '0.4rem 0', border: '1px solid var(--line)', borderRadius: 8, padding: '0.4rem 0.7rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Payments with no source yet ({untagged.length})</summary>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Tell Sahayak where each one came from so revenue lands under the right source.</p>
          {untagged.slice(0, 8).map((u) => (
            <Form key={u.id} title={`${u.date} · ₹${u.amount} · ${u.what}`} action="tag_sale" extra={u.kind === 'payment' ? { pilotPaymentId: u.id } : { revenueEntryId: u.id }} button="Tag"
              fields={[{ name: 'source', label: 'Source', type: 'select', options: SRC }, { name: 'campaign', label: 'Campaign' }, { name: 'partner', label: 'Partner code' }, { name: 'referralCode', label: 'Invite code' }]} />
          ))}
        </details>
      )}
      <Form title="Campaign" action="campaign" hint="Same campaigns as the Social Media Growth Engine; owner and platforms are extra." button="Save campaign"
        fields={[{ name: 'name', label: 'Name', required: true, placeholder: 'e.g. CBSE-2027' }, { name: 'objective', label: 'Objective' }, { name: 'audience', label: 'Audience' }, { name: 'platforms', label: 'Platforms' }, { name: 'owner', label: 'Owner' }, { name: 'start_date', label: 'Start', type: 'date' }, { name: 'end_date', label: 'End', type: 'date' }, { name: 'budget_inr', label: 'Budget (₹, plan only)', type: 'number' }, { name: 'status', label: 'Status', type: 'select', options: [['active', 'Active'], ['paused', 'Paused'], ['finished', 'Finished']] }, { name: 'notes', label: 'Notes' }]} />
      <Form title="Record marketing spend (for cost per customer)" action="spend" hint="Cash only (ads, boosts, printing). Your own time is not money here. Tag it to a source or a campaign name (the tracked name, e.g. cbse-2027)." button="Save spend"
        fields={[{ name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'source', label: 'Source', type: 'select', options: SRC }, { name: 'campaign', label: 'Campaign (tracked name)' }, { name: 'category', label: 'Kind', type: 'select', options: [['marketing', 'Marketing'], ['referral', 'Referral reward cost']] }, { name: 'description', label: 'What for' }]} />
      <Form title="Experiment" action="experiment" hint="Variant A and B are the tracked campaign names or post names (utm_campaign / utm_content) of the two versions. Results show only when each has enough people." button="Save experiment"
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'hypothesis', label: 'Hypothesis' }, { name: 'channel', label: 'Channel' }, { name: 'audience', label: 'Audience' }, { name: 'variantA', label: 'Variant A (tracked name)' }, { name: 'variantB', label: 'Variant B (tracked name)' }, { name: 'startDate', label: 'Start', type: 'date' }, { name: 'endDate', label: 'End', type: 'date' }, { name: 'metric', label: 'Success metric', type: 'select', options: [['signup_rate', 'Sign-up rate'], ['diagnostic_completion', 'Diagnostic completion'], ['activation', 'Activation'], ['d7_retention', 'D7 retention'], ['paid_conversion', 'Paid conversion'], ['revenue_per_customer', 'Revenue per customer']] }, { name: 'status', label: 'Status', type: 'select', options: [['running', 'Running'], ['planned', 'Planned'], ['finished', 'Finished'], ['stopped', 'Stopped']] }]} />
      <SettingsForm settings={settings} />
      <p style={{ margin: '0.5rem 0' }}><Act label="Save the source of older accounts" action="backfill" confirmText="Store the first-touch source for accounts made before tracking? Existing records are never changed." /> <span style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Optional. The dashboard already reads older accounts' recorded source; this just stores it.</span></p>
    </div>
  );
}
function SettingsForm({ settings }: { settings: { minSample: number; model: string; weights: { signup: number; diagnostic: number; active: number; paid: number } } }) {
  const router = useRouter(); const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const n = (k: string) => Number(fd.get(k));
    const r = await fetch('/api/admin/acquisition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settings', settings: { minSample: n('minSample'), model: String(fd.get('model')), weights: { signup: n('w1'), diagnostic: n('w2'), active: n('w3'), paid: n('w4') } } }) }); const j = await r.json().catch(() => ({}));
    setMsg(j.error ?? 'Saved.'); router.refresh();
  }
  return (
    <details style={{ margin: '0.4rem 0', border: '1px solid var(--line)', borderRadius: 8, padding: '0.4rem 0.7rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Settings: minimum sample, reporting model, referral quality weights</summary>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', alignItems: 'end' }}>
        <label style={{ display: 'grid', fontSize: '0.82rem' }}>People needed before a rate or advice is shown<input name="minSample" type="number" min={5} max={500} defaultValue={settings.minSample} /></label>
        <label style={{ display: 'grid', fontSize: '0.82rem' }}>Default reporting model<select name="model" defaultValue={settings.model}><option value="first_touch">First touch</option><option value="last_touch">Last touch</option><option value="referral">Referral source</option><option value="all_touches">All attributed touches</option></select></label>
        <label style={{ display: 'grid', fontSize: '0.82rem' }}>Points: sign-up<input name="w1" type="number" min={0} max={100} defaultValue={settings.weights.signup} /></label>
        <label style={{ display: 'grid', fontSize: '0.82rem' }}>Points: diagnostic done<input name="w2" type="number" min={0} max={100} defaultValue={settings.weights.diagnostic} /></label>
        <label style={{ display: 'grid', fontSize: '0.82rem' }}>Points: active learner<input name="w3" type="number" min={0} max={100} defaultValue={settings.weights.active} /></label>
        <label style={{ display: 'grid', fontSize: '0.82rem' }}>Points: paid customer<input name="w4" type="number" min={0} max={100} defaultValue={settings.weights.paid} /></label>
        <div><button className="btn btn--small btn--accent">Save settings</button></div>
      </form>{msg && <p role="status" style={{ fontSize: '0.88rem' }}>{msg}</p>}
    </details>
  );
}
