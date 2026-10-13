import type { SupabaseClient } from '@supabase/supabase-js';

// Offline UPI/QR pilot payment tracking — see
// packages/db/migrations/0009_pilot_payments.sql for the RLS rules that make
// this safe (a student can submit and read their own claim; only the
// service-role key, used from the admin page, can confirm one).

export const PILOT_OFFER = {
  label: '30-day founding-family pilot',
  priceInr: 199,
  days: 30,
} as const;

export interface PilotPaymentClaim {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected';
  amount: number;
  paymentDate: string;
  pilotStartDate: string | null;
  pilotEndDate: string | null;
  createdAt: string;
}

/** Student submits a payment claim after paying the founder directly via UPI/QR. Never auto-confirmed. */
export async function submitPaymentClaim(
  supabase: SupabaseClient,
  studentId: string,
  params: { amount: number; paymentDate: string; transactionReference?: string }
): Promise<void> {
  const { error } = await supabase.from('pilot_payments').insert({
    student_id: studentId,
    offer_label: PILOT_OFFER.label,
    amount: params.amount,
    payment_date: params.paymentDate,
    transaction_reference: params.transactionReference ?? null,
    status: 'pending',
  });
  if (error) throw error;
}

/** The student's own payment claims, most recent first — used to show pending/confirmed status and access dates. */
export async function getMyPaymentClaims(supabase: SupabaseClient, studentId: string): Promise<PilotPaymentClaim[]> {
  const { data, error } = await supabase
    .from('pilot_payments')
    .select('id, status, amount, payment_date, pilot_start_date, pilot_end_date, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    amount: Number(r.amount),
    paymentDate: r.payment_date,
    pilotStartDate: r.pilot_start_date,
    pilotEndDate: r.pilot_end_date,
    createdAt: r.created_at,
  }));
}

/**
 * Admin-only (called from /admin/payments with a service-role client, itself
 * gated on ADMIN_EMAILS — never reachable by an ordinary signed-in user).
 * Confirming sets the pilot's start/end dates (today -> today + offer days)
 * unless explicit dates are given.
 */
export async function confirmPayment(
  serviceClient: SupabaseClient,
  paymentId: string,
  params?: { pilotStartDate?: string; pilotEndDate?: string; adminNotes?: string }
): Promise<void> {
  const start = params?.pilotStartDate ?? new Date().toISOString().slice(0, 10);
  const end =
    params?.pilotEndDate ??
    new Date(Date.now() + PILOT_OFFER.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { error } = await serviceClient
    .from('pilot_payments')
    .update({
      status: 'confirmed',
      pilot_start_date: start,
      pilot_end_date: end,
      admin_notes: params?.adminNotes ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', paymentId);
  if (error) throw error;
}

export async function rejectPayment(serviceClient: SupabaseClient, paymentId: string, adminNotes?: string): Promise<void> {
  const { error } = await serviceClient
    .from('pilot_payments')
    .update({ status: 'rejected', admin_notes: adminNotes ?? null })
    .eq('id', paymentId);
  if (error) throw error;
}
