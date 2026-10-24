import { requirePortalPage } from '@/lib/portal';
import { AdultBaselineView } from '@/components/baseline/AdultBaselineView';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePortalPage('centre');
  const { id } = await params;
  return <AdultBaselineView me={me} studentId={id} />;
}
