import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { createPurchaseRequest } from '@adaptive-tutor/core';
import { getPortalUser, isLinked } from '@/lib/portal';

// A signed-in student (or the family using the student's account) submits a purchase request after paying by UPI/QR.
// The amount is recomputed here; the browser's number is ignored. Nothing is activated until an admin verifies the payment.
export async function POST(request: Request) {
  try {
    const b = await request.json().catch(() => ({}));
    // A parent can pay for a child who is ACTIVELY linked to them (checked on the server); otherwise the signed-in student pays.
    let studentId: string; let paidBy: string | null = null;
    if (b.childId) {
      const me = await getPortalUser();
      if (!me || me.role !== 'parent') throw new Error('unauthenticated');
      const cid = String(b.childId);
      if (!(await isLinked(me, cid))) throw new Error('child_not_linked');
      studentId = cid; paidBy = me.userId;
    } else studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const out = await createPurchaseRequest(createServiceClient(), {
      studentId, userId: user?.id ?? null, productCode: String(b.productCode ?? ''),
      subjectSlugs: Array.isArray(b.subjectSlugs) ? b.subjectSlugs.map(String).slice(0, 10) : [],
      coupon: typeof b.coupon === 'string' ? b.coupon.slice(0, 40) : null, quantity: Number(b.quantity) || 1,
      paymentDate: String(b.paymentDate ?? ''), reference: typeof b.reference === 'string' ? b.reference : null, paidByUserId: paidBy,
    });
    return NextResponse.json({ data: { paymentId: out.paymentId, amount: out.quote.finalInr }, error: null });
  } catch (err: any) {
    const code = String(err?.message ?? 'purchase_failed');
    return NextResponse.json({ data: null, error: /^[a-z_]+$/.test(code) ? code : 'purchase_failed' }, { status: code === 'unauthenticated' ? 401 : 400 });
  }
}
