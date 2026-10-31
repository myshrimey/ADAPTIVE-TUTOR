import { csvResponse, fileResponse } from '@/lib/export';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { toCsv } from '@adaptive-tutor/core';

// CSV downloads for the founder. Admin only. No child names, answers or learning records are included in any of them.
const SETS: Record<string, { table: string; cols: string[]; order?: string }> = {
  crm: { table: 'crm_records', cols: ['kind', 'name', 'organisation', 'phone', 'email', 'city', 'state', 'board', 'class_level', 'subjects', 'source', 'stage', 'status', 'first_contact', 'last_contact', 'next_followup', 'plan_discussed', 'price_discussed', 'amount_paid', 'potential_value', 'probability', 'owner', 'tags', 'notes'], order: 'created_at' },
  funding: { table: 'funding_records', cols: ['kind', 'subtype', 'name', 'organisation', 'website', 'location', 'country', 'stage', 'priority', 'cheque_min', 'cheque_max', 'amount_requested', 'amount_offered', 'amount_received', 'next_action', 'next_followup', 'deadline', 'eligibility_status', 'source', 'last_verified', 'confidence', 'notes'], order: 'created_at' },
  expenses: { table: 'expenses', cols: ['spent_on', 'category', 'description', 'vendor', 'amount_inr', 'recurring', 'created_by'], order: 'spent_on' },
  revenue: { table: 'revenue_entries', cols: ['received_on', 'customer_kind', 'customer_name', 'product', 'amount_inr', 'method', 'reference', 'verified_by', 'notes'], order: 'received_on' },
  payments: { table: 'pilot_payments', cols: ['created_at', 'product_code', 'amount', 'list_amount', 'discount_amount', 'offer_code', 'quantity', 'status', 'payment_method', 'transaction_reference', 'confirmed_at', 'activated_by', 'payment_date'], order: 'created_at' },
  tasks: { table: 'founder_tasks', cols: ['title', 'area', 'priority', 'due', 'status', 'notes', 'created_at', 'done_at'], order: 'created_at' },
  documents: { table: 'funding_documents', cols: ['label', 'status', 'notes', 'updated_at'], order: 'sort' },
  changelog: { table: 'system_changelog', cols: ['changed_on', 'version', 'change', 'reason', 'files', 'database_changes', 'pricing_changes', 'ai_model_changes', 'deployment'], order: 'changed_on' },
};
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const name = new URL(request.url).searchParams.get('table') ?? '';
    const def = SETS[name];
    if (!def) return NextResponse.json({ error: 'unknown_table' }, { status: 400 });
    const { data } = await createServiceClient().from(def.table).select(def.cols.join(',')).order(def.order ?? 'created_at').limit(50000);
    const csv = toCsv(def.cols, ((data ?? []) as any[]).map((r) => def.cols.map((c) => r[c] ?? '')));
    return csvResponse(csv, { kind: String(name), title: `Founder export: ${name}`, classification: 'confidential', filename: `sahayak-${name}.csv`, bom: true });
  } catch { return NextResponse.json({ error: 'not_authorized' }, { status: 403 }); }
}
