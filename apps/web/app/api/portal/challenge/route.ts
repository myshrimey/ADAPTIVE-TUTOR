import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getPortalUser } from '@/lib/portal';
import { createOrgChallenge } from '@adaptive-tutor/core';

export const runtime = 'nodejs';
// A tutor or centre sets a challenge for the students linked to them. The owner is the signed-in, approved adult only.
export async function POST(req: Request) {
  try {
    const me = await getPortalUser();
    if (!me || (me.role !== 'tutor' && me.role !== 'centre') || me.status !== 'active') throw new Error('Only approved tutors and centres can set challenges.');
    const b = await req.json().catch(() => ({})); const s = createServiceClient();
    if (b.action === 'close') { const { error } = await s.from('org_challenges').update({ active: false }).eq('id', String(b.id)).eq('owner_user_id', me.userId); if (error) throw new Error('Could not close.'); return NextResponse.json({ data: { ok: true }, error: null }); }
    return NextResponse.json({ data: { id: await createOrgChallenge(s, me.userId, b) }, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: String(err?.message ?? 'failed').slice(0, 140) }, { status: 400 }); }
}
