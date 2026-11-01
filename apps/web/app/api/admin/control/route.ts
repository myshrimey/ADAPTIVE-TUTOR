import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { importRegistry, parseControlAction, setAcceptance, setNextTask, setPromptPriority } from '@adaptive-tutor/core';
import { REGISTRY } from '@adaptive-tutor/core/control-centre/registry-data';

// SUPER ADMIN ONLY (no permission is passed, so only ADMIN_EMAILS may use it). Every action only records the founder's choice or loads the documents' copy:
// nothing here starts any work, changes a requirement's technical status, or touches student data.
export const runtime = 'nodejs';
const out = (error: string | null, data: any = null, status = 200) => NextResponse.json({ data, error }, { status });
export async function POST(request: Request) {
  let admin; try { admin = await requireAdmin(); } catch { return out('not_authorized', null, 403); }
  const parsed = parseControlAction(await request.json().catch(() => ({})));
  if (!parsed.ok) return out(parsed.error, null, 400);
  const a = parsed.value; const s = createServiceClient();
  const r = a.action === 'import' ? await importRegistry(s, REGISTRY, admin.email)
    : a.action === 'next' ? await setNextTask(s, a.taskId, admin.email)
    : a.action === 'priority' ? await setPromptPriority(s, a.promptId, a.priority, admin.email)
    : await setAcceptance(s, a.promptId, a.code, a.value, admin.email);
  return r.ok ? out(null, { message: a.action === 'import' ? 'Loaded.' : 'Saved.', ...(a.action === 'import' ? { counts: (r as any).counts } : {}) }) : out(r.error ?? 'failed', null, r.error === 'not_found' ? 404 : 400);
}
