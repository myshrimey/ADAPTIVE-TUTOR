import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase auth session on every request so server components
// and route handlers see a valid session. Add route protection here once
// there are routes that must redirect unauthenticated users (Day 2).
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.getUser();

  // Device id for the 2-device limit (see packages/core/devices). A random id per browser; it
  // identifies a browser, not a person, and is only used while someone is signed in.
  if (!request.cookies.get('sahayak_did')) {
    const id = crypto.randomUUID();
    request.cookies.set('sahayak_did', id);
    response.cookies.set('sahayak_did', id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 730, path: '/' });
  }
  // First-touch acquisition source (?src=, ?utm_source=, ?ref=). Set once; a later link never overwrites it.
  if (!request.cookies.get('sahayak_src')) {
    const q = request.nextUrl.searchParams;
    const src = q.get('src') || q.get('utm_source') || q.get('ref');
    if (src) {
      const v = encodeURIComponent(JSON.stringify({ s: src.slice(0, 40), m: (q.get('utm_medium') ?? '').slice(0, 40), c: (q.get('utm_campaign') ?? '').slice(0, 60) }));
      response.cookies.set('sahayak_src', v, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90, path: '/' });
    }
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
