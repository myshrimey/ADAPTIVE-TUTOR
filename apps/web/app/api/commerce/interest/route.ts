import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { recordCommerceEvent } from '@adaptive-tutor/core';

// Tutor / coaching-centre applications, "Founding Partner" interest and subject requests. Stored for the founder to follow up
// personally. This is NOT a purchase and NOT an investment. Limited to 5 per address per hour; hidden "website" field catches bots.
const KINDS = ['tutor', 'centre', 'partner', 'subject_request', 'other'];
export async function POST(request: Request) {
  try {
    const b = await request.json().catch(() => ({}));
    if (b.website) return NextResponse.json({ data: { ok: true }, error: null });
    if (!KINDS.includes(b.kind)) return NextResponse.json({ data: null, error: 'bad_kind' }, { status: 400 });
    const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n) || null;
    const contact = clip(b.contact, 120), name = clip(b.name, 120), detail = clip(b.detail, 800);
    if (b.kind !== 'subject_request' && (!name || !contact)) return NextResponse.json({ data: null, error: 'name_and_contact_needed' }, { status: 400 });
    if (b.kind === 'subject_request' && !detail) return NextResponse.json({ data: null, error: 'say_which_subject' }, { status: 400 });
    const service = createServiceClient();
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ipHash = createHash('sha256').update('sahayak-interest:' + ip).digest('hex');
    const { count } = await service.from('commerce_interest').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 5) return NextResponse.json({ data: null, error: 'too_many_attempts' }, { status: 429 });
    const { data: { user } } = await (await createServerClient()).auth.getUser();
    await service.from('commerce_interest').insert({ kind: b.kind, name, organisation: clip(b.organisation, 160), contact, detail, students: Number.isFinite(Number(b.students)) ? Math.min(100000, Math.max(0, Math.floor(Number(b.students)))) : null, interest_level: clip(b.interestLevel, 40), user_id: user?.id ?? null, ip_hash: ipHash });
    if (b.kind === 'tutor' || b.kind === 'centre') await recordCommerceEvent(service, b.kind === 'tutor' ? 'tutor_interest' : 'centre_interest', { userId: user?.id ?? null });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch { return NextResponse.json({ data: null, error: 'failed' }, { status: 400 }); }
}
