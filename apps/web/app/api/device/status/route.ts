import { NextResponse } from 'next/server';
import { createServerClient, checkCurrentDevice } from '@/lib/supabase-server';

// Is this browser allowed to use this login? (2-device limit.) Called by the site header after sign-in.
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: { allowed: true, signedIn: false }, error: null });
  const r = await checkCurrentDevice(user);
  return NextResponse.json({ data: { allowed: r.allowed, signedIn: true, devices: r.devices }, error: null });
}
