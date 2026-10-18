import type { SupabaseClient } from '@supabase/supabase-js';

// Device limit (founder rule, v43): one family login may be used on at most 2 devices.
//
// What a "device" is: a browser on a computer or phone. A website cannot read a laptop's real
// hardware (MAC) address, so each browser is given a random id (cookie `sahayak_did`, set in
// middleware) and Sahayak records that id with the IP address and browser/system description.
// This stops everyday password sharing. It cannot stop someone who clears cookies or uses a
// private window (that looks like a new device and uses a slot); the founder can reset a family's
// devices at /admin/students. Founder and teacher accounts are not limited.

export const MAX_DEVICES_PER_ACCOUNT = 2;
export const DEVICE_COOKIE = 'sahayak_did';
const TOUCH_AFTER_MS = 10 * 60 * 1000; // refresh "last seen" at most every 10 minutes

export interface DeviceRow {
  device_id: string;
  label: string | null;
  ip: string | null;
  first_seen: string;
  last_seen: string;
}

export type DeviceDecision = 'known' | 'register' | 'blocked';

/** Pure. Known device = allowed; new device is allowed while a slot is free; otherwise blocked. */
export function decideDevice(existing: { device_id: string }[], deviceId: string, limit: number = MAX_DEVICES_PER_ACCOUNT): DeviceDecision {
  if (existing.some((d) => d.device_id === deviceId)) return 'known';
  return existing.length < limit ? 'register' : 'blocked';
}

/** Pure. A short human description such as "Chrome on Windows" from a User-Agent string. */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = userAgent ?? '';
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iPhone/iPad' : /Mac OS X|Macintosh/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'unknown system';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'unknown browser';
  return `${browser} on ${os}`;
}

export function isValidDeviceId(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f-]{32,40}$/i.test(v);
}

export interface DeviceCheckResult {
  allowed: boolean;
  decision: DeviceDecision | 'exempt' | 'no_cookie';
}

/**
 * Checks (and records) this browser for the signed-in account. Uses the SERVICE client: the caller
 * passes the authenticated user's auth id, never a client-supplied one. Fails OPEN on a database
 * error so a hiccup never locks a paying family out.
 */
export async function checkDevice(
  service: SupabaseClient,
  p: { authUserId: string; deviceId: string | null | undefined; ip: string | null; userAgent: string | null; exempt: boolean; limit?: number },
  now: Date = new Date()
): Promise<DeviceCheckResult> {
  if (p.exempt) return { allowed: true, decision: 'exempt' };
  if (!isValidDeviceId(p.deviceId)) return { allowed: true, decision: 'no_cookie' }; // cookies blocked: cannot identify, do not lock out
  try {
    const { data, error } = await service.from('account_devices').select('device_id, last_seen').eq('auth_user_id', p.authUserId);
    if (error) return { allowed: true, decision: 'known' };
    const existing = (data ?? []) as { device_id: string; last_seen: string }[];
    const decision = decideDevice(existing, p.deviceId, p.limit);
    if (decision === 'blocked') return { allowed: false, decision };
    if (decision === 'register') {
      await service.from('account_devices').insert({ auth_user_id: p.authUserId, device_id: p.deviceId, label: describeDevice(p.userAgent), user_agent: (p.userAgent ?? '').slice(0, 300), ip: p.ip, first_seen: now.toISOString(), last_seen: now.toISOString() });
    } else {
      const row = existing.find((d) => d.device_id === p.deviceId)!;
      if (now.getTime() - new Date(row.last_seen).getTime() > TOUCH_AFTER_MS) {
        await service.from('account_devices').update({ last_seen: now.toISOString(), ip: p.ip }).eq('auth_user_id', p.authUserId).eq('device_id', p.deviceId);
      }
    }
    return { allowed: true, decision };
  } catch {
    return { allowed: true, decision: 'known' };
  }
}
