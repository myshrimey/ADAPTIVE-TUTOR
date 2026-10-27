import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { Section } from '@/components/founder/Cards';

export const dynamic = 'force-dynamic';

type S = 'BUILT' | 'PARTIAL' | 'NOT IMPLEMENTED' | 'REQUIRES PROVIDER';
// Checked against the code and migrations on 2026-10-26 (v67). "BUILT" means present and type-checked; it does not mean proven with real families.
const ROWS: [string, string, S, string][] = [
  ['3, 38, 39', 'One student model; evidence from every source', 'PARTIAL', 'Mastery, confidence, misconceptions, diagnostics, quizzes, mocks and handwriting all write to the same student records. There is no single "evidence fusion" layer that weighs voice, typed and handwritten evidence together.'],
  ['4-5', 'Adaptive diagnostic and baseline (goes down to earlier classes)', 'BUILT', 'v62: Class 6-9 foundation graph for Maths; other subjects still need their earlier-class graphs; teacher review of the graph pending.'],
  ['6', 'Learning strategy orchestrator', 'PARTIAL', 'A rule-based engine picks among 11 teaching moves (explain, example, guided practice, Socratic, hint, simplify, prerequisite repair, review, challenge, test…). The prompt lists 25 methods; the rest (for example interleaving, self-explanation, project learning) are not selected by any rule.'],
  ['7', 'Full learning loop', 'PARTIAL', 'Diagnose, explain, practise, quiz, mock, report, spaced review (v68), staged support (v70) and mixed practice (v70) exist. Teach Sahayak, voice and per-error intervention recipes do not.'],
  ['8', 'Error intelligence', 'PARTIAL', 'Error types are tagged (Maths, Science, Language sets). A matching intervention recipe for each error ("2 worked examples + 3 guided problems…") is not built.'],
  ['9', 'Mastery states', 'PARTIAL', 'Mastery score with evidence labels and readiness bands. The six named states (Not yet demonstrated … Mastered) are not a configurable setting.'],
  ['10', 'Spaced revision scheduler', 'BUILT', 'NEW in v68: each skill comes back after 1, 3, 7, 14, 30, 60 days (sooner after a miss; never after the exam date); daily, weekly, long-gap and pre-exam (last 21 days) views; /review page; questions not seen before come first and skills are mixed across chapters. Rules only, no AI. Not yet tried with real students.'],
  ['11', 'Interleaving engine', 'PARTIAL', 'NEW in v70: an optional "mixed practice" block on Revise today mixes skills the student already handles (mastery 60+, not due, not recently forgotten) across different chapters. Interleaving inside the AI tutor chat and within a new topic is not built (the prompt says focus first).'],
  ['12', 'Worked example and fading-support engine', 'BUILT', 'NEW in v70: five support levels (full worked example, partly blank example, guided, hint only, independent) chosen by rules from mastery and this session\'s answers; support fades after two clean answers and returns after a miss. The rule is sent to the tutor as an instruction; how well the AI follows it depends on the model and has not been checked with real students.'],
  ['13', 'Metacognition prompts and calibration', 'PARTIAL', 'Pre-session confidence check-in, confidence trend and a gentle confidence-vs-result note. Per-question "how confident are you?" is not built.'],
  ['14', 'Teach Sahayak mode', 'NOT IMPLEMENTED', 'Needs an AI call per explanation; decide the cost first.'],
  ['15-16', 'Voice Sahayak (speaking and listening)', 'REQUIRES PROVIDER', 'Only "read aloud" using the browser exists. Listening to a student needs a speech-to-text choice and a cost budget; none is set up or tracked.'],
  ['17', 'Visual learning', 'PARTIAL', 'Diagrams and level-adaptive animations exist; maps, graphs and charts per subject are not built.'],
  ['18', 'Handwritten mock evaluation', 'BUILT', 'Rs 499 unit, per-evaluation cost and margin check. Photo question/answer bank stays OFF until your lawyer approves the wording.'],
  ['19-20', 'Parent intelligence and next-best action', 'BUILT', 'Parent view, 30-day change report, confidence trend, readiness band, next step.'],
  ['21-24', 'Tutor and coaching-centre intelligence', 'PARTIAL', 'NEW in v69: "Who needs my attention" (ranked, with evidence and a suggested action), batches with common gaps, and intervention tracking (problem, evidence, action, result after 5+ days) for tutors and centres, limited to students who linked with their own code. Rules only, advisory. Not built: assigning work to a batch, tutor-under-centre hierarchy, centre heat-map, parent-report generator, parent view of what the tutor planned.'],
  ['25, 44', 'Roles, privacy, audit', 'PARTIAL', 'Student, parent, tutor, teacher, centre and admin roles with row-level security; AI keys server-side; export/delete. No School Admin role. Audit log covers newer admin actions only.'],
  ['26-30', 'Feedback intelligence and human review gate', 'PARTIAL', 'NEW in v67: messages are sorted by rules into groups with severity and risk; five review buttons; approve needs a note and a "tested" tick for high-risk groups. Not built: AI-written fix proposals, link to the exact question reported, automatic deployment (deliberately none).'],
  ['31-35', 'AI router, fallback, ledger, economics', 'BUILT', 'Providers and prices are settings. Nothing about any provider\'s free tier or price is verified: check each one yourself.'],
  ['36-37', 'Engagement without addiction', 'BUILT', 'Streaks, missions, badges, improvement-based leaderboard with privacy choice, Challenge zone.'],
  ['40', 'Exam readiness', 'BUILT', 'Bands with evidence, remaining gaps and a not-a-prediction statement. Exam dates only from the "boards" setting.'],
  ['41-42', 'Multi-board and language architecture', 'PARTIAL', 'Board/class/subject tables and four independent language choices exist. No "add a board" wizard; no ICSE or state-board content.'],
  ['45', 'Founder Command Centre', 'BUILT', 'v67 adds the grouped menu.'],
  ['46', 'Experiments', 'PARTIAL', 'Engagement A/B only; no tests of diagnostic length, strategies or voice-vs-text.'],
  ['47', 'Safety wording', 'BUILT', 'No labels, no predictions of marks, "Insufficient data" shown instead of guessing.'],
  ['55-56', 'Live test of every journey, role-boundary test', 'NOT IMPLEMENTED', 'Never run against live Supabase, a live AI provider, or two real accounts. The two-account privacy test is still outstanding and blocks real payments.'],
];

