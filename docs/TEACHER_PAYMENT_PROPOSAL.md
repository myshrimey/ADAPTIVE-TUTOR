# Teacher payment — proposal for founder review (v43)

Status: PROPOSAL ONLY. Nothing here is built into the app, and no rate below is a market fact. Every rupee figure is a starting number for you to change. Sahayak does not pay anyone automatically; payments stay offline.

## What teachers do (three kinds of work)
1. Question review: check an AI-written question, answer key and explanation (accept, fix, or reject). One-time, per question.
2. Handwritten-answer feedback (planned, v44+): check or correct the AI's marks on a photo of a student's written answer. Recurring, per page.
3. Content authoring: write new questions or notes in a subject. Occasional.

## Suggested pay model: per unit of work, paid monthly, with a cap
| Work | Suggested starting rate (Rs) | Notes |
|---|---|---|
| Question review (MCQ) | 3 per question | about 20 questions per 10 minutes is a realistic pace to test first |
| Question review (short/long answer) | 6 per question | needs marking-scheme check |
| Handwritten page feedback | 15 per page | only if the teacher corrects or confirms marks and adds one comment |
| New question written (with answer + explanation) | 10 per question | accepted ones only |
| Hindi question review (Devanagari) | same as above | needs a Hindi teacher, pay the same rate |

Why per unit: the pay follows work done, it cannot grow faster than you approve, and the app already counts reviews (`content_reviews`).

## Cost guard so the programme stays affordable
- Total teacher cost in a month should stay under a fixed share of that month's confirmed revenue. Starting suggestion: 20%. You set the number.
- Example (illustration only): 25 founding families at Rs 4,999 = Rs 1,24,975 revenue. 20% = about Rs 25,000 for teachers for the whole season, not per month. The same cap with 25 families at Rs 14,999 is about Rs 75,000.
- If the cap is reached, reviews pause until next month or you raise it.

## Quality rules (so paying per unit does not reduce quality)
- A teacher's accepted/rejected ratio is tracked. A sample of 1 in 10 reviews is double-checked by a second teacher before payment.
- AI-vs-teacher agreement on handwritten marking is tracked per teacher. Pay is not reduced for disagreeing with the AI; it is reduced only if a second teacher repeatedly finds the teacher's own marks wrong.
- Teachers see only anonymised work (no child name, school, city). They sign a short confidentiality note first.

## What I need from you to finalise
1. Are teachers freelancers paid per task, or part-time on a monthly amount?
2. The monthly cap percentage (or rupee amount).
3. Whether the Rs 14,999 plan includes teacher-checked handwriting feedback, and how many pages per student. That decides the main teacher cost.
4. TDS/GST treatment for payments — ask your accountant. Not decided here.
5. Which teachers: Hindi, English, Social Science first (their banks are smallest and not yet reviewed).

## Not yet built
Teacher earnings tracking, payment export and a second-teacher sample check. Say yes and I will build a simple monthly review-count sheet under `/admin/funnel` first, so you pay from counts the app already holds.
