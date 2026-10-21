import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { DEFAULT_SETTINGS } from '@adaptive-tutor/core';

// Admin-only editing of prices, offers and settings (no code needed). Every change is checked here, never trusted from the browser.
const int = (v: unknown, min = 0, max = 10_000_000) => { const n = Math.floor(Number(v)); if (!Number.isFinite(n) || n < min || n > max) throw new Error('bad_number'); return n; };
const dateOrNull = (v: unknown) => { if (v === null || v === '' || v === undefined) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('bad_date'); return String(v); };

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const s = createServiceClient();
    const log = async (what: string, detail: unknown) => { try { await s.from('commerce_events').insert({ event: 'admin_change', meta: { by: admin.email, what, detail } }); } catch { /* ignore */ } };

    if (b.action === 'product_update') {
      const code = String(b.code ?? '');
      const p = b.fields ?? {};
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ('price_inr' in p) upd.price_inr = int(p.price_inr);
      if ('list_price_inr' in p) upd.list_price_inr = p.list_price_inr === null || p.list_price_inr === '' ? null : int(p.list_price_inr);
      if ('mock_credits' in p) upd.mock_credits = int(p.mock_credits, 0, 1000);
      if ('credits_per_month' in p) upd.credits_per_month = int(p.credits_per_month, 0, 1000);
      if ('subject_count' in p) upd.subject_count = p.subject_count === null || p.subject_count === '' ? null : int(p.subject_count, 1, 10);
      if ('student_limit' in p) upd.student_limit = p.student_limit === null || p.student_limit === '' ? null : int(p.student_limit, 1, 100000);
      if ('validity_until' in p) upd.validity_until = dateOrNull(p.validity_until);
      if ('on_sale' in p) upd.on_sale = !!p.on_sale;
      if ('recommended' in p) upd.recommended = !!p.recommended;
      if ('name' in p) upd.name = String(p.name).trim().slice(0, 120) || undefined;
      if ('subtitle' in p) upd.subtitle = String(p.subtitle ?? '').trim().slice(0, 200) || null;
      if ('features' in p) upd.features = String(p.features ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
      const { error } = await s.from('commerce_products').update(upd).eq('code', code);
      if (error) throw error;
      await log('product_update', { code, upd });
    } else if (b.action === 'offer_upsert') {
      const o = b.offer ?? {};
      const code = String(o.code ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
      if (!code) throw new Error('offer_code_needed');
      if (!['percent', 'fixed', 'price'].includes(o.kind)) throw new Error('bad_kind');
      const row = {
        code, label: String(o.label ?? code).slice(0, 120), product_code: String(o.product_code ?? 'any').slice(0, 60), kind: o.kind, value: int(o.value),
        coupon_code: String(o.coupon_code ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30) || null,
        active: !!o.active, starts_on: dateOrNull(o.starts_on), ends_on: dateOrNull(o.ends_on), max_uses: o.max_uses === '' || o.max_uses == null ? null : int(o.max_uses, 1, 1_000_000), updated_at: new Date().toISOString(),
      };
      if (row.kind === 'percent' && row.value > 100) throw new Error('percent_over_100');
      const { error } = await s.from('commerce_offers').upsert(row, { onConflict: 'code' });
      if (error) throw error;
      await log('offer_upsert', row);
    } else if (b.action === 'offer_toggle') {
      const { error } = await s.from('commerce_offers').update({ active: !!b.active, updated_at: new Date().toISOString() }).eq('code', String(b.code));
      if (error) throw error;
      await log('offer_toggle', { code: b.code, active: !!b.active });
    } else if (b.action === 'setting_set') {
      const key = String(b.key ?? '');
      if (!(key in DEFAULT_SETTINGS)) throw new Error('unknown_setting');
      let value = b.value;
      if (typeof value === 'string') value = JSON.parse(value);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('setting_must_be_an_object');
      const { error } = await s.from('commerce_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      await log('setting_set', { key });
    } else if (b.action === 'interest_status') {
      const st = String(b.status ?? '');
      if (!['new', 'contacted', 'in_talks', 'done', 'not_a_fit'].includes(st)) throw new Error('bad_status');
      const { error } = await s.from('commerce_interest').update({ status: st, admin_notes: typeof b.notes === 'string' ? b.notes.slice(0, 500) : undefined }).eq('id', String(b.id));
      if (error) throw error;
    } else return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    const m = String(err?.message ?? 'error');
    return NextResponse.json({ data: null, error: /Unexpected token|JSON/.test(m) ? 'that_is_not_valid_settings_text' : m }, { status: m === 'not_authorized' ? 403 : 400 });
  }
}
