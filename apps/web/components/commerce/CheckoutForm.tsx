'use client';
import { useEffect, useState } from 'react';
import { track } from './TrackView';
import { inr } from './PriceLine';

type SubjectOpt = { slug: string; name: string; status: string };
type Quote = { listInr: number; discountInr: number; finalInr: number; offer: { code: string; label: string } | null; quantity: number };

const ERR: Record<string, string> = {
  unauthenticated: 'Please sign in with the student account first.', device_limit: 'This account is already used on two other devices.',
  choose_subjects: 'Please choose the subjects.', too_many_subjects: 'You chose more subjects than this plan includes.',
  payment_reference_required: 'Please type the payment reference (UTR / transaction number) shown in your UPI app.',
  already_submitted: 'You already sent a request for this a few minutes ago. We are checking it.',
  child_not_linked: 'This child is not linked to your account.', reference_already_used: 'This payment reference was already submitted.', bad_payment_date: 'Please choose the payment date.',
  product_not_available: 'This plan is not available right now.', student_not_found: 'Please sign in with the student account.',
};

export function CheckoutForm({ code, name, kind, subjectCount, billing, subjects, initial, upi, kids }: {
  kids?: { id: string; name: string }[];
  code: string; name: string; kind: string; subjectCount: number | null; billing: string; subjects: SubjectOpt[]; initial: Quote;
  upi: { upi_id: string; qr_image_url: string; payee_name: string; extra: string };
}) {
  const [child, setChild] = useState(kids && kids.length === 1 ? kids[0].id : '');
  const [chosen, setChosen] = useState<string[]>([]);
  const [coupon, setCoupon] = useState('');
  const [qty, setQty] = useState(1);
  const [quote, setQuote] = useState<Quote>(initial);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<number | null>(null);
  const needsSubjects = subjectCount !== null && kind !== 'mock';
  const hasPay = !!(upi.upi_id || upi.qr_image_url);

  useEffect(() => { track('checkout_started', { productCode: code }); }, [code]);
  useEffect(() => { if (hasPay) track('payment_instructions_viewed', { productCode: code }); }, [code, hasPay]);

  async function requote(c = coupon, q = qty) {
    const r = await fetch('/api/commerce/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productCode: code, coupon: c, quantity: q }) }).then((x) => x.json()).catch(() => null);
    if (r?.data) setQuote(r.data);
  }
  function toggle(slug: string) {
    setChosen((cur) => {
      const has = cur.includes(slug);
      const next = has ? cur.filter((s) => s !== slug) : subjectCount && cur.length >= subjectCount ? cur : [...cur, slug];
      if (!has) track('subject_selected', { productCode: code });
      return next;
    });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (kids && !child) { setErr('Please choose which child this is for.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/commerce/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: kids ? child : undefined, productCode: code, subjectSlugs: chosen, coupon, quantity: qty, paymentDate: date, reference: ref }) });
      const j = await r.json();
      if (j.error) setErr(ERR[j.error] ?? 'Something went wrong. Please try again, or contact us.'); else setDone(j.data.amount);
    } catch { setErr('Could not reach the server. Check your internet.'); }
    setBusy(false);
  }

  if (done !== null) return (
    <div className="alert">
      <p style={{ margin: 0, fontWeight: 600 }}>Request received.</p>
      <p>We will check your payment of {inr(done)} and then switch on {name}. Founding access is activated manually after payment verification, usually within a day. You can see the status on the Plans page.</p>
      <a className="btn btn--accent" href="/plans">Back to plans</a>
    </div>
  );

  return (
    <form onSubmit={submit}>
      {kids && (
        <div className="field"><label className="field__label" htmlFor="child">This plan is for</label>
          {kids.length === 0 ? <p className="alert">No child is linked to your account yet. Link a child from your parent page first.</p>
            : <select id="child" className="field__input" value={child} onChange={(e) => setChild(e.target.value)}><option value="">Choose a child</option>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>}
        </div>
      )}
      <h2 style={{ fontSize: 'var(--step-1)' }}>1. Your price</h2>
      {kind === 'mock' && <div className="field"><label className="field__label" htmlFor="q">How many evaluations?</label><input id="q" type="number" min={1} max={20} className="field__input" value={qty} onChange={(e) => { const v = Math.min(20, Math.max(1, Number(e.target.value) || 1)); setQty(v); requote(coupon, v); }} style={{ maxWidth: 120 }} /></div>}
      <div className="chapter-row" style={{ display: 'block' }}>
        {quote.discountInr > 0 && <div style={{ color: 'var(--slate)' }}><s>{inr(quote.listInr)}</s> standard price · {quote.offer?.label} · you save {inr(quote.discountInr)}</div>}
        <div style={{ fontSize: 'var(--step-2)', fontWeight: 700 }}>{inr(quote.finalInr)} {billing === 'monthly' ? '/ month' : ''}</div>
      </div>
      <div className="field" style={{ marginTop: '0.6rem' }}>
        <label className="field__label" htmlFor="cp">Coupon code (optional)</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}><input id="cp" className="field__input" value={coupon} onChange={(e) => setCoupon(e.target.value)} autoCapitalize="none" /><button type="button" className="btn btn--ghost" onClick={() => requote()}>Apply</button></div>
      </div>

      {needsSubjects && (
        <>
          <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>2. Select the subjects your child is registered for</h2>
          <p style={{ color: 'var(--slate)' }}>Choose {subjectCount === 1 ? '1 subject' : `up to ${subjectCount} subjects`}. Chosen: {chosen.length}.</p>
          <div className="subject-chip-row">
            {subjects.map((s) => (
              <label key={s.slug} className="subject-chip" style={{ cursor: 'pointer', opacity: s.status === 'coming_soon' ? 0.6 : 1 }}>
                <input type="checkbox" checked={chosen.includes(s.slug)} onChange={() => toggle(s.slug)} disabled={!chosen.includes(s.slug) && !!subjectCount && chosen.length >= subjectCount} /> <span className="subject-chip__name">{s.name}</span>
              </label>
            ))}
          </div>
          <p style={{ fontSize: '0.85rem' }}>Subject not listed? <a href="/plans/apply/subject_request">Request a subject</a>.</p>
        </>
      )}

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>{needsSubjects ? '3' : '2'}. Pay by UPI</h2>
      {hasPay ? (
        <div className="chapter-row" style={{ display: 'block' }}>
          <div>Pay <strong>{inr(quote.finalInr)}</strong> using any UPI app{upi.payee_name ? <> to <strong>{upi.payee_name}</strong></> : null}.</div>
          {upi.upi_id && <div>UPI ID: <strong style={{ userSelect: 'all' }}>{upi.upi_id}</strong></div>}
          {upi.qr_image_url && <img src={upi.qr_image_url} alt="UPI QR code" style={{ maxWidth: 260, width: '100%', marginTop: '0.5rem' }} />}
          {upi.extra && <div style={{ color: 'var(--slate)' }}>{upi.extra}</div>}
        </div>
      ) : <p className="alert">UPI details are shared by the Sahayak team. Please <a href="/contact">contact us</a> for the payment details, pay, and then come back and fill in the form below.</p>}

      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>{needsSubjects ? '4' : '3'}. Tell us you have paid</h2>
      <div className="field"><label className="field__label" htmlFor="pd">Payment date</label><input id="pd" type="date" className="field__input" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
      <div className="field"><label className="field__label" htmlFor="pr">Payment reference (UTR / transaction number)</label><input id="pr" className="field__input" value={ref} onChange={(e) => setRef(e.target.value)} required maxLength={60} /></div>
      <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Never type a UPI PIN, password or OTP here. Founding access is currently activated manually after payment verification.</p>
      {err && <p className="alert">{err}</p>}
      <button className="btn btn--accent" disabled={busy}>{busy ? 'Sending…' : 'I have paid: send for checking'}</button>
    </form>
  );
}
