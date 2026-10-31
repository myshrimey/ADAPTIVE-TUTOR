import type { SupabaseClient } from '@supabase/supabase-js';

// v61: the configuration side of "board + class + year + subject + language + exam". Registers only; no curriculum content is invented here.
const s = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const err = (m: string) => new Error(m);

// ---- audit log ----------------------------------------------------------------------------------------------------
/** Records an admin action. Never throws and never stores secrets: only short, named fields are kept. */
export async function writeAudit(service: SupabaseClient, p: { actorEmail?: string | null; action: string; entity: string; entityId?: string | null; detail?: Record<string, unknown> }): Promise<void> {
  try {
    const detail: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p.detail ?? {})) {
      if (/pass|secret|token|key|answer|prompt/i.test(k)) continue; // never keep these
      detail[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
    await service.from('audit_logs').insert({ actor_email: p.actorEmail ?? null, action: s(p.action, 80), entity: s(p.entity, 80), entity_id: p.entityId ? s(p.entityId, 80) : null, detail });
  } catch { /* an audit problem never stops the action itself */ }
}
export async function listAudit(service: SupabaseClient, limit = 200) {
  const { data } = await service.from('audit_logs').select('id, at, actor_email, action, entity, entity_id, detail').order('at', { ascending: false }).limit(limit);
  return (data ?? []) as { id: string; at: string; actor_email: string | null; action: string; entity: string; entity_id: string | null; detail: any }[];
}

// ---- exam sessions --------------------------------------------------------------------------------------------------
export const EXAM_STATUSES = ['draft', 'published', 'closed'] as const;
const ymd = (v: unknown): string | null => { const t = s(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t)) ? t : null; };
export interface ExamSessionInput { id?: string; board?: string; academic_year: string; class_level: string; exam_type?: string; session_label: string; start_date?: string | null; end_date?: string | null; subjects?: string[] | string; rules?: unknown; status?: string }
export function cleanExamSession(raw: ExamSessionInput) {
  const year = s(raw.academic_year, 9); if (!/^\d{4}-\d{2,4}$/.test(year)) throw err('Academic year looks like 2026-27.');
  const cls = s(raw.class_level, 10); if (!cls) throw err('Class is required.');
  const label = s(raw.session_label, 80); if (!label) throw err('Session name is required.');
  const start = ymd(raw.start_date), end = ymd(raw.end_date);
  if (raw.start_date && !start) throw err('Start date must look like 2027-02-15.'); if (raw.end_date && !end) throw err('End date must look like 2027-03-20.');
  if (start && end && end < start) throw err('The end date is before the start date.');
  const subjects = (Array.isArray(raw.subjects) ? raw.subjects : String(raw.subjects ?? '').split(',')).map((x) => s(x, 60)).filter(Boolean).slice(0, 40);
  let rules: Record<string, unknown> = {}; if (raw.rules && typeof raw.rules === 'object') rules = raw.rules as Record<string, unknown>; else if (typeof raw.rules === 'string' && raw.rules.trim()) { try { const j = JSON.parse(raw.rules); if (j && typeof j === 'object' && !Array.isArray(j)) rules = j; else throw 0; } catch { throw err('Rules must be valid JSON, for example {"duration_minutes": 180}.'); } }
  const status = (EXAM_STATUSES as readonly string[]).includes(String(raw.status)) ? String(raw.status) : 'draft';
  return { board: s(raw.board || 'CBSE', 40), academic_year: year, class_level: cls, exam_type: s(raw.exam_type || 'board', 40), session_label: label, start_date: start, end_date: end, subjects, rules, status };
}
export async function saveExamSession(service: SupabaseClient, raw: ExamSessionInput): Promise<string> {
  const row = cleanExamSession(raw);
  if (raw.id) { const { error } = await service.from('exam_sessions').update({ ...row, updated_at: new Date().toISOString() }).eq('id', raw.id); if (error) throw err('Could not save.'); return raw.id; }
  const { data, error } = await service.from('exam_sessions').insert(row).select('id').single(); if (error || !data) throw err('Could not save.'); return data.id;
}
export async function deleteExamSession(service: SupabaseClient, id: string): Promise<void> { const { error } = await service.from('exam_sessions').delete().eq('id', id); if (error) throw err('Could not delete.'); }
export async function listExamSessions(service: SupabaseClient) { const { data } = await service.from('exam_sessions').select('*').order('academic_year', { ascending: false }).order('start_date', { ascending: true }).limit(500); return (data ?? []) as any[]; }

