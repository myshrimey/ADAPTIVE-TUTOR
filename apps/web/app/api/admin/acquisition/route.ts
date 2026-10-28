import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase-server';
import { createPartner, updatePartner, recordOfflineSale, tagSale, saveCampaignWithExtras, tagExpense, saveExperiment, saveAcqSettings, backfillAttribution } from '@adaptive-tutor/core';

// ADMIN ONLY. Every action starts with requireAdmin(); a signed-out or ordinary user gets 403 and nothing is read or written.
// Input is validated inside the core functions. Errors are friendly sentences, never database text.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(); const actor = (admin as any)?.email ?? 'admin';
    const b = await request.json().catch(() => ({})); const service = createServiceClient();
    switch (b.action) {
      case 'partner_create': return ok({ code: await createPartner(service, { kind: b.kind, name: b.name, notes: b.notes, status: b.status }) });
      case 'partner_update': await updatePartner(service, String(b.code ?? ''), { status: b.status, rewardStatus: b.rewardStatus, rewardNote: b.rewardNote, notes: b.notes }); return ok({});
      case 'sale': return ok(await recordOfflineSale(service, { ...b, amount: Number(b.amount) }, actor));
      case 'tag_sale': await tagSale(service, b, actor); return ok({});
      case 'campaign': return ok({ id: await saveCampaignWithExtras(service, actor, b) });
      case 'spend': await tagExpense(service, { ...b, amount: Number(b.amount) }, actor); return ok({});
      case 'experiment': return ok({ id: await saveExperiment(service, b) });
      case 'settings': return ok({ settings: await saveAcqSettings(service, b.settings) });
      case 'backfill': return ok({ saved: await backfillAttribution(service) });
      default: return NextResponse.json({ data: null, error: 'Unknown action.' }, { status: 400 });
    }
  } catch (err: any) {
    if (err?.message === 'not_authorized') return NextResponse.json({ data: null, error: 'Not authorized' }, { status: 403 });
    const msg = String(err?.message ?? '');
    return NextResponse.json({ data: null, error: /^(Could not|Give|Enter|Tag|Choose|That|No account|The end|Unknown)/.test(msg) ? msg : 'Could not save. Please try again.' }, { status: 400 });
  }
}
const ok = (data: unknown) => NextResponse.json({ data, error: null });
