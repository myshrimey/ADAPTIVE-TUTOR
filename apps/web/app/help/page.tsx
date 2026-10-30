import { HelpCenter } from '@/components/HelpCenter';
export const metadata = { title: 'Help | Sahayak' };
export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Help</h1>
      <HelpCenter initialRole={sp.role} />
    </div></main>
  );
}
