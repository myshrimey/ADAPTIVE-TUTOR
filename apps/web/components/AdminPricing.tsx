'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type P = { code: string; name: string; subtitle: string; kind: string; price_inr: number; list_price_inr: number | null; mock_credits: number; credits_per_month: number; subject_count: number | null; student_limit: number | null; validity_until: string | null; on_sale: boolean; recommended: boolean; features: string[] };
type O = { code: string; label: string; product_code: string; kind: string; value: number; coupon_code: string | null; active: boolean; starts_on: string | null; ends_on: string | null; max_uses: number | null; used: number };
type S = { key: string; note: string | null; value: any };

async function call(body: unknown) {
  const r = await fetch('/api/admin/commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function ProductRow({ p }: { p: P }) {
  const router = useRouter();
  const [f, setF] = useState({ ...p, features: p.features.join('\n') } as any);
  const [msg, setMsg] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save() {
    const j = await call({ action: 'product_update', code: p.code, fields: { name: f.name, subtitle: f.subtitle, price_inr: f.price_inr, list_price_inr: f.list_price_inr, mock_credits: f.mock_credits, credits_per_month: f.credits_per_month, subject_count: f.subject_count, student_limit: f.student_limit, validity_until: f.validity_until, on_sale: f.on_sale, recommended: f.recommended, features: f.features } });
    setMsg(j.error ? `Not saved: ${j.error}` : 'Saved.'); if (!j.error) router.refresh();
  }
  const n = (k: string, label: string) => <label style={{ display: 'block', fontSize: '0.85rem' }}>{label}<input className="field__input" type="number" value={f[k] ?? ''} onChange={set(k)} style={{ maxWidth: 140 }} /></label>;
  return (
    <details className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
      <summary><strong>{p.name}</strong> — ₹{p.price_inr}{p.on_sale ? '' : ' (not on sale)'} <span style={{ color: 'var(--slate)' }}>[{p.code}]</span></summary>
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem' }}>Name<input className="field__input" value={f.name} onChange={set('name')} /></label>
        <label style={{ fontSize: '0.85rem' }}>Subtitle<input className="field__input" value={f.subtitle ?? ''} onChange={set('subtitle')} /></label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {n('price_inr', 'Price (₹)')}{n('list_price_inr', 'Standard/list price (₹) — shown struck through if higher')}{n('mock_credits', 'Handwritten credits given once')}{n('credits_per_month', 'Credits added every month')}{n('subject_count', 'Subjects included')}{n('student_limit', 'Student limit (tutor/centre)')}
          <label style={{ display: 'block', fontSize: '0.85rem' }}>Valid until<input className="field__input" type="date" value={f.validity_until ?? ''} onChange={set('validity_until')} /></label>
        </div>
        <label style={{ fontSize: '0.85rem' }}>What is included (one line each)<textarea className="field__input" rows={5} value={f.features} onChange={set('features')} /></label>
        <label><input type="checkbox" checked={!!f.on_sale} onChange={set('on_sale')} /> On sale (shown on the Plans page)</label>
        <label><input type="checkbox" checked={!!f.recommended} onChange={set('recommended')} /> Show as “Recommended”</label>
        <div><button className="btn btn--accent btn--small" onClick={save}>Save</button> <span style={{ color: 'var(--slate)' }}>{msg}</span></div>
      </div>
    </details>
  );
}

function OfferRow({ o, products }: { o: Partial<O>; products: P[] }) {
  const router = useRouter();
  const [f, setF] = useState<any>({ code: '', label: '', product_code: 'any', kind: 'percent', value: 10, coupon_code: '', active: false, starts_on: '', ends_on: '', max_uses: '', ...o });
  const [msg, setMsg] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save() { const j = await call({ action: 'offer_upsert', offer: f }); setMsg(j.error ? `Not saved: ${j.error}` : 'Saved.'); if (!j.error) router.refresh(); }
  return (
    <div className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ fontSize: '0.85rem' }}>Short code<input className="field__input" value={f.code} onChange={set('code')} disabled={!!o.code} style={{ maxWidth: 150 }} /></label>
        <label style={{ fontSize: '0.85rem' }}>Label shown to parents<input className="field__input" value={f.label} onChange={set('label')} /></label>
        <label style={{ fontSize: '0.85rem' }}>Applies to<select className="field__input" value={f.product_code} onChange={set('product_code')}><option value="any">Any product</option>{products.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
        <label style={{ fontSize: '0.85rem' }}>Type<select className="field__input" value={f.kind} onChange={set('kind')}><option value="percent">Percent off</option><option value="fixed">Rupees off</option><option value="price">New price (₹)</option></select></label>
        <label style={{ fontSize: '0.85rem' }}>Value<input className="field__input" type="number" value={f.value} onChange={set('value')} style={{ maxWidth: 100 }} /></label>
        <label style={{ fontSize: '0.85rem' }}>Coupon (empty = automatic)<input className="field__input" value={f.coupon_code ?? ''} onChange={set('coupon_code')} style={{ maxWidth: 150 }} /></label>
        <label style={{ fontSize: '0.85rem' }}>From<input className="field__input" type="date" value={f.starts_on ?? ''} onChange={set('starts_on')} /></label>
        <label style={{ fontSize: '0.85rem' }}>Until<input className="field__input" type="date" value={f.ends_on ?? ''} onChange={set('ends_on')} /></label>
        <label style={{ fontSize: '0.85rem' }}>Max uses<input className="field__input" type="number" value={f.max_uses ?? ''} onChange={set('max_uses')} style={{ maxWidth: 100 }} /></label>
        <label><input type="checkbox" checked={!!f.active} onChange={set('active')} /> Active</label>
        <button className="btn btn--accent btn--small" onClick={save}>{o.code ? 'Save' : 'Add offer'}</button>
      </div>
      <div style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>{o.code ? `Used ${o.used} time(s). ` : ''}{msg}</div>
    </div>
  );
}

