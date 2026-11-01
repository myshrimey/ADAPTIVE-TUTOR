import { fakeDb } from './fakedb2';
import { attentionFor, rankAttention, summariseBatch, interventionResult, ATTENTION_LABEL } from '../packages/core/attention/rules';
import { attentionBoard, createBatch, setBatchMember, archiveBatch, listBatches, createIntervention, updateIntervention, measureInterventions, linkedStudents } from '../packages/core/attention/store';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const sig = (o: any = {}) => ({ studentId: 's', name: 'A', skillsWithEvidence: 8, averageMastery: 70, daysSinceActive: 1, sessions14d: 4, weakSkills: [], strongSkills: 2, overdueReviews: 0, lapses: 0, ...o });
const weak = (n: string, score = 20) => ({ skillId: 'k-' + n, name: n, score });

// ---- rules
ok(attentionFor(sig({ skillsWithEvidence: 1, sessions14d: 0, averageMastery: null, daysSinceActive: null })).kind === 'no_data', 'no data when nothing practised');
ok(attentionFor(sig({ skillsWithEvidence: 2, sessions14d: 0, averageMastery: 20 })).kind === 'no_data', 'few skills + no sessions → no data, not a verdict');
const a1 = attentionFor(sig({ averageMastery: 35, daysSinceActive: 16, weakSkills: [weak('Quadratics', 12), weak('Ratios', 30)] }));
ok(a1.kind === 'intervene' && a1.priority >= 40 && a1.focusSkill?.name === 'Quadratics', 'struggling + inactive → intervene, weakest skill first');
ok(/Quadratics/.test(a1.suggestion) && /20-minute/.test(a1.suggestion), 'suggestion names the skill');
ok(attentionFor(sig({ averageMastery: 50, daysSinceActive: 2 })).kind === 'watch', 'middling → watch');
ok(attentionFor(sig()).kind === 'on_track', 'fine → on track');
ok(attentionFor(sig({ averageMastery: 82, strongSkills: 7 })).kind === 'ready_for_advanced', 'strong → ready for harder work');
ok(attentionFor(sig({ averageMastery: 82, strongSkills: 7, daysSinceActive: 20 })).kind !== 'ready_for_advanced', 'strong but absent is not "ready"');
const inactiveOnly = attentionFor(sig({ daysSinceActive: 9 }));
ok(inactiveOnly.kind === 'watch' && /Check in kindly/.test(inactiveOnly.suggestion), 'inactive only → kind check-in');
for (const k of Object.values(ATTENTION_LABEL)) ok(!/weak student|failing|slow learner|poor|bad|lazy|stupid|rank/i.test(k), 'label is supportive: ' + k);
for (const a of [a1, inactiveOnly]) ok(!/weak student|failing|lazy|predict|will score/i.test(a.suggestion + a.reasons.join()), 'no labels or predictions in text');
const ranked = rankAttention([attentionFor(sig({ studentId: '1', name: 'Z' })), a1, attentionFor(sig({ studentId: '3', name: 'B', averageMastery: 50 })), attentionFor(sig({ studentId: '4', name: 'N', skillsWithEvidence: 0, sessions14d: 0, averageMastery: null, daysSinceActive: null }))]);
ok(ranked[0].kind === 'intervene' && ranked[1].kind === 'watch' && ranked[ranked.length - 1].kind === 'on_track', 'ranked: intervene, watch, … on track last');
const sg = [sig({ studentId: '1', weakSkills: [weak('Ratios')] }), sig({ studentId: '2', weakSkills: [weak('Ratios'), weak('Algebra')] }), sig({ studentId: '3' })];
const sum = summariseBatch(sg, sg.map(attentionFor));
ok(sum.students === 3 && sum.commonGaps.length === 1 && sum.commonGaps[0].name === 'Ratios' && sum.commonGaps[0].students === 2, 'common gap needs 2+ students');
ok(interventionResult(30, 45, 10) === 'improved' && interventionResult(30, 33, 10) === 'no_change' && interventionResult(50, 38, 10) === 'lower', 'result thresholds');
ok(interventionResult(30, 60, 2) === 'not_enough_data' && interventionResult(null, 60, 20) === 'not_enough_data' && interventionResult(30, null, 20) === 'not_enough_data', 'too early / missing → not enough data');

