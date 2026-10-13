// Single configurable source for founder attribution — per the brief's
// "create a single configurable source ... so future corrections do not
// require editing every page manually." Used by the Footer and nowhere else.
//
// IMPORTANT: the exact wording below is a DRAFT pending the founder's
// explicit approval (see docs/DECISIONS.md and docs/RESUME_HERE.md). Nothing
// here claims a degree, certification, or institutional affiliation that
// hasn't been independently confirmed — only name, a provisional title, and
// a restrained, non-promotional line, because this environment could not
// access/verify the supplied LinkedIn profile.

export interface FounderInfo {
  name: string;
  title: string;
  attributionLine: string;
  contactPhone: string;
}

export const FOUNDER: FounderInfo = {
  name: 'Dr. Arvind Tiwari',
  title: 'Founder & Product Builder',
  // Restrained, academic, non-promotional — a plain statement of who built
  // it, not a credentials list. Swap this line (and only this line) once
  // the founder approves exact wording/credentials.
  attributionLine: 'Sahayak | Built by Dr. Arvind Tiwari, Founder & Product Builder',
  contactPhone: '9810896082',
};
