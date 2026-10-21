import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { CRM_KINDS, CRM_STAGES, CRM_STATUS, FUNDING_KINDS, FUNDING_STAGES, ELIGIBILITY_STATUSES, CONFIDENCE, EXPENSE_CATEGORIES, normaliseSource } from '@adaptive-tutor/core';

// Admin-only writes for the Founder Command Centre. One route, a fixed list of tables and columns, every value checked here.
// Nothing is deleted except through the explicit "delete" action, which only exists for these founder tables.

type Kind = 'text' | 'int' | 'date' | 'bool' | 'enum' | 'json';
type Spec = Record<string, { t: Kind; max?: number; opts?: string[]; req?: boolean; min?: number; maxv?: number }>;
const T = (max = 300, req = false) => ({ t: 'text' as Kind, max, req });
const INT = (min = 0, maxv = 1_000_000_000) => ({ t: 'int' as Kind, min, maxv });
const DATE = { t: 'date' as Kind };
const ENUM = (opts: string[], req = false) => ({ t: 'enum' as Kind, opts, req });

const TABLES: Record<string, { table: string; spec: Spec }> = {
  crm: { table: 'crm_records', spec: {
    kind: ENUM(Object.keys(CRM_KINDS), true), name: T(160, true), organisation: T(160), phone: T(40), email: T(160), city: T(80), state: T(80), board: T(40), class_level: T(40), subjects: T(160),
    source: T(40), stage: ENUM(CRM_STAGES.map((s) => s[0])), status: ENUM(CRM_STATUS), first_contact: DATE, last_contact: DATE, next_followup: DATE, interest: T(500), objections: T(500),
    plan_discussed: T(160), price_discussed: INT(), amount_paid: INT(), potential_value: INT(), probability: INT(0, 100), owner: T(80), tags: T(200), notes: T(2000), extra: { t: 'json' } } },
  funding: { table: 'funding_records', spec: {
    kind: ENUM(Object.keys(FUNDING_KINDS), true), subtype: T(80), name: T(160, true), organisation: T(160), website: T(300), linkedin: T(300), location: T(120), country: T(80), sector_focus: T(300),
    stage_preference: T(120), cheque_min: INT(), cheque_max: INT(), geography: T(160), traction_requirement: T(300), previous_investments: T(500), why_fit: T(800), warm_intro: { t: 'bool' },
    intro_source: T(200), contact_person: T(160), email: T(160), phone: T(40), source: T(300), last_verified: DATE, confidence: ENUM(CONFIDENCE), stage: ENUM(FUNDING_STAGES.map((s) => s[0])),
    priority: ENUM(['low', 'normal', 'high']), amount_requested: INT(), amount_offered: INT(), amount_received: INT(), valuation_note: T(300), instrument: T(120), next_action: T(300),
    next_followup: DATE, deadline: DATE, eligibility_status: ENUM(ELIGIBILITY_STATUSES.map((s) => s[0])), documents_required: T(500), reason_rejected: T(500), fit: { t: 'json' }, notes: T(2000) } },
  expense: { table: 'expenses', spec: { spent_on: { ...DATE, req: true } as any, category: ENUM(Object.keys(EXPENSE_CATEGORIES), true), description: T(300), vendor: T(160), amount_inr: { ...INT(0, 100_000_000), req: true } as any, recurring: { t: 'bool' } } },
  revenue: { table: 'revenue_entries', spec: { received_on: { ...DATE, req: true } as any, customer_kind: ENUM([...Object.keys(CRM_KINDS)], true), customer_name: T(160), product: T(160), amount_inr: { ...INT(0, 100_000_000), req: true } as any, method: ENUM(['upi', 'qr', 'bank_transfer', 'cash', 'other'], true), reference: T(80), notes: T(500) } },
  task: { table: 'founder_tasks', spec: { title: T(300, true), area: T(80), priority: ENUM(['p0', 'p1', 'p2']), due: DATE, status: ENUM(['open', 'done']), notes: T(1000) } },
  changelog: { table: 'system_changelog', spec: { changed_on: DATE, version: T(40), change: T(1000, true), reason: T(500), files: T(1000), database_changes: T(500), pricing_changes: T(500), ai_model_changes: T(500), deployment: T(500) } },
};

