import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { parseQaResult, saveQaResult, writeAudit } from '@adaptive-tutor/core';

// SUPER ADMIN ONLY (no permission passed). Records ONE manual test result (worked / did not work / could not try) for a checklist item.
// It never changes a requirement's status or an acceptance. The note is refused if it holds an email or phone number.
export const runtime = 'nodejs';
const out = (error: string | null, data: any = null, status = 200) => NextResponse.json({ data, error }, { status });
export async function POST(request: Request) {
  let admin; try { admin = await requireAdmin(); } catch { return out('not_authorized', null, 403); }
  const parsed = parseQaResult(await request.json().catch(() => ({})));
  if (!parsed.ok) return out(parsed.error, null, 400);
  const service = createServiceClient();
  const r = await saveQaResult(service, parsed.value, admin.email);
  await writeAudit(service, { actorEmail: admin.email, actorRole: 'super_admin', action: 'qa.record', entity: 'qa_result', entityId: parsed.value.itemId, outcome: r.ok ? 'success' : 'failed', reason: parsed.value.result });
  return r.ok ? out(null, { message: 'Saved.' }) : out(r.error ?? 'save_failed', null, r.error === 'tables_missing' ? 409 : 500);
}
