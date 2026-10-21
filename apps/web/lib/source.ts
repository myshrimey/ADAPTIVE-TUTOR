import { cookies } from 'next/headers';
import { normaliseSource } from '@adaptive-tutor/core';

// First-touch source of a sign-up, read from the cookie the middleware set when someone arrived through a link such as ?src=whatsapp.
// Stored on users.source / users.utm for the founder's channel numbers. Never shown to the user. Failure never blocks sign-up.
export async function signupSourceFields(): Promise<{ source: string; utm: Record<string, string> | null }> {
  try {
    const raw = (await cookies()).get('sahayak_src')?.value;
    if (!raw) return { source: 'direct', utm: null };
    const j = JSON.parse(decodeURIComponent(raw));
    return { source: normaliseSource(j.s), utm: { medium: String(j.m ?? '').slice(0, 40), campaign: String(j.c ?? '').slice(0, 60) } };
  } catch { return { source: 'direct', utm: null }; }
}
