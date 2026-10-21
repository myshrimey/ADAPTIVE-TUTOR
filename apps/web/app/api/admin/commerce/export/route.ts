import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';

// Admin-only CSV download of commercial tables.
const TABLES: Record<string, { table: string; cols: string }> = {
  payments: { table: 'pilot_payments', cols: 'created_at,payment_date,offer_label,product_code,amount,list_amount,discount_amount,offer_code,quantity,status,transaction_reference,payment_method,activated_at,activated_by' },
  interest: { table: 'commerce_interest', cols: 'created_at,kind,name,organisation,contact,detail,students,interest_level,status,admin_notes' },
  wtp: { table: 'wtp_responses', cols: 'created_at,user_type,feature,price_inr,answer' },
  events: { table: 'commerce_events', cols: 'created_at,event,product_code,amount' },
  credits: { table: 'mock_credit_ledger', cols: 'created_at,delta,reason,ref' },
};
const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : /^[=+@-]/.test(s) ? `'${s}` : s; };

export async function GET(request: Request) {
  try { await requireAdmin(); } catch { return new Response('Not allowed', { status: 403 }); }
  const t = TABLES[new URL(request.url).searchParams.get('table') ?? ''];
  if (!t) return new Response('Unknown table', { status: 400 });
  const { data, error } = await createServiceClient().from(t.table).select(t.cols).order('created_at', { ascending: false }).limit(20000);
  if (error) return new Response('Export failed', { status: 500 });
  const cols = t.cols.split(',');
  const csv = [cols.join(','), ...(data ?? []).map((r: any) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="sahayak-${t.table}.csv"` } });
}
