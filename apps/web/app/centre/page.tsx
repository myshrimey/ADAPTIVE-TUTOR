import { requirePortalPage } from '@/lib/portal';
import { PortalDashboard } from '@/components/portal/PortalDashboard';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const me = await requirePortalPage('centre');
  return (<><PortalDashboard me={me} /><p className="shell shell--narrow" style={{ textAlign: 'center' }}><a href="/centre/invitations">Invite students, teachers and tutors to your centre</a></p></>);
}
