import type { SupabaseClient } from '@supabase/supabase-js';

// v95: "did my deployment take?" Read only. Probes ask the database whether a table or column exists (a SELECT of zero rows).
// Nothing is changed, no value of any setting is ever read out: environment settings are reported as present / missing only.
export const APP_VERSION = 'v108';
/** The newest version that changed the database (it writes a system_changelog row). Versions after it need no migration. Test t95 checks this against the migration files. */
export const DB_VERSION_EXPECTED = 'v106';
export interface DeployProbe { migration: string; version: string; what: string; table: string; column?: string }
export const DEPLOY_PROBES: readonly DeployProbe[] = [
  { migration: '0046', version: 'v72', what: 'Social growth tables', table: 'social_campaigns' },
  { migration: '0047', version: 'v73', what: 'Feedback extras (kind column)', table: 'feedback', column: 'kind' },
  { migration: '0048', version: 'v76', what: 'Acquisition tracking', table: 'acquisition_touches' },
  { migration: '0049', version: 'v79', what: 'Invitations and admin team', table: 'admin_team' },
  { migration: '0050', version: 'v80', what: 'Teacher assignments', table: 'teacher_assignments' },
  { migration: '0051', version: 'v81', what: 'Curriculum management', table: 'curriculum_documents' },
  { migration: '0052', version: 'v82', what: 'Curriculum version stamps on baselines', table: 'baseline_sessions', column: 'curriculum_version_id' },
  { migration: '0053', version: 'v85', what: 'Confidence calibration', table: 'calibration_events' },
  { migration: '0056', version: 'v90', what: 'Development control centre tables', table: 'control_prompts' },
  { migration: '0057', version: 'v91', what: 'Audit trail: account, reason, outcome columns', table: 'audit_logs', column: 'target_account' },
  { migration: '0058', version: 'v96', what: 'Sign-in limit: failed-attempt hashes', table: 'login_attempts', column: 'key_hash' },
  { migration: '0059', version: 'v100', what: 'Recorded test results', table: 'qa_results', column: 'item_id' },
  { migration: '0061', version: 'v106', what: 'Pictures attached to feedback: file locations', table: 'feedback_attachments', column: 'feedback_id' },
  { migration: '0060', version: 'v103', what: 'Request limit on the free check: address hashes', table: 'public_check_log', column: 'ip_hash' },
];
/** Things the website cannot see. The founder pastes these READ-ONLY queries into the Supabase SQL editor. */
export const MANUAL_CHECKS: readonly { migration: string; what: string; sql: string; expect: string }[] = [
  { migration: '0055', what: 'Role-guard function has a fixed search path', sql: "select proconfig from pg_proc where proname = 'guard_user_role';", expect: 'one row containing search_path=public, pg_temp' },
  { migration: '0057', what: 'Audit log blocks edits, deletes and truncation', sql: "select tgname from pg_trigger where tgrelid = 'public.audit_logs'::regclass and not tgisinternal;", expect: 'two rows: trg_audit_logs_no_truncate and trg_audit_logs_no_update_delete' },
  { migration: 'all', what: 'Every table has row-level security on', sql: "select count(*) as tables_without_rls from pg_tables where schemaname = 'public' and not rowsecurity;", expect: '0' },
];
export const ENV_CHECKS: readonly { name: string; why: string; required: boolean }[] = [
  { name: 'ADMIN_EMAILS', why: 'Who is the Super Admin. Without it nobody can open /admin.', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', why: 'Database address used by the website.', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', why: 'Restricted browser key.', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', why: 'Server-only key for admin work. Must never be in a NEXT_PUBLIC variable.', required: true },
  { name: 'INVITE_SECRET', why: 'Signs invitation links (falls back to the service key if missing).', required: false },
];
export type ProbeResult = 'applied' | 'not_applied' | 'unknown';
/** A missing table or column is "not applied"; any other failure (network, permission) is "unknown", never a false "applied". */
export function classifyProbe(error: { code?: string; message?: string } | null | undefined): ProbeResult {
  if (!error) return 'applied';
  const m = `${error.code ?? ''} ${error.message ?? ''}`;
  if (/42P01|42703|PGRST205|PGRST204|does not exist|Could not find the/i.test(m)) return 'not_applied';
  return 'unknown';
}
export interface ProbeRow extends DeployProbe { result: ProbeResult }
export async function runProbes(service: SupabaseClient): Promise<ProbeRow[]> {
  const out: ProbeRow[] = [];
  for (const p of DEPLOY_PROBES) {
    let result: ProbeResult = 'unknown';
    try { const r: any = await service.from(p.table).select(p.column ?? '*').limit(0); result = classifyProbe(r?.error); } catch { result = 'unknown'; }
    out.push({ ...p, result });
  }
  return out;
}
/** present / missing only. The value is never returned. */
export function envReport(env: Record<string, string | undefined>): { name: string; why: string; required: boolean; present: boolean }[] {
  return ENV_CHECKS.map((e) => ({ ...e, present: !!(env[e.name] && String(env[e.name]).trim()) }));
}
/** The newest version the database says it knows (from system_changelog), or null. */
export async function latestChangelogVersion(service: SupabaseClient): Promise<string | null> {
  try {
    const r: any = await service.from('system_changelog').select('version, changed_on').order('changed_on', { ascending: false }).limit(200);
    const nums = ((r?.data ?? []) as any[]).map((x) => String(x.version ?? '')).filter((v) => /^v\d+/.test(v)).sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)));
    return nums[0] ?? null;
  } catch { return null; }
}
