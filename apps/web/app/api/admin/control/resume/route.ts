import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { getControl } from '@/lib/control';
import { resumeText, writeAudit } from '@adaptive-tutor/core';

// SUPER ADMIN ONLY (no permission passed). Plain-text session resume built from the registry. No personal data.
export const runtime = 'nodejs';
export async function GET() {
  let admin; try { admin = await requireAdmin(); } catch { return new Response('Not allowed', { status: 403 }); }
  const { reg } = await getControl();
  await writeAudit(createServiceClient(), { actorEmail: admin.email, actorRole: 'super_admin', action: 'export.download', entity: 'session_resume', outcome: 'success' });
  return new Response(resumeText(reg, new Date().toISOString().slice(0, 10)), { headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': 'attachment; filename="SESSION_RESUME.txt"', 'cache-control': 'no-store' } });
}
