import { requirePortalPage } from '@/lib/portal';
import { GroupBaselineView } from '@/components/baseline/GroupBaselineView';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const me = await requirePortalPage('tutor');
  return <GroupBaselineView me={me} />;
}
