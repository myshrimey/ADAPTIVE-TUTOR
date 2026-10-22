// Server-side read of the language cookie, so the very first server-rendered
// HTML already matches the student's last choice (avoids an English flash
// before the client-side provider picks up the cookie).

import { cookies } from 'next/headers';
import type { Lang } from '@adaptive-tutor/core';

export async function getServerLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const value = cookieStore.get('sahayak_lang')?.value;
  return value === 'hi' ? 'hi' : 'en';
}

/** Language of a STUDENT's own reports: their saved report language, else the app language of this device (as before v56). Never throws. */
export async function getReportLang(studentId: string): Promise<Lang> {
  const device = await getServerLang();
  try {
    const { createServiceClient } = await import('@/lib/supabase-server');
    const { languagesForStudent } = await import('@adaptive-tutor/core');
    const r = await languagesForStudent(createServiceClient(), studentId, null);
    // Only the REPORT choice is read here; when unset it follows this device's app language.
    return (r.prefs.report ?? device) === 'hi' ? 'hi' : 'en';
  } catch { return device; }
}