// ---- curriculum versions ---------------------------------------------------------------------------------------------
export const CURRICULUM_STATUSES = ['draft', 'uploaded', 'processing', 'needs_review', 'approved', 'published', 'superseded', 'failed', 'retired'] as const;
/** A version can only move forward one step at a time (or be retired); nothing becomes published without being approved first. */
export const CURRICULUM_NEXT: Record<string, string[]> = { draft: ['needs_review', 'retired'], uploaded: ['processing', 'needs_review', 'failed', 'retired'], processing: ['needs_review', 'failed'], failed: ['uploaded', 'needs_review', 'retired'], needs_review: ['approved', 'draft', 'retired'], approved: ['published', 'needs_review', 'retired'], published: ['superseded', 'retired'], superseded: ['published', 'retired'], retired: ['draft'] };
export function canMoveCurriculum(from: string, to: string): boolean { return (CURRICULUM_NEXT[from] ?? []).includes(to); }
export interface CurriculumVersionInput { board?: string; academic_year: string; class_level: string; subject_id?: string | null; subject_label?: string; language?: string; source_reference?: string; notes?: string }
export async function createCurriculumVersion(service: SupabaseClient, raw: CurriculumVersionInput): Promise<string> {
  const year = s(raw.academic_year, 9); if (!/^\d{4}-\d{2,4}$/.test(year)) throw err('Academic year looks like 2026-27.');
  const cls = s(raw.class_level, 10); if (!cls) throw err('Class is required.');
  const board = s(raw.board || 'CBSE', 40), language = s(raw.language || 'en', 10), label = s(raw.subject_label, 80);
  if (!raw.subject_id && !label) throw err('Choose or type a subject.');
  let q = service.from('curriculum_versions').select('version').eq('board', board).eq('academic_year', year).eq('class_level', cls).eq('language', language);
  q = raw.subject_id ? q.eq('subject_id', raw.subject_id) : q.eq('subject_label', label);
  const { data: ex } = await q.order('version', { ascending: false }).limit(1);
  const version = ((ex?.[0] as any)?.version ?? 0) + 1;
  const { data, error } = await service.from('curriculum_versions').insert({ board, academic_year: year, class_level: cls, subject_id: raw.subject_id || null, subject_label: label || null, language, version, source_reference: s(raw.source_reference, 300) || null, notes: s(raw.notes, 500) || null }).select('id').single();
  if (error || !data) throw err('Could not save.'); return data.id;
}
export async function moveCurriculumVersion(service: SupabaseClient, id: string, to: string, adminEmail: string): Promise<void> {
  const { data: cur } = await service.from('curriculum_versions').select('status, source_reference').eq('id', id).maybeSingle();
  if (!cur) throw err('Version not found.');
  if (!canMoveCurriculum(cur.status, to)) throw err(`A version that is "${cur.status}" cannot go straight to "${to}".`);
  if (to === 'approved' && !cur.source_reference) throw err('Enter the source (the official syllabus reference) before approving.');
  const patch: Record<string, unknown> = { status: to, updated_at: new Date().toISOString() };
  if (to === 'approved') { patch.approved_by = adminEmail; patch.approved_at = new Date().toISOString(); }
  if (to === 'published') { patch.published_at = new Date().toISOString(); patch.published_by = adminEmail; await supersedeSiblings(service, id); }
  const { error } = await service.from('curriculum_versions').update(patch).eq('id', id); if (error) throw err('Could not save.');
}
/** v81: publishing a version retires the one it replaces (status "superseded", kept for rollback); nothing is deleted or overwritten. Returns the ids superseded. */
export async function supersedeSiblings(service: SupabaseClient, id: string): Promise<string[]> {
  const { data: v } = await service.from('curriculum_versions').select('board, academic_year, class_level, subject_id, subject_label, language').eq('id', id).maybeSingle();
  if (!v) return [];
  let q = service.from('curriculum_versions').select('id').eq('board', (v as any).board).eq('academic_year', (v as any).academic_year).eq('class_level', (v as any).class_level).eq('language', (v as any).language).eq('status', 'published').neq('id', id);
  q = (v as any).subject_id ? q.eq('subject_id', (v as any).subject_id) : q.eq('subject_label', (v as any).subject_label);
  const { data } = await q; const ids = ((data ?? []) as any[]).map((r) => r.id as string);
  if (ids.length) await service.from('curriculum_versions').update({ status: 'superseded', updated_at: new Date().toISOString() }).in('id', ids);
  return ids;
}
export async function listCurriculumVersions(service: SupabaseClient) { const { data } = await service.from('curriculum_versions').select('*').order('academic_year', { ascending: false }).order('created_at', { ascending: false }).limit(500); return (data ?? []) as any[]; }

