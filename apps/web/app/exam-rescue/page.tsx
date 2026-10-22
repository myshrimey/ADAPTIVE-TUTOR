import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { hasFeature } from '@adaptive-tutor/core';
import { loadPremiumData } from '@/lib/premium';
import { getReportLang } from '@/lib/language';
import { Locked } from '@/components/premium/Locked';
import { RescueView } from '@/components/premium/Views';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  let studentId: string;
  try { studentId = await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  if (!(await hasFeature(createServiceClient(), studentId, 'exam_rescue'))) return <Locked feature="exam_rescue" />;
  const days = (await searchParams).days === '14' ? 14 : 7;
  const d = await loadPremiumData(await createServerClient(), studentId, await getReportLang(studentId));
  return <RescueView plan={d.rescue(days)} days={days} backHref="/report" pathBase="/exam-rescue?" />;
}
