import { createHash, createHmac, timingSafeEqual, randomUUID } from 'crypto';
import sharp from 'sharp';
import { FB_ATTACH_BUCKET, FB_ATTACH_TOKEN_MINUTES, FB_ATTACH_MAX_EDGE, FB_ATTACH_MAX_FILES, FB_ATTACH_PER_IP_PER_HOUR, decideAttach, sniffImage, attachmentPath, isUuid } from '@adaptive-tutor/core';

// ---- the short-lived permission to add pictures to ONE feedback message (given only to the person who just sent it)
function key(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('attachments_unavailable'); // fail closed
  return createHash('sha256').update('sahayak-feedback-attach:' + k).digest();
}
const mac = (feedbackId: string, exp: number) => createHmac('sha256', key()).update(`${feedbackId}.${exp}`).digest('base64url');
export function signAttachToken(feedbackId: string, now: number = Date.now()): string {
  const exp = now + FB_ATTACH_TOKEN_MINUTES * 60_000;
  return `${exp}.${mac(feedbackId, exp)}`;
}
export function verifyAttachToken(feedbackId: string, token: unknown, now: number = Date.now()): boolean {
  try {
    if (!isUuid(feedbackId) || typeof token !== 'string' || token.length > 200) return false;
    const [expStr, given] = token.split('.');
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < now || !given) return false;
    const want = Buffer.from(mac(feedbackId, exp)), got = Buffer.from(given);
    return want.length === got.length && timingSafeEqual(want, got);
  } catch { return false; }
}

export function attachIpHash(request: Request): string {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return createHash('sha256').update('sahayak-feedback-pic:' + ip).digest('hex');
}

/** Re-encode as a plain JPEG: removes hidden camera/location details and anything that is not pixels. Returns null if it is not a real picture. */
export async function normalisePicture(input: Buffer): Promise<Buffer | null> {
  try {
    if (!sniffImage(input)) return null;
    return await sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: FB_ATTACH_MAX_EDGE, height: FB_ATTACH_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch { return null; }
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: 'not_a_picture' | 'too_big' | 'too_many_pictures' | 'too_many_uploads' | 'attachments_unavailable' };

/** Save one picture for one feedback message. Never throws. */
export async function saveFeedbackPicture(service: any, feedbackId: string, raw: Buffer, ipHash: string): Promise<SaveResult> {
  try {
    const sinceHour = new Date(Date.now() - 3600_000).toISOString();
    const [mine, recent, fb] = await Promise.all([
      service.from('feedback_attachments').select('id', { count: 'exact', head: true }).eq('feedback_id', feedbackId),
      service.from('feedback_attachments').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', sinceHour),
      service.from('feedback').select('id').eq('id', feedbackId).maybeSingle(),
    ]);
    if (mine.error || recent.error || !fb?.data) return { ok: false, error: 'attachments_unavailable' };
    const d = decideAttach({ existing: mine.count ?? 0, recentFromIp: recent.count ?? 0, bytes: raw.length });
    if (!d.ok) return { ok: false, error: d.reason };
    const jpeg = await normalisePicture(raw);
    if (!jpeg) return { ok: false, error: 'not_a_picture' };
    const id = randomUUID(); const path = attachmentPath(feedbackId, id);
    let up = await service.storage.from(FB_ATTACH_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
    if (up?.error && /bucket/i.test(String(up.error.message ?? ''))) { // the private bucket was not created by the migration: create it once, then retry
      try { await service.storage.createBucket(FB_ATTACH_BUCKET, { public: false }); } catch { /* ignore */ }
      up = await service.storage.from(FB_ATTACH_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
    }
    if (up?.error) return { ok: false, error: 'attachments_unavailable' };
    const ins = await service.from('feedback_attachments').insert({ id, feedback_id: feedbackId, storage_path: path, mime: 'image/jpeg', bytes: jpeg.length, ip_hash: ipHash });
    if (ins?.error) { try { await service.storage.from(FB_ATTACH_BUCKET).remove([path]); } catch { /* ignore */ } return { ok: false, error: 'attachments_unavailable' }; }
    return { ok: true, id };
  } catch { return { ok: false, error: 'attachments_unavailable' }; }
}

/** Remove the picture FILES for these feedback messages (the rows go with the feedback row). Used when a family's data is deleted. Never throws. */
export async function removePictureFilesForFeedback(service: any, feedbackIds: string[]): Promise<number> {
  try {
    if (!feedbackIds.length) return 0;
    const { data } = await service.from('feedback_attachments').select('storage_path').in('feedback_id', feedbackIds);
    const paths = (data ?? []).map((r: any) => r.storage_path).filter(Boolean);
    if (paths.length) await service.storage.from(FB_ATTACH_BUCKET).remove(paths);
    return paths.length;
  } catch { return 0; }
}
export { FB_ATTACH_MAX_FILES, FB_ATTACH_PER_IP_PER_HOUR };
