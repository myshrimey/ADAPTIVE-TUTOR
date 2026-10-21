import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { hasFeature } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { loadPremiumData } from '@/lib/premium';
import { Locked } from '@/components/premium/Locked';
import { ReadinessView } from '@/components/premium/Views';
import { TrackView } from '@/components/commerce/TrackView';

export const dynamic = 'force-dynamic';
export default async function Page() {
  let studentId: string;
  try { studentId = await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  if (!(await hasFeature(createServiceClient(), studentId, 'board_readiness'))) return <Locked feature="board_readiness" />;
  const lang = await getServerLang();
  const d = await loadPremiumData(await createServerClient(), studentId, lang === 'hi' ? 'hi' : 'en');
  return (<><TrackView event="readiness_report_viewed" source="board_readiness" /><ReadinessView report={d.report} weak={d.weak} lang={lang === 'hi' ? 'hi' : 'en'} heading="Board Readiness report" backHref="/report" /></>);
}