// ---- country prices -------------------------------------------------------------------------------------------------
export interface CountryPriceInput { country: string; currency: string; product_code: string; price: number | string; tax_pct?: number | string; payment_method?: string; tier?: string; promotion?: string; active?: boolean; note?: string }
export function cleanCountryPrice(raw: CountryPriceInput) {
  const country = s(raw.country, 60); const currency = s(raw.currency, 3).toUpperCase(); const product = s(raw.product_code, 60);
  if (!country) throw err('Country is required.'); if (!/^[A-Z]{3}$/.test(currency)) throw err('Currency is a 3-letter code such as USD or AED.'); if (!product) throw err('Plan is required.');
  const price = Number(raw.price); if (!Number.isFinite(price) || price < 0) throw err('Price must be a number, zero or more.');
  const tax = Number(raw.tax_pct ?? 0); if (!Number.isFinite(tax) || tax < 0 || tax > 60) throw err('Tax must be between 0 and 60.');
  return { country, currency, product_code: product, price: Math.round(price * 100) / 100, tax_pct: tax, payment_method: s(raw.payment_method, 60) || null, tier: s(raw.tier, 40) || null, promotion: s(raw.promotion, 100) || null, active: raw.active === true, note: s(raw.note, 300) || null };
}
export async function saveCountryPrice(service: SupabaseClient, raw: CountryPriceInput): Promise<void> {
  const row = cleanCountryPrice(raw);
  const { error } = await service.from('country_prices').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'country,product_code' }); if (error) throw err('Could not save.');
}
export async function deleteCountryPrice(service: SupabaseClient, id: string): Promise<void> { const { error } = await service.from('country_prices').delete().eq('id', id); if (error) throw err('Could not delete.'); }
export async function listCountryPrices(service: SupabaseClient) { const { data } = await service.from('country_prices').select('*').order('country').order('product_code').limit(1000); return (data ?? []) as any[]; }
/** The active price for a country and plan, or null (then the rupee price applies). Price shown with tax added when tax is set. */
export async function priceForCountry(service: SupabaseClient, country: string, productCode: string): Promise<{ currency: string; price: number; tax_pct: number; total: number } | null> {
  const { data } = await service.from('country_prices').select('currency, price, tax_pct, active').eq('country', country).eq('product_code', productCode).maybeSingle();
  if (!data || !data.active) return null;
  const price = Number(data.price), tax = Number(data.tax_pct);
  return { currency: data.currency, price, tax_pct: tax, total: Math.round(price * (1 + tax / 100) * 100) / 100 };
}

// ---- student / family region ---------------------------------------------------------------------------------------
/** Common countries for Indian families abroad, with the usual currency. A person can type any other country; the currency is then left for the founder. */
export const COUNTRY_CURRENCY: Record<string, string> = { India: 'INR', 'United Arab Emirates': 'AED', 'Saudi Arabia': 'SAR', Qatar: 'QAR', Oman: 'OMR', Bahrain: 'BHD', Kuwait: 'KWD', Singapore: 'SGD', 'United States': 'USD', 'United Kingdom': 'GBP', Canada: 'CAD', Australia: 'AUD', Nepal: 'NPR' };
export function cleanRegion(raw: any): { country: string | null; timezone: string | null; currency: string | null } {
  const country = s(raw?.country, 60) || null;
  const tz = s(raw?.timezone, 60) || null;
  if (tz && !/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+){0,2}$/.test(tz)) throw new Error('bad_region');
  if (country && /[<>{}]/.test(country)) throw new Error('bad_region');
  const given = s(raw?.currency, 3).toUpperCase();
  const currency = /^[A-Z]{3}$/.test(given) ? given : (country ? COUNTRY_CURRENCY[country] ?? null : null);
  return { country, timezone: tz, currency };
}
