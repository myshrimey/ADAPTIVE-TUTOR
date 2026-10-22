import { redirect } from 'next/navigation';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';

/** For student pages: the signed-in student (from the session) and a server client, or a redirect to sign-in / device limit. */
export async function studentPage() {
  let studentId: string;
  try { studentId = await getCurrentStudentId(); } catch (e: any) { redirect(e?.message === 'device_limit' ? '/device-limit' : '/'); }
  return { studentId, service: createServiceClient() };
}
