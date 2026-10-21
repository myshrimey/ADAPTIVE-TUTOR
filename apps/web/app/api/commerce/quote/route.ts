import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { loadProduct, loadOffers, quotePrice } from '@adaptive-tutor/core';

// Public: what would this cost? Always computed on the server from the database.
export async function POST(request: Request) {
  try {
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const product = await loadProduct(service, String(b.productCode ?? ''));
    if (!product || !product.onSale) return NextResponse.json({ data: null, error: 'product_not_available' }, { status: 404 });
    const quote = quotePrice(product, await loadOffers(service), typeof b.coupon === 'string' ? b.coupon.slice(0, 40) : null, Number(b.quantity) || 1);
    return NextResponse.json({ data: quote, error: null });
  } catch (e: any) {
    return NextResponse.json({ data: null, error: 'quote_failed' }, { status: 400 });
  }
}
