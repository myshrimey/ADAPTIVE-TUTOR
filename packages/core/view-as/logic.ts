import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// v140: "View Account As" tickets (design: docs/sahayak-control-centre/VIEW_AS_DESIGN.md, TASK-035). The admin keeps their OWN session;
// a ticket only says "this admin may look at this one account's read-only pages until this time". It is never a login as the account.
export const VIEW_GROUPS = ['dashboard', 'progress', 'report'] as const;
export type ViewGroup = (typeof VIEW_GROUPS)[number];
export const VIEW_GROUP_LABEL: Record<ViewGroup, string> = { dashboard: 'Dashboard', progress: 'Progress by subject', report: 'Report and tests' };
export const isViewGroup = (v: unknown): v is ViewGroup => typeof v === 'string' && (VIEW_GROUPS as readonly string[]).includes(v);

export const TICKET_TTL_MS = 15 * 60 * 1000;
export const MAX_STARTS_PER_HOUR = 20;

export interface TicketPayload { v: 1; jti: string; adm: string; tgt: string; iat: number; exp: number }
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest();

export function signTicket(adminEmail: string, targetUserId: string, secret: string, now: Date = new Date()): string {
  if (!secret || secret.length < 16) throw new Error('view_as_secret_missing');
  const p: TicketPayload = { v: 1, jti: randomBytes(9).toString('hex'), adm: adminEmail.toLowerCase(), tgt: targetUserId, iat: now.getTime(), exp: now.getTime() + TICKET_TTL_MS };
  const body = b64(JSON.stringify(p));
  return `${body}.${b64(mac(body, secret))}`;
}

export type TicketCheck = { ok: true; payload: TicketPayload; minutesLeft: number } | { ok: false; reason: 'invalid' | 'expired' | 'wrong_admin' };
/** Checked on EVERY request: signature, expiry and that the signed-in admin is the admin it was issued to. */
export function verifyTicket(token: unknown, secret: string, adminEmail: string, now: Date = new Date()): TicketCheck {
  try {
    const [body, sig, extra] = String(token ?? '').split('.');
    if (!body || !sig || extra !== undefined || !secret) return { ok: false, reason: 'invalid' };
    const want = mac(body, secret), got = Buffer.from(sig, 'base64url');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return { ok: false, reason: 'invalid' };
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TicketPayload;
    if (p.v !== 1 || !/^[0-9a-f-]{36}$/i.test(String(p.tgt)) || typeof p.exp !== 'number' || typeof p.iat !== 'number') return { ok: false, reason: 'invalid' };
    if (p.exp - p.iat !== TICKET_TTL_MS) return { ok: false, reason: 'invalid' };
    if (now.getTime() >= p.exp) return { ok: false, reason: 'expired' };
    if (String(p.adm) !== String(adminEmail ?? '').toLowerCase()) return { ok: false, reason: 'wrong_admin' };
    return { ok: true, payload: p, minutesLeft: Math.max(0, Math.ceil((p.exp - now.getTime()) / 60000)) };
  } catch { return { ok: false, reason: 'invalid' }; }
}

/** A short plain reason is required before any ticket is issued (kept in the Audit log). */
export function cleanReason(raw: unknown): { ok: true; value: string } | { ok: false } {
  const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (t.length < 8 || t.length > 200) return { ok: false };
  return { ok: true, value: t };
}
