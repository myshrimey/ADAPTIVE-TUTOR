import { requirePortalPage } from '@/lib/portal';
import { LinkedReportView } from '@/components/portal/LinkedReportView';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const me = await requirePortalPage('tutor');
  const { id, rid } = await params;
  return <LinkedReportView me={me} studentId={id} reportId={rid} />;
}
