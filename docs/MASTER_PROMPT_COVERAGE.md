# Master prompt coverage (evaluated 2026-10-16 after v37; Partly-built list updated 2026-10-17 for v38)

Method: the founder's pasted master prompt (54 sections) compared with the actual code and schema in this repository (read this session, not from memory). "Built" means present in code and built clean; the founder reports v34-v37 deployed and tested live, but what he tested is not itemised, so "Built" is not the same as "proven with real families".

## Built
- 1-2 Stack kept; commercial plans (founder's own plans replaced the single Rs 999 test; Free plan added v37).
- 4, 27, 45, 46 Principles: context affects intervention, evidence determines assessment; no labels, no diagnosing; RLS owner pattern; no secrets in browser; supportive wording.
- 6 Subject availability (READY / PILOT / IN DEVELOPMENT / COMING SOON) from `subjects.status`.
- 8 Content verification status (verified / needs_review / rejected; rejected never served). v36 adds teacher review and founder apply.
- 9 Board-readiness bands incl. "insufficient evidence", with reasons and a not-a-prediction statement (v35).
- 13-14 Pre-session check-in: all five questions with the prompt's options; stored with timestamp; confidence after captured.
- 15, 17 Confidence trend (latest / last / 7-day / 30-day / direction / chart / per subject) and before-vs-after change.
- 16 Confidence-vs-performance mismatch note (supportive wording).
- 19 Recovery mode (self-reported triggers, recorded).
- 21 Parent confidence view by subject.
- 28-29 Offline payment flow (claim, reference, pending / confirmed / rejected / refunded, no auto-grant) and offer page with included / not included.
- 33-34 Terms, privacy, scope limits, payment/refund policy, contact; English + Hindi UI separate from subject language.
- 36 Gate 9: access can be granted and revoked per student (`/admin/students`).
- 37 Diagnostic persistence bug found and fixed (v30: resume instead of orphan).
- 42 Project memory files exist (under the repo's own names).

## Partly built (all closed in v38, with the limits stated)
- 5 Onboarding: now asks exam year (2027/2028), preferred language, daily study time; board/class fixed to CBSE Class 10. Limit: no other boards or classes.
- 7 Question metadata: marks, expected time, cognitive level, language columns added; academic-year on curricula. Limit: marks and cognitive level are empty until teachers/founder set them; expected time is a planning default; no rubric.
- 10 Staged assessment: chapter check, subject check, full mock, board-style paper added. Limit: chapter/subject checks are practice measurements (do not change mastery); board-style = auto-marked sections only.
- 11 Error types: Science and Language tag sets added. Limit: only used as low-confidence hints when a question has no tags of its own.
- 12 Behaviour signals: answer time, unfinished sessions, study days, streak now measured and shown to parents. Limit: no data until sessions run after v38.
- 18 Session adaptation: available time and goal now set session length; revise/test_myself change the work.
- 19 Recovery mode: now also triggered by performance; the last question is an easier "success" question; recorded.
- 20 Parent dashboard: engagement (E) and assessment history (I) added, also on the parent link.
- 23 Subject matrix with recommended priority added. Limit: columns are coverage, band, last assessed, priority; separate concept/application/independent/timed columns are not shown.
- 24 Student dashboard: today's recommended session and streak.
- 30-33 Funnel and landing: /check (free, no sign-in), /sample-report, /about, /trust, /legal/refund. Limit: refund terms are a draft; new text is English only.
- 36 Quality gates: /admin/quality sign-offs and promote-to-ready. Limit: no subject has passed any gate yet; that needs people.

## Not built (after v39)
- 2 Hindi Course A vs B as distinct courses (only Hindi A); Sanskrit and other electives.
- Animated diagrams; teacher pay; automatic Excel tracker update.
## Built in v40 (was Not built)
- 9 Written-answer assessment: AI-suggested practice marks (`/written`), paid plans, not used for mastery or readiness yet. Teacher-pay counting and Excel CSV export.
## Built in v39 (was Not built)
- 22 "What changed in 30 days" report. 26, 47 Intervention-to-outcome summary (founder page, association only). 35 Founder metrics page. 42 DATABASE_SCHEMA.md, COMMERCIAL_METRICS.md.

## Built beyond the prompt (founder requests)
Teacher review area, three paid plans + free plan with enforcement, invitation-only accounts, AI usage/cost log, mock exams, Maths Basic, level-adaptive animations, FAQ.
Note: master prompt section 48 says do not overbuild; the plan/teacher/cost work serves revenue and content quality, but the next effort should go to the Partly-built parent value items.

## Suggested next build (highest value first; items 1 and 3 and 5 below are now done in v38)
1. 18/19: use available time and session goal; end recovery sessions with a success question (small, in-session value).
2. 22/23: "What changed in 30 days" and the full subject matrix with recommended priority (the parent-value core: "what changed, why, what next").
3. 31/30: sample readiness report, About and trust section, standalone refund/cancellation page.
4. 35: founder metrics page (activation, sessions per week, paid conversion).
5. 12/20E: response time, abandonment, return frequency in an engagement section.
