import { NextResponse } from 'next/server';
import { createServiceClient, createServerClient } from '@/lib/supabase-server';
import { visitorHash } from '@/lib/analytics';
import { cleanTrackEvent, parseUserAgent, classifyChannel, istDayOf, recordView } from '@adaptive-tutor/core';

// Counts one page view. Never blocks anything: always answers 204. Bots, admin pages, API calls and "Do Not Track" visits are not counted.
const SEEN = new Map<string, { n: number; t: number }>(); // tiny per-hash flood guard (per server instance)
export async function POST(request: Request) {
  const done = () => new NextResponse(null, { status: 204 });
  try {
    if (request.headers.get('dnt') === '1') return done();
    const ua = request.headers.get('user-agent') ?? '';
    const parsed = parseUserAgent(ua);
    if (parsed.bot) return done();
    const raw = await request.json().catch(() => null);
    const ev = cleanTrackEvent(raw);
    if (!ev) return done();
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
    const visitor = visitorHash(ip, ua, istDayOf(Date.now()));
    const now = Date.now(); const s = SEEN.get(visitor);
    if (s && now - s.t < 60_000) { if (++s.n > 40) return done(); } else SEEN.set(visitor, { n: 1, t: now });
    if (SEEN.size > 5000) SEEN.clear();
    const own = (request.headers.get('host') ?? '').toLowerCase();
    const { channel, source } = classifyChannel({ referrerHost: ev.referrerHost, utmSource: ev.utmSource, utmMedium: ev.utmMedium, ownHost: own });
    let signedIn = false;
    try { const sb = await createServerClient(); const { data } = await sb.auth.getUser(); signedIn = !!data.user; } catch { /* anonymous */ }
    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase().slice(0, 2) || null;
    const region = (request.headers.get('x-vercel-ip-country-region') ?? '').slice(0, 8) || null;
    await recordView(createServiceClient(), { visitor, path: ev.path, channel, source, campaign: ev.utmCampaign, device: parsed.device, browser: parsed.browser, os: parsed.os, country, region, signed_in: signedIn });
  } catch { /* analytics must never break the site */ }
  return done();
}