function clean(spec: Spec, input: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(spec)) {
    if (!(k in input)) { if (!partial && (def as any).req) throw new Error(`${k}_required`); continue; }
    let v: any = input[k];
    const empty = v === null || v === undefined || v === '';
    if (empty) { if ((def as any).req) throw new Error(`${k}_required`); out[k] = def.t === 'bool' ? false : null; continue; }
    switch (def.t) {
      case 'text': v = String(v).trim().slice(0, def.max ?? 300); if (!v && (def as any).req) throw new Error(`${k}_required`); out[k] = v || null; break;
      case 'int': { const n = Math.floor(Number(v)); if (!Number.isFinite(n) || n < (def.min ?? 0) || n > (def.maxv ?? 1e9)) throw new Error(`${k}_bad_number`); out[k] = n; break; }
      case 'date': if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error(`${k}_bad_date`); out[k] = String(v); break;
      case 'bool': out[k] = v === true || v === 'true' || v === 'yes'; break;
      case 'enum': if (!def.opts!.includes(String(v))) throw new Error(`${k}_bad_choice`); out[k] = String(v); break;
      case 'json': { const o = typeof v === 'string' ? JSON.parse(v) : v; if (!o || typeof o !== 'object' || Array.isArray(o) || JSON.stringify(o).length > 4000) throw new Error(`${k}_bad_json`); out[k] = o; break; }
    }
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const s = createServiceClient();
    const action = String(b.action ?? '');

    if (action === 'save' || action === 'delete') {
      const def = TABLES[String(b.what ?? '')];
      if (!def) throw new Error('unknown_table');
      const id = b.id ? String(b.id) : null;
      if (action === 'delete') {
        if (!id) throw new Error('id_required');
        const { error } = await s.from(def.table).delete().eq('id', id); if (error) throw error;
        if (b.what === 'crm' || b.what === 'funding') await s.from('crm_activities').delete().eq('record_id', id);
        return NextResponse.json({ data: { ok: true }, error: null });
      }
      const input = { ...((b.values ?? {}) as Record<string, unknown>) };
      if (b.what === 'crm') {
        // School / institution fields arrive as x_<name> and are stored together in the extra column (short text / numbers / dates only).
        const extra: Record<string, unknown> = {};
        for (const k of Object.keys(input)) if (k.startsWith('x_')) { const v = input[k]; delete input[k]; if (v !== '' && v !== null && v !== undefined && /^[a-z_]{1,40}$/.test(k.slice(2))) extra[k.slice(2)] = typeof v === 'number' ? v : String(v).slice(0, 300); }
        if (Object.keys(extra).length || !id) {
          if (id) { const { data: cur } = await s.from('crm_records').select('extra').eq('id', id).maybeSingle(); input.extra = { ...(cur?.extra ?? {}), ...extra }; } else input.extra = extra;
        }
      }
      const values = clean(def.spec, input, !!id);
      if (b.what === 'crm' && 'source' in values && values.source) values.source = normaliseSource(String(values.source));
      if (b.what === 'task' && values.status === 'done') (values as any).done_at = new Date().toISOString();
      if (b.what === 'task' && values.status === 'open') (values as any).done_at = null;
      if (b.what === 'crm' || b.what === 'funding') (values as any).updated_at = new Date().toISOString();
      if (b.what === 'expense' || b.what === 'revenue') (values as any)[b.what === 'expense' ? 'created_by' : 'verified_by'] = admin.email;
      if (b.what === 'changelog' && !values.changed_on) delete (values as any).changed_on;
      const q = id ? s.from(def.table).update(values).eq('id', id) : s.from(def.table).insert(values);
      const { data, error } = await (q as any).select('id').single();
      if (error) throw error;
      return NextResponse.json({ data: { id: data?.id }, error: null });
    }
    if (action === 'activity') {
      const table = b.table === 'funding' ? 'funding' : 'crm';
      const note = String(b.note ?? '').trim().slice(0, 1000);
      if (!note || !b.recordId) throw new Error('note_required');
      const { error } = await s.from('crm_activities').insert({ record_table: table, record_id: String(b.recordId), kind: String(b.kind ?? 'note').slice(0, 30), note, by_email: admin.email });
      if (error) throw error;
      const upd: any = { updated_at: new Date().toISOString() };
      if (table === 'crm') upd.last_contact = new Date().toISOString().slice(0, 10);
      await s.from(table === 'crm' ? 'crm_records' : 'funding_records').update(upd).eq('id', String(b.recordId));
    } else if (action === 'doc_status') {
      if (!['missing', 'needs_update', 'complete'].includes(String(b.status))) throw new Error('bad_status');
      const { error } = await s.from('funding_documents').update({ status: b.status, notes: typeof b.notes === 'string' ? b.notes.slice(0, 500) : undefined, updated_at: new Date().toISOString() }).eq('key', String(b.key));
      if (error) throw error;
    } else if (action === 'memory_set') {
      const { error } = await s.from('founder_memory').update({ body: String(b.body ?? '').slice(0, 20000), updated_at: new Date().toISOString() }).eq('section', String(b.section));
      if (error) throw error;
    } else throw new Error('unknown_action');
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    const m = String(err?.message ?? 'error');
    return NextResponse.json({ data: null, error: /^[a-z0-9_]+$/.test(m) ? m : /JSON/.test(m) ? 'bad_json' : 'failed' }, { status: m === 'not_authorized' ? 403 : 400 });
  }
}
