// t106: pictures and screenshots attached to feedback (v106).
import { readFileSync } from 'fs';
import sharp from 'sharp';
import { sniffImage, fitWithin, decideAttach, attachmentPath, isUuid, FB_ATTACH_MAX_FILES, FB_ATTACH_MAX_BYTES, FB_ATTACH_MAX_EDGE, FB_ATTACH_PER_IP_PER_HOUR, FB_ATTACH_TOKEN_MINUTES, FB_ATTACH_ERRORS, FB_ATTACH_NOTICE } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const FID = '11111111-1111-4111-8111-111111111111', FID2 = '22222222-2222-4222-8222-222222222222', PID = '33333333-3333-4333-8333-333333333333';

(async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key-not-real';
  const lib = require('../apps/web/lib/feedback-attachments');

  // ---- sniffing: real bytes, never the name
  const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#f00' } }).png().toBuffer();
  const jpg = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#0f0' } }).jpeg().toBuffer();
  const webp = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#00f' } }).webp().toBuffer();
  ok(sniffImage(png) === 'image/png' && sniffImage(jpg) === 'image/jpeg' && sniffImage(webp) === 'image/webp', 'PNG, JPEG and WebP are recognised by their bytes');
  const fakes: Record<string, string> = { svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', html: '<!doctype html><html><body>hi</body></html>', gif: 'GIF89a\u0001\u0000\u0001\u0000\u0000\u0000\u0000', pdf: '%PDF-1.4 hello world', text: 'just some text here' };
  for (const [k, v] of Object.entries(fakes)) ok(sniffImage(Buffer.from(v)) === null, `${k} is refused`);
  ok(sniffImage(new Uint8Array(3)) === null && sniffImage(null as any) === null, 'tiny or empty input is refused');

  // ---- sizes and limits
  ok(JSON.stringify(fitWithin(3200, 1600)) === JSON.stringify({ width: FB_ATTACH_MAX_EDGE, height: FB_ATTACH_MAX_EDGE / 2 }), 'big picture scaled down to the limit');
  ok(JSON.stringify(fitWithin(100, 50)) === JSON.stringify({ width: 100, height: 50 }), 'small picture never scaled up');
  ok(fitWithin(0, NaN).width === 1 && fitWithin(5000, 1).height >= 1, 'never returns zero');
  ok(decideAttach({ existing: 0, recentFromIp: 0, bytes: 1000 }).ok, 'normal upload allowed');
  ok(!decideAttach({ existing: FB_ATTACH_MAX_FILES, recentFromIp: 0, bytes: 1 }).ok, 'fourth picture refused');
  ok((decideAttach({ existing: 0, recentFromIp: FB_ATTACH_PER_IP_PER_HOUR, bytes: 1 }) as any).reason === 'too_many_uploads', 'address limit applies');
  ok((decideAttach({ existing: 0, recentFromIp: 0, bytes: FB_ATTACH_MAX_BYTES + 1 }) as any).reason === 'too_big', 'oversize refused');
  ok(decideAttach({ existing: NaN, recentFromIp: undefined as any, bytes: NaN }).ok, 'bad numbers never block');
  ok(['not_a_picture', 'too_big', 'too_many_pictures', 'too_many_uploads', 'attachments_unavailable'].every((k) => FB_ATTACH_ERRORS[k]?.length > 10), 'every error has friendly words');
  ok(!/lazy|careless|weak|blame|attack|hack/i.test(Object.values(FB_ATTACH_ERRORS).join(' ')), 'neutral wording');
  ok(/password/i.test(FB_ATTACH_NOTICE) && /Sahayak team/.test(FB_ATTACH_NOTICE), 'privacy notice names who sees it and what to cover');

  // ---- paths are built from ids only
  ok(attachmentPath(FID, PID) === `${FID}/${PID}.jpg`, 'path from two ids');
  let threw = 0; for (const bad of ['../x', 'a/b', '']) { try { attachmentPath(bad, PID); } catch { threw++; } }
  ok(threw === 3 && isUuid(FID) && !isUuid('nope'), 'a path cannot be built from a file name');

  // ---- signed permission
  const T = 1_800_000_000_000;
  const tok = lib.signAttachToken(FID, T);
  ok(lib.verifyAttachToken(FID, tok, T + 1000), 'fresh token works for its own message');
  ok(!lib.verifyAttachToken(FID2, tok, T + 1000), 'token does not work for another message');
  ok(!lib.verifyAttachToken(FID, tok, T + FB_ATTACH_TOKEN_MINUTES * 60_000 + 1), 'token expires');
  const [e, m] = tok.split('.');
  ok(!lib.verifyAttachToken(FID, `${Number(e) + 600000}.${m}`, T), 'changed expiry is refused');
  ok(!lib.verifyAttachToken(FID, `${e}.${m.slice(0, -2)}xx`, T), 'tampered signature is refused');
  ok(!lib.verifyAttachToken(FID, undefined) && !lib.verifyAttachToken(FID, 'x'.repeat(500)) && !lib.verifyAttachToken('bad', tok, T), 'junk is refused');
  const keep = process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  ok(!lib.verifyAttachToken(FID, tok, T + 1000), 'no server key: fails closed');
  let sThrew = false; try { lib.signAttachToken(FID); } catch { sThrew = true; }
  ok(sThrew, 'no server key: cannot sign');
  process.env.SUPABASE_SERVICE_ROLE_KEY = keep;

  // ---- re-encoding strips hidden data and rejects non-images
  const withExif = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#888' } }).withExif({ IFD0: { Copyright: 'SECRET-LOCATION-TAG' } }).jpeg().toBuffer();
  ok(withExif.includes(Buffer.from('SECRET-LOCATION-TAG')), '(setup) the test picture really carries hidden text');
  const out: Buffer | null = await lib.normalisePicture(withExif);
  const meta = out ? await sharp(out).metadata() : null;
  ok(!!out && !out.includes(Buffer.from('SECRET-LOCATION-TAG')) && !meta?.exif, 'hidden data is removed');
  ok(meta?.format === 'jpeg' && (meta?.width ?? 0) <= FB_ATTACH_MAX_EDGE, 'result is a JPEG within the size limit');
  ok((await lib.normalisePicture(Buffer.from(fakes.svg))) === null, 'SVG is never stored');
  ok((await lib.normalisePicture(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(50, 1)]))) === null, 'a file with a JPEG start but no picture is refused');
  const pngA = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  ok((await lib.normalisePicture(pngA)) !== null, 'transparent PNG is accepted');

  // ---- saving with a fake service
  const mkSvc = (o: { exists?: boolean; existing?: number; recent?: number; uploadErr?: any; insertErr?: any } = {}) => {
    const calls: any = { uploaded: [] as string[], removed: [] as string[], inserted: [] as any[] };
    const svc: any = {
      calls,
      from: (t: string) => {
        const q: any = { _t: t, _eq: [] as string[] };
        q.select = () => q; q.eq = (c: string) => (q._eq.push(c), q); q.gte = () => q; q.maybeSingle = async () => ({ data: o.exists === false ? null : { id: FID } });
        q.insert = async (r: any) => { calls.inserted.push(r); return { error: o.insertErr ?? null }; };
        q.then = (res: any) => res({ count: q._eq.includes('ip_hash') ? (o.recent ?? 0) : (o.existing ?? 0), error: null });
        return q;
      },
      storage: { from: () => ({ upload: async (p: string) => { if (o.uploadErr) return { error: o.uploadErr }; calls.uploaded.push(p); return { error: null }; }, remove: async (p: string[]) => { calls.removed.push(...p); return {}; } }), createBucket: async () => ({}) },
    };
    return svc;
  };
  let s = mkSvc(); let r = await lib.saveFeedbackPicture(s, FID, png, 'h');
  ok(r.ok && s.calls.uploaded.length === 1 && s.calls.inserted.length === 1 && s.calls.inserted[0].mime === 'image/jpeg' && s.calls.uploaded[0].startsWith(FID + '/') && s.calls.uploaded[0].endsWith('.jpg'), 'good picture stored under the message folder as JPEG');
  s = mkSvc({ exists: false }); r = await lib.saveFeedbackPicture(s, FID, png, 'h');
  ok(!r.ok && !s.calls.uploaded.length, 'no such feedback message: nothing stored');
  s = mkSvc({ existing: FB_ATTACH_MAX_FILES }); r = await lib.saveFeedbackPicture(s, FID, png, 'h');
  ok(!r.ok && r.error === 'too_many_pictures' && !s.calls.uploaded.length, 'fourth picture: nothing stored');
  s = mkSvc({ recent: FB_ATTACH_PER_IP_PER_HOUR }); r = await lib.saveFeedbackPicture(s, FID, png, 'h');
  ok(!r.ok && r.error === 'too_many_uploads', 'address limit: nothing stored');
  s = mkSvc(); r = await lib.saveFeedbackPicture(s, FID, Buffer.from(fakes.svg + ' '.repeat(20)), 'h');
  ok(!r.ok && r.error === 'not_a_picture' && !s.calls.uploaded.length, 'SVG: nothing stored');
  s = mkSvc({ insertErr: { message: 'x' } }); r = await lib.saveFeedbackPicture(s, FID, png, 'h');
  ok(!r.ok && s.calls.removed.length === 1 && s.calls.removed[0] === s.calls.uploaded[0], 'if the row cannot be saved, the file is removed again');
  s = mkSvc({ uploadErr: { message: 'boom' } }); r = await lib.saveFeedbackPicture(s, FID, png, 'h');
  ok(!r.ok && !s.calls.inserted.length, 'upload failure: no row');
  r = await lib.saveFeedbackPicture({ from: () => { throw new Error('down'); } }, FID, png, 'h');
  ok(!r.ok && r.error === 'attachments_unavailable', 'database down: never throws');
  ok((await lib.removePictureFilesForFeedback({ from: () => { throw new Error('x'); } }, [FID])) === 0, 'file removal never throws');

  // ---- wiring (the code itself)
  const attach = R('apps/web/app/api/feedback/attachment/route.ts');
  ok(attach.indexOf('content-length') < attach.indexOf('formData()'), 'size is checked before the body is read');
  ok(attach.indexOf('verifyAttachToken(') > 0 && attach.indexOf('verifyAttachToken(') < attach.indexOf('saveFeedbackPicture('), 'permission is checked before anything is stored');
  ok(!/error:\s*err(\.|\?\.)message/.test(attach) && /publicError\(/.test(attach), 'no raw error text');
  const adm = R('apps/web/app/api/admin/feedback/attachment/route.ts');
  ok((adm.match(/requireAdmin\('support'\)/g) ?? []).length >= 2, 'viewing and deleting both need the support permission');
  ok(/no-store/.test(adm) && /nosniff/i.test(adm) && /sandbox/.test(adm) && /feedback\.picture_delete/.test(adm), 'private, no-sniff, sandboxed, delete is audited');
  const fb = R('apps/web/app/api/feedback/route.ts');
  ok(/signAttachToken\(/.test(fb) && /randomUUID\(/.test(fb), 'feedback route hands out the permission');
  ok(/removePictureFilesForFeedback\(/.test(R('apps/web/app/api/admin/data-requests/execute/route.ts')), 'deleting a family removes their pictures');
  const w = R('apps/web/components/FeedbackWidget.tsx');
  ok(/FB_ATTACH_NOTICE/.test(w) && /\/api\/feedback\/attachment/.test(w) && /onPaste/.test(w), 'widget shows the notice, uploads, and supports paste');
  ok(!/analytics|track\(|ai\b.*image/i.test(R('apps/web/lib/feedback-attachments.ts')), 'no tracking and no AI reading of pictures');
  const pg = R('apps/web/app/admin/feedback/page.tsx');
  ok(/FeedbackPictureAdmin/.test(pg) && /adminPageGate\('support'\)/.test(pg), 'admin page shows pictures behind the support gate');

  // ---- migration
  const mig = R('packages/db/migrations/0061_feedback_attachments.sql');
  ok(/enable row level security/.test(mig) && !/create policy/i.test(mig), 'server-only: RLS on, no policy');
  ok(!/drop table|delete from|truncate/i.test(mig) && /if not exists/.test(mig) && /'feedback-screenshots', false/.test(mig), 'additive and the bucket is private');
  ok(/to_regclass\('storage.buckets'\)/.test(mig), 'bucket creation skips cleanly where storage is absent');

  // ---- bookkeeping
  ok(/v106/.test(R('docs/BUILD_LOG.md')) && /v106/.test(R('docs/RESUME_HERE.md')), 'BUILD_LOG and RESUME_HERE updated');
  ok(/0061/.test(R('docs/ROLLBACK_NOTES.md')) && /0061/.test(R('docs/DATABASE_SCHEMA.md')), 'undo note and schema doc cover 0061');
  ok(/feedback_attachments/.test(R('packages/core/deploy-check/index.ts')), 'deploy-check probes the new table');
  console.log(`t106: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
