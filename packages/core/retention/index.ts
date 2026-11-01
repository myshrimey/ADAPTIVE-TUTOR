import type { SupabaseClient } from '@supabase/supabase-js';

// v94: INTERIM retention periods (Decision D3, decided on the founder's instruction 2026-11-01). They are Claude's proposal and are
// NOT legal advice: the founder still needs a lawyer who knows India's Digital Personal Data Protection Act 2023 (TASK-040 / D7).
// This module is a DRY RUN: it counts rows older than each period. It never deletes anything, here or automatically.
export interface RetentionRule { table: string; column: string; label: string; days: number; kind: 'audit' | 'activity' | 'usage'; note: string }
export const RETENTION_RULES: readonly RetentionRule[] = [
  { table: 'audit_logs', column: 'at', label: 'Admin audit trail', days: 1095, kind: 'audit', note: 'About 3 years. Append-only: only the database owner can purge, with the script in scripts/retention/.' },
  { table: 'page_views', column: 'at', label: 'Website visits (anonymous)', days: 395, kind: 'activity', note: 'About 13 months. No names, no IP addresses.' },
  { table: 'ai_usage', column: 'created_at', label: 'AI call log (no text)', days: 395, kind: 'usage', note: 'About 13 months. Keep longer only if the accountant needs cost history.' },
  { table: 'signup_log', column: 'created_at', label: 'Sign-up log', days: 395, kind: 'activity', note: 'About 13 months.' },
  { table: 'engagement_events', column: 'created_at', label: 'Engagement events', days: 395, kind: 'activity', note: 'About 13 months.' },
  { table: 'account_devices', column: 'last_seen', label: 'Registered devices (not seen since)', days: 395, kind: 'activity', note: 'About 13 months since last use. Removing a row only frees a device slot.' },
  { table: 'acquisition_touches', column: 'at', label: 'Tracked-link arrivals', days: 395, kind: 'activity', note: 'About 13 months.' },
];
/** Kept OUT of any automatic or suggested clean-up, with the reason. Changing this list needs the founder and a professional. */
export const RETENTION_EXCLUDED: readonly { what: string; why: string }[] = [
  { what: 'Learning events, answers, mastery, reports, handwritten answers', why: 'This is the child\'s educational record. It is deleted only through the family\'s own deletion request (/admin/data-requests).' },
  { what: 'Payments, invoices, commerce events', why: 'Accounting and tax records. The founder must agree a rule with an accountant or lawyer first.' },
  { what: 'Consent records (users.consent_at, handwriting consent versions)', why: 'Proof of consent must outlive the data it covers.' },
];
export const cutoffFor = (days: number, now: Date): string => new Date(now.getTime() - days * 86400000).toISOString();

export interface RetentionRow extends RetentionRule { cutoff: string; total: number | null; older: number | null }
const count = async (make: () => any): Promise<number | null> => { try { const r = await make(); return r?.error ? null : (typeof r?.count === 'number' ? r.count : null); } catch { return null; } };
/** Counts only. Nothing is changed. A count that cannot be read is null (shown as "Not available"), never 0. */
export async function loadRetentionReport(service: SupabaseClient, now = new Date()): Promise<RetentionRow[]> {
  const out: RetentionRow[] = [];
  for (const r of RETENTION_RULES) {
    const cutoff = cutoffFor(r.days, now);
    const total = await count(() => service.from(r.table).select(r.column, { count: 'exact', head: true }));
    const older = await count(() => service.from(r.table).select(r.column, { count: 'exact', head: true }).lt(r.column, cutoff));
    out.push({ ...r, cutoff, total, older });
  }
  return out;
}
