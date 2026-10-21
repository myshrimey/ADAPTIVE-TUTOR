import type { Product, PriceQuote } from '@adaptive-tutor/core';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export function unitText(p: Product): string {
  return p.billing === 'monthly' ? '/ month' : p.billing === 'per_item' ? '/ evaluation' : 'one time';
}
/** "₹499 standard price → ₹399 offer, you save ₹100" when there is an offer; otherwise just the price. */
export function PriceLine({ product, quote }: { product: Product; quote: PriceQuote }) {
  const hasOffer = quote.discountInr > 0;
  const unitList = quote.listInr / quote.quantity;
  const unitFinal = quote.finalInr / quote.quantity;
  return (
    <div className="plan-card__price">
      {hasOffer && <div style={{ fontSize: '0.9rem', color: 'var(--slate)' }}><s>{inr(unitList)}</s> standard price</div>}
      {inr(unitFinal)} <span className="plan-card__unit">{unitText(product)}</span>
      {hasOffer && <div style={{ fontSize: '0.88rem', color: 'var(--mastered, #1b6e3c)' }}>Offer: {quote.offer?.label ?? 'offer'} · you save {inr(unitList - unitFinal)}</div>}
    </div>
  );
}
