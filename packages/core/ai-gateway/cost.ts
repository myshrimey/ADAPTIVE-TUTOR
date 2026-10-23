import { USD_TO_INR } from '../ai-provider/usage';
import { isFreeRoute, promoCreditLeft, quotaTypeOf, type ProviderRow, type QuotaType } from './registry';

/**
 * Five cost layers for one call (all in rupees):
 *  1. listInr            published/list price for these tokens (from the registry rates)
 *  2. freeQuotaValueInr  the part of (1) that a free quota covered (a subsidy, NOT permanently free)
 *  3. promoCreditInr     the part of (1) that a promotional credit covered
 *  4. billedInr          what Sahayak expects the provider to charge = (1) - (2) - (3)
 *  5. economicInr        what unit economics should count = (1), because free quotas and credits end
 * The provider's real charge (actual) is not known per call; it is entered monthly in ai_reconciliations.
 * `pricingSnapshot` keeps the rates and exchange rate used, so an old call can always be explained.
 */
export interface CallCost {
  estInr: number; billedInr: number; freeQuotaUsed: boolean; // v55b names, unchanged
  listInr: number; freeQuotaValueInr: number; promoCreditInr: number; economicInr: number; quotaType: QuotaType;
  pricingSnapshot: Record<string, unknown>;
}
export interface CostOptions { fx?: number; promoUsedInr?: number; audioSeconds?: number }

export function computeCost(p: ProviderRow, inputTokens: number, outputTokens: number, images = 0, today?: string, o: CostOptions = {}): CallCost {
  const fx = o.fx && o.fx > 0 ? o.fx : USD_TO_INR;
  const list = ((inputTokens * (p.input_price_usd_m ?? 0) + outputTokens * (p.output_price_usd_m ?? 0)) / 1_000_000 + images * (p.image_price_usd ?? 0)) * fx;
  const day = today ?? new Date().toISOString().slice(0, 10);
  const free = isFreeRoute(p, day);
  const qt = quotaTypeOf(p, day, o.promoUsedInr ?? 0);
  const promo = qt === 'promo_credit' ? Math.min(list, promoCreditLeft(p, o.promoUsedInr ?? 0, day)) : 0;
  const freeVal = free ? list : 0;
  return {
    estInr: list, listInr: list, freeQuotaUsed: free, freeQuotaValueInr: freeVal, promoCreditInr: promo,
    billedInr: Math.max(0, list - freeVal - promo), economicInr: list, quotaType: qt,
    pricingSnapshot: {
      fx_usd_inr: fx, input_price_usd_m: p.input_price_usd_m, output_price_usd_m: p.output_price_usd_m, image_price_usd: p.image_price_usd,
      model: p.model, model_version: p.model_version, quota_type: qt, rates_known: ratesKnown(p), price_last_verified: p.price_last_verified ?? p.last_verified ?? null, priced_on: day,
    },
  };
}
export function ratesKnown(p: ProviderRow): boolean { return p.input_price_usd_m !== null && p.output_price_usd_m !== null; }
