import { requirePortalPage } from '@/lib/portal';
import { OrgChallengesView } from '@/components/portal/OrgChallengesView';

export const dynamic = 'force-dynamic';
export default async function Page() { const me = await requirePortalPage('tutor'); return <OrgChallengesView me={me} />; }
