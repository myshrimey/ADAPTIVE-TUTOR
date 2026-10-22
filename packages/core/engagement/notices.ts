// In-app prompts only. No push, email, SMS or WhatsApp is sent. The list is capped by the founder's daily limit, in a fixed priority order, so it can never turn into spam.
export interface NoticeInput { missionReady: boolean; missionStarted: boolean; openMistakes: number; bestToBeat: { subject: string; value: number } | null; activeDaysThisWeek: number; weeklyGoalDays: number; dayOfWeek: number; max: number }
export const WEEKLY_GOAL_DAYS = 4;
export function composeNotices(i: NoticeInput): string[] {
  const out: string[] = [];
  if (i.missionReady && !i.missionStarted) out.push('Your daily mission is ready.');
  if (i.openMistakes > 0) out.push(`You have ${i.openMistakes} mistake${i.openMistakes === 1 ? '' : 's'} waiting for review.`);
  if (i.bestToBeat) out.push(`Can you beat your previous best of ${i.bestToBeat.value}% in ${i.bestToBeat.subject}?`);
  // Only late in the week, and only as a gentle count, never as a failure.
  if (i.dayOfWeek >= 4 && i.activeDaysThisWeek < i.weeklyGoalDays) out.push(`You have studied on ${i.activeDaysThisWeek} of ${i.weeklyGoalDays} days this week. A short session still counts.`);
  return out.slice(0, Math.max(0, i.max));
}
