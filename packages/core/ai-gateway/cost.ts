import { USD_TO_INR } from '../ai-provider/usage';
import { isFreeRoute, type ProviderRow } from './registry';

export interface CallCost { estInr: number; billedInr: number; freeQuotaUsed: boolean }
/** List-price estimate from the registry rates, and what is billed (0 while on a free route). Unknown rates give 0 and are shown as such elsewhere. */
export function computeCost(p: ProviderRow, inputTokens: number, outputTokens: number, images = 0, today?: string): CallCost {
  const est = ((inputTokens * (p.input_price_usd_m ?? 0) + outputTokens * (p.output_price_usd_m ?? 0)) / 1_000_000 + images * (p.image_price_usd ?? 0)) * USD_TO_INR;
  const free = isFreeRoute(p, today);
  return { estInr: est, billedInr: free ? 0 : est, freeQuotaUsed: free };
}
export function ratesKnown(p: ProviderRow): boolean { return p.input_price_usd_m !== null && p.output_price_usd_m !== null; }
