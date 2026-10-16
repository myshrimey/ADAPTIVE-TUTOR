import { NextResponse } from 'next/server';

// Public, non-sensitive switch: is self sign-up open? Closed by default during early
// access. The founder re-opens it by setting SIGNUPS_OPEN=true in Vercel and redeploying.
// (The real lock on sign-up is Supabase's own "Allow new users to sign up" setting; this
// only controls what the site shows.)
export async function GET() {
  return NextResponse.json({ data: { signupsOpen: process.env.SIGNUPS_OPEN === 'true' }, error: null });
}
