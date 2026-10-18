/** Date and time in India, e.g. "18 Oct 2026, 5:42 pm". */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}
export function fmtScore(score: number | null, total: number | null, inMarks: boolean): string {
  if (score === null || total === null || !(total > 0)) return 'Score pending';
  const pct = Math.round((Number(score) / Number(total)) * 100);
  return `${Number(score)} / ${Number(total)}${inMarks ? ' marks' : ''} (${pct}%)`;
}
export function fmtDuration(sec?: number): string | null {
  if (sec === undefined || sec === null) return null;
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m} min ${s} s`;
}