function SettingRow({ s }: { s: S }) {
  const router = useRouter();
  const [text, setText] = useState(JSON.stringify(s.value, null, 2));
  const [msg, setMsg] = useState('');
  async function save() { const j = await call({ action: 'setting_set', key: s.key, value: text }); setMsg(j.error ? `Not saved: ${j.error}` : 'Saved.'); if (!j.error) router.refresh(); }
  return (
    <details className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
      <summary><strong>{s.key}</strong> <span style={{ color: 'var(--slate)' }}>— {s.note}</span></summary>
      <textarea className="field__input" rows={Math.min(14, text.split('\n').length + 1)} value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'monospace' }} />
      <div><button className="btn btn--accent btn--small" onClick={save}>Save</button> <span style={{ color: 'var(--slate)' }}>{msg}</span></div>
    </details>
  );
}

export function AdminPricing({ products, offers, settings }: { products: P[]; offers: O[]; settings: S[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Plans and prices</h2>
      <p style={{ color: 'var(--slate)' }}>Click a plan to change its price, credits, validity or wording. Changes show on the Plans page straight away. People who already bought keep what they bought.</p>
      {products.map((p) => <ProductRow key={p.code} p={p} />)}
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Offers and coupons</h2>
      <p style={{ color: 'var(--slate)' }}>An offer with no coupon applies automatically while it is Active and within its dates. The standard price stays visible, struck through.</p>
      {offers.map((o) => <OfferRow key={o.code} o={o} products={products} />)}
      <h3 style={{ marginTop: 'var(--space-3)' }}>Add a new offer</h3>
      <OfferRow o={{}} products={products} />
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Limits and settings</h2>
      <p style={{ color: 'var(--slate)' }}>Free limits, payment (UPI) details, handwritten-evaluation rules, cost assumptions, willingness-to-pay questions and feature switches. Edit the numbers between the quotes; keep the brackets and commas.</p>
      {settings.map((s) => <SettingRow key={s.key} s={s} />)}
    </div>
  );
}
