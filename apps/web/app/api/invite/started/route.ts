import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { lookupToken, markStarted } from '@adaptive-tutor/core';

// Public, token-gated: the person began filling in the form (funnel step "started"). Reveals nothing.
export async function POST(request: Request) {
  try {
    const b = await request.json().catch(() => ({})); const service = createServiceClient();
    const r = await lookupToken(service, b.token); if (r.ok) await markStarted(service, r.inv);
  } catch { /* ignore */ }
  return NextResponse.json({ data: { ok: true }, error: null });
}
