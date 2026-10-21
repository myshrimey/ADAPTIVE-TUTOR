import { notFound } from 'next/navigation';
import { ApplyForm } from '@/components/commerce/ApplyForm';
import { PageTerms } from '@/components/commerce/TermsNote';

export default async function ApplyPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!['tutor', 'centre', 'partner', 'subject_request'].includes(kind)) notFound();
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <p><a href="/plans">← All plans</a></p>
        <ApplyForm kind={kind as any} />
        <PageTerms />
      </div>
    </main>
  );
}
