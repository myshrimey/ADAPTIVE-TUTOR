import { requirePortalPage } from '@/lib/portal';
import { LinkedStudentView } from '@/components/portal/LinkedStudentView';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePortalPage('centre');
  const { id } = await params;
  return <LinkedStudentView me={me} studentId={id} />;
}
