// v64: database layer for website traffic. Server-only (service client). The browser never reads page_views.
import type { SupabaseClient } from '@supabase/supabase-js';
import { rangeDays, istDayOf, summariseTraffic, realtimeVisitors, type ViewRow, type TrafficSummary } from './traffic';

export const RETENTION_DAYS = 400;
export type ViewInput = { visitor: string; path: string; channel: string; source: string | null; campaign: string | null; device: string; browser: string; os: string; country: string | null; region: string | null; signed_in: boolean };
/** Never throws. On failure returns the database's own message so the admin check page (and the server log) can show the real cause. */
export async function recordView(service: SupabaseClient, row: ViewInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service.from('page_views').insert(row);
    return error ? { ok: false, error: String(error.message ?? error) } : { ok: true };
  } catch (e: any) { return { ok: false, error: String(e?.message ?? e) }; }
}
let LAST_LOAD_ERROR: string | null = null;
async function load(service: SupabaseClient, fromDay: string, toDay: string): Promise<ViewRow[]> {
  const startUtc = new Date(Date.parse(fromDay + 'T00:00:00Z') - 5.5 * 3600 * 1000).toISOString();
  const endUtc = new Date(Date.parse(toDay + 'T00:00:00Z') + 86400000 - 5.5 * 3600 * 1000).toISOString();
  const out: ViewRow[] = [];
  for (let off = 0; off < 200000; off += 1000) {
    const { data, error } = await service.from('page_views').select('at, visitor, path, channel, source, device, browser, os, country, signed_in').gte('at', startUtc).lt('at', endUtc).order('at', { ascending: true }).range(off, off + 999);
    if (error) { LAST_LOAD_ERROR = String(error.message ?? error); break; }
    const rows = (data ?? []) as any[]; out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
export interface TrafficReport { loadError: string | null; summary: TrafficSummary; realtime: number; from: string; to: string; range: string; truncated: boolean; signups: number | null; diagnostics: number | null }
export async function trafficReport(service: SupabaseClient, range: string, now: Date = new Date()): Promise<TrafficReport> {
  const r = rangeDays(range, istDayOf(now));
  LAST_LOAD_ERROR = null;
  const [rows, prev] = await Promise.all([load(service, r.from, r.to), load(service, r.prevFrom, r.prevTo)]);
  const summary = summariseTraffic(rows, r.from, r.to, prev);
  const startUtc = new Date(Date.parse(r.from + 'T00:00:00Z') - 5.5 * 3600 * 1000).toISOString();
  let signups: number | null = null, diagnostics: number | null = null;
  try { const a = await service.from('users').select('id', { count: 'exact', head: true }).gte('created_at', startUtc); signups = a.count ?? null; } catch { /* optional */ }
  try { const b = await service.from('diagnostic_attempts').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', startUtc); diagnostics = b.count ?? null; } catch { /* optional */ }
  return { loadError: LAST_LOAD_ERROR, summary, realtime: realtimeVisitors(rows, now), from: r.from, to: r.to, range, truncated: rows.length >= 200000, signups, diagnostics };
}
/** Housekeeping: rows older than the retention window are deleted by the admin button / a later scheduled job. */
export async function purgeOldViews(service: SupabaseClient, now: Date = new Date()): Promise<void> {
  await service.from('page_views').delete().lt('at', new Date(now.getTime() - RETENTION_DAYS * 86400000).toISOString());
}

/** Admin self-check: can the server write and read page_views? Writes one test row, reads it back, removes it. */
export async function counterSelfCheck(service: SupabaseClient): Promise<{ tableReadable: boolean; canWrite: boolean; totalRows: number | null; newest: string | null; error: string | null }> {
  let error: string | null = null; let totalRows: number | null = null; let newest: string | null = null; let canWrite = false; let tableReadable = false;
  const c = await service.from('page_views').select('id', { count: 'exact', head: true });
  if (c.error) error = 'Reading page_views failed: ' + String(c.error.message ?? c.error); else { tableReadable = true; totalRows = c.count ?? 0; }
  if (tableReadable) {
    const n = await service.from('page_views').select('at').order('at', { ascending: false }).limit(1);
    newest = ((n.data ?? []) as any[])[0]?.at ?? null;
  }
  const w = await recordView(service, { visitor: 'selfcheck', path: '/selfcheck', channel: 'Direct', source: 'direct', campaign: null, device: 'desktop', browser: 'selfcheck', os: 'selfcheck', country: null, region: null, signed_in: false });
  if (!w.ok) error = (error ? error + ' | ' : '') + 'Writing page_views failed: ' + (w.error ?? 'unknown');
  else { canWrite = true; await service.from('page_views').delete().eq('visitor', 'selfcheck'); }
  return { tableReadable, canWrite, totalRows, newest, error };
}
