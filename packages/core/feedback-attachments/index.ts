// v106: rules for pictures attached to feedback. Pure functions and numbers only (safe for the browser and the server).
// A picture is untrusted: it is checked by its first bytes (never by the name or the type the browser claims), shrunk in the browser,
// and re-encoded as a plain JPEG on the server, which also removes camera/location details hidden inside the file.
export const FB_ATTACH_MAX_FILES = 3;
export const FB_ATTACH_MAX_BYTES = 1_500_000;        // per picture, as received (the browser shrinks it first)
export const FB_ATTACH_MAX_EDGE = 1600;              // longest side in pixels after shrinking
export const FB_ATTACH_TOKEN_MINUTES = 15;           // how long after sending feedback a picture may still be added to it
export const FB_ATTACH_PER_IP_PER_HOUR = 10;         // pictures from one internet address per hour
export const FB_ATTACH_BUCKET = 'feedback-screenshots';
export const FB_ATTACH_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type FbAttachType = (typeof FB_ATTACH_TYPES)[number];

export const FB_ATTACH_NOTICE = 'Pictures are seen only by the Sahayak team. Before you add one, cover passwords, phone numbers and other people\'s names or faces.';
export const FB_ATTACH_ERRORS: Record<string, string> = {
  not_a_picture: 'That file is not a picture we can use. Please add a PNG, JPG or WebP screenshot.',
  too_big: 'That picture is too large. Please try a smaller screenshot.',
  too_many_pictures: 'You can add up to 3 pictures.',
  too_many_uploads: 'Too many pictures from your network just now. Please try again in a while.',
  attachments_unavailable: 'Your message was sent, but pictures cannot be added right now.',
};

const eq = (b: Uint8Array, at: number, sig: number[]) => sig.every((v, i) => b[at + i] === v);
/** Look at the first bytes. Returns the real type, or null for anything else (SVG, HTML, GIF, PDF, text, renamed files). */
export function sniffImage(bytes: Uint8Array): FbAttachType | null {
  if (!bytes || bytes.length < 12) return null;
  if (eq(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (eq(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (eq(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && eq(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  return null;
}

/** Scale (width, height) down so the longest side is at most `max`. Never scales up. Whole numbers, at least 1. */
export function fitWithin(width: number, height: number, max: number = FB_ATTACH_MAX_EDGE): { width: number; height: number } {
  const w = Math.max(1, Math.round(Number(width) || 1)), h = Math.max(1, Math.round(Number(height) || 1));
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const k = max / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

export type AttachDecision = { ok: true } | { ok: false; reason: 'too_many_pictures' | 'too_many_uploads' | 'too_big' };
/** Decide from simple counts. Bad numbers never block (they are treated as 0). */
export function decideAttach(p: { existing: number; recentFromIp: number; bytes: number }): AttachDecision {
  const n = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);
  if (n(p.bytes) > FB_ATTACH_MAX_BYTES) return { ok: false, reason: 'too_big' };
  if (n(p.existing) >= FB_ATTACH_MAX_FILES) return { ok: false, reason: 'too_many_pictures' };
  if (n(p.recentFromIp) >= FB_ATTACH_PER_IP_PER_HOUR) return { ok: false, reason: 'too_many_uploads' };
  return { ok: true };
}

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Where a file lives in the bucket. Built only from two ids, never from a file name. */
export function attachmentPath(feedbackId: string, pictureId: string): string {
  if (!isUuid(feedbackId) || !isUuid(pictureId)) throw new Error('bad_id');
  return `${feedbackId}/${pictureId}.jpg`;
}
