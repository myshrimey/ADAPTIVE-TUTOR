import { requirePortalPage } from '@/lib/portal';
import { PortalDashboard } from '@/components/portal/PortalDashboard';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const me = await requirePortalPage('tutor');
  return <PortalDashboard me={me} />;
}
