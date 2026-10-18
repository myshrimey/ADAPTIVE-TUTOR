// Decides whether a photo of an answer page is good enough to read. Pure rules over numbers measured on the server
// (see apps/web/lib/image-quality.ts). These thresholds are STARTING values, not tuned on real exam sheets: test about
// twenty real phone photos and adjust them here before relying on them.

export interface ImageMetrics {
  width: number;
  height: number;
  bytes: number;
  /** Variance of the Laplacian on a grayscale copy about 1000 px wide: low = blurry. */
  blurScore: number;
  /** 0..255 */
  meanBrightness: number;
  /** Standard deviation of brightness: low = faded or empty. */
  contrast: number;
}

export type QualityReason = 'too_small' | 'blurry' | 'too_dark' | 'too_bright' | 'low_contrast' | 'looks_empty' | 'odd_shape';

export const QUALITY_LIMITS = {
  minShortSide: 900,
  minBytes: 20_000,
  minBlur: 40,
  minBrightness: 80,
  maxBrightness: 245,
  minContrast: 28,
  emptyContrast: 12,
  maxAspect: 3,
};

export const QUALITY_MESSAGES: Record<QualityReason, string> = {
  too_small: 'The photo is too small. Move a little closer, or use the main camera.',
  blurry: 'The photo is blurry. Hold the phone steady, tap the screen to focus, and retake it.',
  too_dark: 'The photo is too dark. Take it in good light, without your shadow on the page.',
  too_bright: 'The photo is too bright or washed out. Avoid direct glare on the paper.',
  low_contrast: 'The writing looks faint. Use a dark pen or pencil and good light.',
  looks_empty: 'This page looks empty. Check that you photographed the written side.',
  odd_shape: 'The photo has an unusual shape. Photograph one full page, flat, from above.',
};

export interface QualityDecision {
  ok: boolean;
  reasons: QualityReason[];
  message: string;
}

export function decideImageQuality(m: ImageMetrics): QualityDecision {
  const L = QUALITY_LIMITS;
  const reasons: QualityReason[] = [];
  const shortSide = Math.min(m.width, m.height);
  const longSide = Math.max(m.width, m.height);
  if (shortSide < L.minShortSide || m.bytes < L.minBytes) reasons.push('too_small');
  if (longSide / Math.max(1, shortSide) > L.maxAspect) reasons.push('odd_shape');
  if (m.meanBrightness < L.minBrightness) reasons.push('too_dark');
  else if (m.meanBrightness > L.maxBrightness && m.contrast >= L.emptyContrast) reasons.push('too_bright');
  if (m.contrast < L.emptyContrast && m.meanBrightness >= L.minBrightness) reasons.push('looks_empty');
  else if (m.contrast < L.minContrast && !reasons.includes('too_dark') && !reasons.includes('too_bright')) reasons.push('low_contrast');
  if (m.blurScore < L.minBlur && !reasons.includes('looks_empty')) reasons.push('blurry');
  if (reasons.length === 0) return { ok: true, reasons, message: 'Photo accepted.' };
  return { ok: false, reasons, message: 'Please retake this page. ' + reasons.map((r) => QUALITY_MESSAGES[r]).join(' ') };
}
