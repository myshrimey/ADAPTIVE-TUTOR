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