const COLOR: Record<S, string> = { BUILT: '#3f7a5c', PARTIAL: '#c8811f', 'NOT IMPLEMENTED': '#b5533c', 'REQUIRES PROVIDER': '#7a5ea8' };

export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const count = (s: S) => ROWS.filter((r) => r[2] === s).length;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>What is built, and what is not</h1>
        <p style={{ color: 'var(--slate)' }}>Honest status of the “Learning Intelligence Platform” prompt. Checked against the code on 2026-10-26. Signed in as {g.email}.</p>
        <AdminNav />
        <p>{(['BUILT', 'PARTIAL', 'NOT IMPLEMENTED', 'REQUIRES PROVIDER'] as S[]).map((s) => <span key={s} style={{ marginRight: '1rem', color: COLOR[s], fontWeight: 600 }}>{s}: {count(s)}</span>)}</p>
      </div>
      <Section title="Prompt section by section" hint="Nothing marked BUILT has been tested with real families yet.">
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Sections</th><th>What</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>{ROWS.map(([sec, what, st, note]) => (
            <tr key={sec + what} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
              <td style={{ padding: '0.4rem 0.4rem 0.4rem 0' }}>{sec}</td><td style={{ paddingRight: '0.6rem' }}>{what}</td>
              <td style={{ color: COLOR[st], fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '0.6rem' }}>{st}</td><td>{note}</td>
            </tr>))}</tbody>
        </table></div>
      </Section>
      <Section title="Suggested order for the missing parts">
        <ol style={{ paddingLeft: '1.2rem' }}>
          <li>Per-error intervention recipes (each error type gets a ready plan: examples, guided problems, later review) - rules only.</li>
          <li>Giving work to a whole batch; a tutor working under a centre; centre heat-map; parent report generator.</li>
          <li>Teach Sahayak and Voice: decide the AI cost budget first; both need a provider.</li>
        </ol>
      </Section>
    </div></main>
  );
}
