# Interleaving inside the tutor chat: design (v114)

**Status: rules written and tested (packages/core/pedagogy/interleave.ts). NOT connected to the tutor. Switch `INTERLEAVE_ENABLED` is false.** Reason: connecting it changes the answer loop in `orchestrator/tutor.orchestrator.ts`, which cannot be tested here without the live AI and database. Wiring needs a supervised trial; nothing below has been seen working with a real student.

## What it is
Practice that stays on one skill for many questions feels easy but fades fast. Interleaving mixes in one question from a different skill the student already handles. Today only `/review` has a light version ("mixed practice"). This adds it inside a learning session.

## Rules (all in the tested pure file)
- Only while practising (GUIDED_PRACTICE or SOCRATIC); never repair, remediation, review, test, challenge, a student command, the last question, a gentler session, or goal "test myself".
- Only on the 3rd, 8th, 13th... answer; only if the last answer was right with no hint; only when current mastery is 50 to 89.
- The skill comes from `pickInterleaveSkill`: recorded mastery 60+, not the current skill, not retired, seen before; a different chapter first, then the longest unseen.

## Where it would be wired (exact places)
1. `tutor.orchestrator.ts` near line 437, right after `selectEnrichment`: compute the candidate from `state.masteryBySkill` (needs skill name, chapter, retired flag, last-seen from `last10Attempts` or a query) and call `shouldInterleave`.
2. A new strategy `INTERLEAVE` must be added to `PedagogyStrategy`, `QUESTION_STRATEGIES`, the admin metrics label map (`apps/web/app/admin/metrics/page.tsx`) and `STRATEGY_INSTRUCTION` if wording is needed.
3. `selectQuestion` (line ~462) must be called with the candidate's skill id, name and mastery instead of `question.skill_id`.
4. **The next turn is the dangerous part.** After the student answers, the loop uses `question.skill_id` for misconception, mastery update (correct for the interleaved skill) AND to choose the following question (wrong: it would stay on the mixed-in skill). It must go back to the session's current skill. Needs a marker that the answered question was interleaved (a field in `learning_events` payload or the active-question state) so "which skill continues" is not guessed.
5. The interleaved answer must not count toward the current skill's `history` for session targets and the recovery trigger (a miss on an old skill must not make the session "gentler" or end it early).

## Rules it must keep (from CLAUDE.md)
- The AI executes, never chooses (rule picks the skill and the turn).
- Answer is ordinary evidence for ITS OWN skill only; never writes the current skill's mastery; no XP.
- Never shown as a test or a label; the student is told plainly: "A quick one from earlier, to keep it fresh."
- Retired skills never appear. Students with no skill at 60+ get no interleaving.
- Hindi/English follows the learning-language choice already used by the question pose.

## Trial plan before switching on
Run with 3 to 5 real or staff-test sessions on a staging copy, check: the next question returns to the current skill; session length counts correctly; revision dates for the mixed-in skill move as for any answer; recovery does not trigger from an interleaved miss. Then set the switch to true in one small delivery.

## Not decided (founder)
Whether the "every 5th answer" rhythm is right; whether free-plan students get it.
