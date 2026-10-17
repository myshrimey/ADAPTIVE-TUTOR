# Commercial metrics: how each number on /admin/metrics is worked out

Page: `/admin/metrics` (founder only). Code: `packages/core/metrics/founder-metrics.ts`. Counts and averages only; no names, answers or private text.

| Metric | Meaning | How it is counted |
|---|---|---|
| Students | Accounts you have created | rows in `students` |
| Finished a diagnostic | Activation: the student really started | distinct students with a `completed` diagnostic attempt, divided by all students |
| Active, last 7 / 30 days | Students using it | distinct students with a learning session started in the window |
| Sessions, last 7 days | Volume | learning sessions started in the window |
| Sessions per active student (30 days) | Depth of use | sessions in 30 days / students active in 30 days |
| Sessions finished (30 days) | Does a session get to the end | sessions with status `completed` / sessions started |
| Came back within 7 days | Early retention | of students whose FIRST session was 7+ days ago, the share who had another session between 12 hours and 7 days after it |
| Confirmed payments / amount | Money received | `pilot_payments` with status `confirmed` (the manual claim list; only you can confirm) |
| Waiting for you to verify | Work for you | payments with status `pending` |
| On a paid plan / Free plan | Conversion mix | `student_access.plan_code` (anything except `free` counts as paid or early access) |
| Content: verified / needs review / rejected | Question-bank trust | `diagnostic_questions.content_status` per subject |
| Gates | Subject quality | `subject_gate_signoffs` passed, out of 10 |
| What seems to help | Intervention to outcome | per teaching move (or gentler pace), the average change in mastery of the session's skill between session start and end, over finished sessions of the last 90 days; shown only from 5 sessions |

## Cautions
- "What seems to help" shows association, not cause. A session where a student needed a hint is not comparable to one where they did not.
- The paid count includes early-access (grandfathered) students until you give them real plans.
- Revenue here is manual claims, not a payment gateway. Recurring-revenue figures (monthly total, churn) need plan start/end dates per student, which `/admin/students` holds; they are not computed on this page yet.
- AI cost per student and per month: `/admin/ai-costs`.
- Excel tracker: not updated automatically; copy the weekly numbers by hand.
