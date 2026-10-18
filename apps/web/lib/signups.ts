import { DEFAULT_DAILY_SIGNUP_CAP } from '@adaptive-tutor/core';

/** Self sign-up is open unless the founder sets SIGNUPS_OPEN=false in Vercel. */
export function signupsOpen(): boolean {
  return process.env.SIGNUPS_OPEN !== 'false';
}

export function dailySignupCap(): number {
  const n = Number(process.env.SIGNUP_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_SIGNUP_CAP;
}
