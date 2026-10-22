// Leaderboards are optional and show nicknames only. Ranks use learning measures (never time spent, clicks or logins).
const ADJ = ['Curious', 'Bright', 'Steady', 'Swift', 'Calm', 'Bold', 'Keen', 'Clever', 'Brave', 'Sunny', 'Quiet', 'Eager'];
const NOUN = ['Fox', 'Owl', 'Tiger', 'Panda', 'Falcon', 'Otter', 'Lion', 'Heron', 'Koala', 'Dolphin', 'Peacock', 'Cheetah'];
export function suggestNickname(seed = Math.random()): string { const a = ADJ[Math.floor(seed * 997) % ADJ.length], n = NOUN[Math.floor(seed * 7919) % NOUN.length]; return `${a} ${n} ${10 + (Math.floor(seed * 100000) % 90)}`; }
const BAD = ['fuck', 'shit', 'bitch', 'sex', 'porn', 'nude', 'rape', 'dick', 'ass', 'bastard', 'chut', 'gand', 'lund', 'madar', 'bhosd', 'randi'];

/** A nickname must not reveal who the child is: no contact details, no long numbers, no part of their real name, nothing rude. */
export function checkNickname(raw: unknown, realName: string | null): { ok: true; value: string } | { ok: false; error: string } {
  const v = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (v.length < 3 || v.length > 20) return { ok: false, error: 'Use 3 to 20 characters.' };
  if (!/^[A-Za-z0-9 ]+$/.test(v)) return { ok: false, error: 'Use only letters, numbers and spaces.' };
  if (/\d{4,}/.test(v.replace(/\s/g, ''))) return { ok: false, error: 'Please do not use a long number.' };
  const low = v.toLowerCase().replace(/\s/g, '');
  if (BAD.some((b) => low.includes(b))) return { ok: false, error: 'Please choose a different nickname.' };
  for (const part of String(realName ?? '').toLowerCase().split(/\s+/).filter((p) => p.length >= 3)) if (low.includes(part)) return { ok: false, error: 'Your nickname should not contain your real name.' };
  return { ok: true, value: v };
}

export interface WeeklyStat { studentId: string; nickname: string; attempts: number; accuracy: number | null; prevAccuracy: number | null; mistakesCorrected: number; activeDays: number; challengesDone: number }
export interface BoardRow { rank: number; nickname: string; you: boolean; value: number; unit: string }
export interface BoardView { topScore: BoardRow[]; mostImproved: BoardRow[]; consistency: BoardRow[]; mistakes: BoardRow[]; members: number; hidden: boolean; note: string }
const MIN_ATTEMPTS_FOR_ACCURACY = 3;

function rankBy(rows: { s: WeeklyStat; v: number }[], me: string, unit: string, limit = 10): BoardRow[] {
  return rows.sort((a, b) => b.v - a.v).slice(0, limit).map((r, i) => ({ rank: i + 1, nickname: r.s.nickname, you: r.s.studentId === me, value: Math.round(r.v * 10) / 10, unit }));
}
/** Builds the four views. Hidden until enough students joined, so a board never singles out one child. No student ids or real names leave this function. */
export function composeBoard(stats: WeeklyStat[], me: string, minMembers: number): BoardView {
  if (stats.length < minMembers) return { topScore: [], mostImproved: [], consistency: [], mistakes: [], members: stats.length, hidden: true, note: `This board appears when at least ${minMembers} students have joined.` };
  const scored = stats.filter((s) => s.accuracy !== null && s.attempts >= MIN_ATTEMPTS_FOR_ACCURACY);
  return {
    topScore: rankBy(scored.map((s) => ({ s, v: s.accuracy as number })), me, '% correct'),
    mostImproved: rankBy(stats.filter((s) => s.accuracy !== null && s.prevAccuracy !== null && s.attempts >= MIN_ATTEMPTS_FOR_ACCURACY).map((s) => ({ s, v: (s.accuracy as number) - (s.prevAccuracy as number) })).filter((r) => r.v > 0), me, 'points'),
    consistency: rankBy(stats.filter((s) => s.activeDays > 0).map((s) => ({ s, v: s.activeDays })), me, 'study days'),
    mistakes: rankBy(stats.filter((s) => s.mistakesCorrected > 0).map((s) => ({ s, v: s.mistakesCorrected })), me, 'corrected'),
    members: stats.length, hidden: false, note: 'Based on the last 7 days. Top Score needs at least 3 rounds. Time spent, clicks and logins are never used.',
  };
}
