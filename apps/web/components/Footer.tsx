import { FOUNDER, t } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { LanguageToggle } from './LanguageToggle';

// Shown on every page (wired into layout.tsx) — including the sign-in/sign-up
// page, where it was specifically asked for. Deliberately kept to stable,
// structural facts about the CBSE Class 10 exam (the marks split and
// question-type mix), not anything date-specific like this year's exact
// datesheet, which changes annually and this app has no live source for —
// that's what the official-site links are for.
//
// Also carries: the language toggle, legal-page links, and the founder
// attribution line (brief Sections 4-6) — all from a single configurable
// source (packages/core/branding/founder.ts and i18n/dictionary.ts) rather
// than hand-written per page, and kept secondary (small, bottom of page)
// to the learning content above it, per the brief's "keep attribution
// secondary to the learning experience."
export async function Footer() {
  const lang = await getServerLang();
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div className="site-footer__col">
          <p className="site-footer__heading">About Sahayak</p>
          <p className="site-footer__body">
            An adaptive 1-to-1 tutor for CBSE Class 10 — a short diagnostic finds where your
            understanding actually starts to wobble, then every session teaches and questions
            you right at that level, not a one-size-fits-all lesson.
          </p>
        </div>

        <div className="site-footer__col">
          <p className="site-footer__heading">CBSE Class 10 exam, at a glance</p>
          <ul className="site-footer__list">
            <li>Most subjects split 80 marks theory + 20 marks internal assessment.</li>
            <li>You need at least 33% in the theory part and 33% overall to pass each subject.</li>
            <li>Board papers mix roughly 50% competency-based, 20% MCQ, and 30% short/long-answer questions.</li>
          </ul>
          <p className="site-footer__note">
            That competency-based, mixed-question-type pattern is exactly why Sahayak's practice
            questions and quizzes mix MCQ, numeric, and short-answer types too.
          </p>
        </div>

        <div className="site-footer__col">
          <p className="site-footer__heading">What's covered here</p>
          <ul className="site-footer__list">
            <li>Maths — 14 chapters, Real Numbers through Probability.</li>
            <li>Science — 10 chapters across Physics, Chemistry, and Biology.</li>
            <li>Pilot (questions still being reviewed): Social Science, English Language &amp; Literature, Hindi Course A, Computer Applications.</li>
          </ul>
          <p className="site-footer__note">Each subject's status is shown wherever you choose it.</p>
        </div>

        <div className="site-footer__col">
          <p className="site-footer__heading">Official resources</p>
          <ul className="site-footer__list">
            <li>
              <a href="https://www.cbse.gov.in" target="_blank" rel="noopener noreferrer">
                cbse.gov.in
              </a>{' '}
              — the official CBSE site
            </li>
            <li>
              <a href="https://cbseacademic.nic.in" target="_blank" rel="noopener noreferrer">
                cbseacademic.nic.in
              </a>{' '}
              — current syllabus &amp; sample papers
            </li>
          </ul>
          <p className="site-footer__note">
            Always check the official CBSE site for this year's exact syllabus, datesheet, and
            marking scheme — the structure above is stable, but specifics are set fresh every year.
          </p>
        </div>
      </div>

      <div className="shell site-footer__legal-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', fontSize: '0.8rem' }}>
          <a href="/legal/terms">{t('legal.terms', lang)}</a>
          <a href="/legal/privacy">{t('legal.privacy', lang)}</a>
          <a href="/legal/pilot-limitations">{t('legal.pilotLimitations', lang)}</a>
          <a href="/legal/payment-policy">{t('legal.paymentPolicy', lang)}</a>
          <a href="/contact">{t('legal.contact', lang)}</a>
        </nav>
        <LanguageToggle />
      </div>

      <div className="shell">
        <p className="site-footer__fine-print">
          Sahayak is an independent learning tool and isn't affiliated with or endorsed by CBSE.
        </p>
        <p className="site-footer__fine-print">{FOUNDER.attributionLine}</p>
      </div>
    </footer>
  );
}