// ---- store + privacy boundary
(async () => {
  const day = 86400000, now = Date.parse('2026-10-27T06:00:00Z');
  const T: Record<string, any[]> = {
    students: [{ id: '11111111-1111-1111-1111-111111111111', display_name: 'Asha' }, { id: '22222222-2222-2222-2222-222222222222', display_name: 'Ben' }, { id: '33333333-3333-3333-3333-333333333333', display_name: 'Other tutor student' }],
    student_links: [
      { student_id: '11111111-1111-1111-1111-111111111111', adult_user_id: 'tutorA', status: 'active' },
      { student_id: '22222222-2222-2222-2222-222222222222', adult_user_id: 'tutorA', status: 'active' },
      { student_id: '33333333-3333-3333-3333-333333333333', adult_user_id: 'tutorB', status: 'active' },
      { student_id: '33333333-3333-3333-3333-333333333333', adult_user_id: 'tutorA', status: 'revoked' },
    ],
    skills: [{ id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Quadratics' }],
    mastery_states: [
      { student_id: '11111111-1111-1111-1111-111111111111', skill_id: 'aaaaaaaa-0000-0000-0000-000000000001', score: 20 },
      { student_id: '11111111-1111-1111-1111-111111111111', skill_id: 'k2', score: 30 }, { student_id: '11111111-1111-1111-1111-111111111111', skill_id: 'k3', score: 35 },
      { student_id: '22222222-2222-2222-2222-222222222222', skill_id: 'k2', score: 80 },
      { student_id: '33333333-3333-3333-3333-333333333333', skill_id: 'k2', score: 5 },
    ],
    learning_sessions: [{ student_id: '11111111-1111-1111-1111-111111111111', started_at: new Date(now - 20 * day).toISOString() }, { student_id: '22222222-2222-2222-2222-222222222222', started_at: new Date(now - day).toISOString() }],
    review_schedule: [], batches: [], batch_students: [], interventions: [],
  };
  const db: any = fakeDb(T, { rels: { mastery_states: { skills: { table: 'skills', fk: 'skill_id' } } }, defaults: { batches: { id: 'bbbbbbbb-0000-0000-0000-000000000001', archived: false }, interventions: { id: 'cccccccc-0000-0000-0000-000000000001', status: 'planned', result: null, baseline_score: null, followup_score: null } } });
  const ids = await linkedStudents(db, 'tutorA');
  ok(ids.length === 2 && !ids.includes('33333333-3333-3333-3333-333333333333'), 'only ACTIVE links of this adult');
  const board = await attentionBoard(db, 'tutorA');
  ok(board.attention.length === 2 && !board.attention.some((a) => a.name === 'Other tutor student'), 'board never shows another tutor\'s student');
  ok(board.attention[0].name === 'Asha', 'Asha (inactive, low) first');
  // batches
  const b = await createBatch(db, 'tutorA', '  Class 10 evening ');
  ok(T.batches[0].name === 'Class 10 evening', 'name trimmed');
  let threw = ''; try { await createBatch(db, 'tutorA', 'x'); } catch (e: any) { threw = e.message; } ok(/name/.test(threw), 'short name refused');
  await setBatchMember(db, 'tutorA', b.id, '11111111-1111-1111-1111-111111111111', true);
  await setBatchMember(db, 'tutorA', b.id, '11111111-1111-1111-1111-111111111111', true);
  ok(T.batch_students.length === 1, 'adding twice keeps one row');
  for (const bad of ['33333333-3333-3333-3333-333333333333', 'not-a-uuid']) { threw = ''; try { await setBatchMember(db, 'tutorA', b.id, bad, true); } catch (e: any) { threw = e.message; } ok(threw !== '', 'cannot add a student who is not linked: ' + bad); }
  threw = ''; try { await setBatchMember(db, 'tutorB', b.id, '33333333-3333-3333-3333-333333333333', true); } catch (e: any) { threw = e.message; } ok(/batch/.test(threw), 'another tutor cannot use my batch');
  threw = ''; try { await archiveBatch(db, 'tutorB', b.id); } catch (e: any) { threw = e.message; } ok(threw !== '' && T.batches[0].archived !== true, 'another tutor cannot archive my batch');
  let lb = await listBatches(db, 'tutorA'); ok(lb.length === 1 && lb[0].studentIds.length === 1 && lb[0].summary.students === 1, 'batch listing');
  T.student_links[0].status = 'revoked'; // the family cancels the link
  lb = await listBatches(db, 'tutorA'); ok(lb[0].studentIds.length === 0, 'revoked link disappears from the batch at once');
  T.student_links[0].status = 'active';
  // interventions
  const iv = await createIntervention(db, 'tutorA', { studentId: '11111111-1111-1111-1111-111111111111', skillId: 'aaaaaaaa-0000-0000-0000-000000000001', problem: 'Quadratics low', evidence: '20/100', action: '20 min session' });
  ok(iv.baseline === 20, 'baseline captured from current score');
  threw = ''; try { await createIntervention(db, 'tutorA', { studentId: '33333333-3333-3333-3333-333333333333', problem: 'p', action: 'a' }); } catch (e: any) { threw = e.message; } ok(/not linked/.test(threw), 'cannot plan for an unlinked student');
  threw = ''; try { await createIntervention(db, 'tutorA', { studentId: '11111111-1111-1111-1111-111111111111', problem: '', action: 'a' }); } catch (e: any) { threw = e.message; } ok(threw !== '', 'problem required');
  threw = ''; try { await updateIntervention(db, 'tutorB', iv.id, 'done'); } catch (e: any) { threw = e.message; } ok(threw !== '' && T.interventions[0].status === 'planned', 'another tutor cannot update it');
  let list = await measureInterventions(db, 'tutorA', now);
  ok(list.length === 1 && list[0].result == null, 'planned ones are not measured');
  await updateIntervention(db, 'tutorA', iv.id, 'done', now - 8 * day);
  T.mastery_states[0].score = 45;
  list = await measureInterventions(db, 'tutorA', now);
  ok(list[0].result === 'improved' && Number(list[0].followup_score) === 45, 'measured: improved 20 → 45: ' + JSON.stringify([list[0].result, list[0].followup_score]));
  const other = await measureInterventions(db, 'tutorB', now); ok(other.length === 0, 'another tutor sees none of my interventions');
  console.log('t69', f ? 'FAILED ' + f : 'ok');
})();
