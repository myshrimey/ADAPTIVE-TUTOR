'use client';

// A small link under a question. It opens the normal feedback form with "a problem with a question" chosen and the question id attached,
// so the founder's review queue shows exactly which question was reported. It sends nothing by itself.
export function ReportQuestion({ id, hi = false }: { id: string; hi?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('sahayak:feedback', { detail: { kind: 'question', context: { questionId: String(id).slice(0, 64), feature: 'question' } } }))}
      style={{ background: 'none', border: 'none', padding: 0, margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer' }}
    >
      {hi ? 'इस प्रश्न में कोई गलती है? बताइए' : 'Something wrong with this question? Tell us'}
    </button>
  );
}
