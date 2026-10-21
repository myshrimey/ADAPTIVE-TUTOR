import { notFound } from 'next/navigation';
import { createServiceClient, createServerClient } from '@/lib/supabase-server';
import { loadProduct, loadOffers, loadSettings, quotePrice } from '@adaptive-tutor/core';
import { CheckoutForm } from '@/components/commerce/CheckoutForm';
import { getPortalUser, linkedStudentIds } from '@/lib/portal';
import { PageTerms, CardTerms } from '@/components/commerce/TermsNote';

export const dynamic = 'force-dynamic';

export default async function BuyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const service = createServiceClient();
  const product = await loadProduct(service, code);
  if (!product || !product.onSale) notFound();
  if (product.kind === 'tutor' || product.kind === 'centre') return <main className="page"><div className="shell"><p>Please <a href={`/plans/apply/${product.kind}`}>apply here</a>.</p></div></main>;
  const [offers, settings, { data: subj }, { data: { user } }] = await Promise.all([
    loadOffers(service), loadSettings(service),
    service.from('subjects').select('slug, name, status').order('name'),
    (await createServerClient()).auth.getUser(),
  ]);
  const quote = quotePrice(product, offers, null, 1);
  // A parent buys for a linked child (never for anyone else).
  const me = user ? await getPortalUser() : null;
  let kids: { id: string; name: string }[] | undefined;
  if (me?.role === 'parent') {
    const ids = await linkedStudentIds(me);
    const { data: st } = ids.length ? await service.from('students').select('id, display_name').in('id', ids) : { data: [] as any[] };
    kids = (st ?? []).map((x: any) => ({ id: x.id, name: x.display_name ?? 'Student' }));
  }
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <p><a href="/plans">← All plans</a></p>
          <h1 style={{ fontSize: 'var(--step-2)' }}>{product.name}</h1>
          {product.subtitle && <p style={{ color: 'var(--slate)' }}>{product.subtitle}</p>}
          <ul>{product.features.map((f) => <li key={f}>{f}</li>)}</ul>
          {product.validityUntil && <p>Valid through {product.validityUntil}.</p>}
          <CardTerms />
        </div>
        {user ? (
          <CheckoutForm code={product.code} name={product.name} kind={product.kind} subjectCount={product.subjectCount} billing={product.billing} subjects={(subj ?? []).filter((s: any) => s.status !== 'coming_soon')} initial={quote} upi={settings.payment_instructions} kids={kids} />
        ) : (
          <p className="alert">Please <a href="/">sign in or create a free account</a> with the student&apos;s details first, then come back to this page.</p>
        )}
        <PageTerms />
      </div>
    </main>
  );
}
