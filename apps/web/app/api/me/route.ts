import { NextResponse } from 'next/server';
import { getMe } from '@/lib/me';

// Who is signed in and where should they go next? Used by the home page right after sign-in.
export async function GET() {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json({ data: me, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
