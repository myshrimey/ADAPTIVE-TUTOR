import { NextResponse } from 'next/server';
import { signupsOpen } from '@/lib/signups';

export const dynamic = 'force-dynamic'; // read the setting on every request, never frozen at build time

// Public, non-sensitive switch: is self sign-up open? Open by default (v45); the founder closes it by
// setting SIGNUPS_CLOSED=true in Vercel and redeploying. Supabase's own "Allow new users to sign up" stays OFF:
// accounts are created only by /api/auth/register on the server, with its limits.
export async function GET() {
  return NextResponse.json({ data: { signupsOpen: signupsOpen() }, error: null });
}
