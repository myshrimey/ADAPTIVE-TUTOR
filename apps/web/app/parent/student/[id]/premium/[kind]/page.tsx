import { notFound } from 'next/navigation';
import { requirePortalPage, isLinked } from '@/lib/portal';
import { createServiceClient } from '@/lib/supabase-server';
import { hasFeature } from '@adaptive-tutor/core';
import { loadPremiumData } from '@/lib/premium';
import { getServerLang } from '@/lib/language';
import { Locked } from '@/components/premium/Locked';
import { ReadinessView, RescueView, ProgrammeView } from '@/components/premium/Views';

export const dynamic = 'force-dynamic';
const MAP = { readiness: 'board_readiness', rescue: 'exam_rescue', programme: 'board_preparation_programme' } as const;

// A parent sees the paid reports of a LINKED child. Access is the child's plan (the child or the family bought it).
export default async function Page({ params, searchParams }: { params: Promise<{ id: string; kind: string }>; searchParams: Promise<{ days?: string }> }) {
  const me = await requirePortalPage('parent');
  const { id, kind } = await params;
  if (!(kind in MAP) || !(await isLinked(me, id))) notFound();
  const feature = MAP[kind as keyof typeof MAP];
  const service = createServiceClient();
  if (!(await hasFeature(service, id, feature))) return <Locked feature={feature} who="your child" />;
  const lang = (await getServerLang()) === 'hi' ? 'hi' : 'en'; // the parent's own app language
  const d = await loadPremiumData(service, id, lang); // service client: this parent is verified as linked to this child above
  const back = '/parent';
  if (kind === 'readiness') return <ReadinessView report={d.report} weak={d.weak} lang={lang} twoBoard={d.twoBoard} heading="Board Readiness report" backHref={back} />;
  if (kind === 'rescue') { const days = (await searchParams).days === '14' ? 14 : 7; return <RescueView plan={d.rescue(days)} days={days} backHref={back} pathBase={`/parent/student/${id}/premium/rescue?`} />; }
  return <ProgrammeView programme={d.programme} backHref={back} boardLabel={d.settings.boards.board1_label} two={d.twoProgramme} />;
}
