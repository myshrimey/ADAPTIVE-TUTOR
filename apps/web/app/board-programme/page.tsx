import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { hasFeature } from '@adaptive-tutor/core';
import { loadPremiumData } from '@/lib/premium';
import { getReportLang } from '@/lib/language';
import { Locked } from '@/components/premium/Locked';
import { ProgrammeView } from '@/components/premium/Views';

export const dynamic = 'force-dynamic';
export default async function Page() {
  let studentId: string;
  try { studentId = await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  if (!(await hasFeature(createServiceClient(), studentId, 'board_preparation_programme'))) return <Locked feature="board_preparation_programme" />;
  const d = await loadPremiumData(await createServerClient(), studentId, await getReportLang(studentId));
  return <ProgrammeView programme={d.programme} backHref="/report" boardLabel={d.settings.boards.board1_label} two={d.twoProgramme} />;
}
