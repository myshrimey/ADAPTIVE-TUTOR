// Shown on every page (wired into layout.tsx) — including the sign-in/sign-up
// page, where it was specifically asked for. Deliberately kept to stable,
// structural facts about the CBSE Class 10 exam (the marks split and
// question-type mix), not anything date-specific like this year's exact
// datesheet, which changes annually and this app has no live source for —
// that's what the official-site links are for.
export function Footer() {
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
          </ul>
          <p className="site-footer__note">Social Science content is on the way.</p>
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

      <div className="shell">
        <p className="site-footer__fine-print">
          Sahayak is an independent learning tool and isn't affiliated with or endorsed by CBSE.
        </p>
      </div>
    </footer>
  );
}
