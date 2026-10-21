// Data minimisation: remove contact details before text leaves for an outside AI company. Names are not added to prompts by the app.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+?91[\s-]?)?(?<!\d)[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const LONG_ID = /(?<!\d)\d{12}(?!\d)/g; // 12-digit ID-style numbers (e.g. Aadhaar-like)
export function minimiseText(s: string): string {
  return (s ?? '').replace(EMAIL, '[email removed]').replace(PHONE, '[phone removed]').replace(LONG_ID, '[number removed]');
}
