import { requireAdmin } from '@/lib/admin';
import { makeExportMeta, metaText, safeFileName } from '@adaptive-tutor/core';
import { fileResponse } from '@/lib/export';

// Companion note for a raw CSV (title, website, date, export ID, privacy level). Admin only; contains no data from the export itself.
export async function GET(request: Request) {
  try { await requireAdmin(); } catch { return new Response('Not allowed', { status: 403 }); }
  const u = new URL(request.url); const kind = (u.searchParams.get('kind') ?? 'export').slice(0, 40); const cls = u.searchParams.get('class') === 'confidential' ? 'confidential' : 'internal';
  const meta = makeExportMeta({ title: `Notes for the ${kind} export`, kind, classification: cls });
  return fileResponse(metaText(meta, safeFileName(kind, 'csv')), { kind: `${kind}-notes`, ext: 'txt', contentType: 'text/plain; charset=utf-8', title: meta.title, classification: cls });
}
