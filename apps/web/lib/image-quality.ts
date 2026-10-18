import sharp from 'sharp';
import type { ImageMetrics } from '@adaptive-tutor/core';

// Server-side image checks for answer-sheet photos. Measures a few numbers (see packages/core/handwriting/quality-rules.ts
// for what they mean and the starting thresholds) and prepares a smaller copy for storage and for the AI.
export const MAX_SIDE_PX = 1600;

export function sniffImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export async function measureImage(input: Buffer): Promise<{ metrics: ImageMetrics; jpeg: Buffer; width: number; height: number }> {
  // rotate() applies the phone's EXIF orientation so the page is upright
  const upright = await sharp(input, { failOn: 'error' }).rotate().toBuffer({ resolveWithObject: true });
  const width = upright.info.width;
  const height = upright.info.height;

  // Sharpness / brightness are measured on a grayscale copy about 1000 px wide
  const small = await sharp(upright.data).grayscale().resize({ width: 1000, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = small;
  const w = info.width, h = info.height;
  let sum = 0, sumSq = 0;
  for (let i = 0; i < data.length; i++) { sum += data[i]; sumSq += data[i] * data[i]; }
  const n = data.length;
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  // Laplacian variance (4-neighbour)
  let lsum = 0, lsq = 0, lc = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
      lsum += v; lsq += v * v; lc++;
    }
  }
  const lm = lc ? lsum / lc : 0;
  const blurScore = lc ? lsq / lc - lm * lm : 0;

  const jpeg = await sharp(upright.data).resize({ width: MAX_SIDE_PX, height: MAX_SIDE_PX, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return { metrics: { width, height, bytes: input.length, blurScore, meanBrightness: mean, contrast }, jpeg, width, height };
}
