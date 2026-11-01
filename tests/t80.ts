import { fakeDb } from './fakedb2';
import { assignTeacher, endAssignment, listAssignments, permissionForPath } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
(async () => {
  const db: any = fakeDb({ users: [{ id: 't1', role: 'teacher' }, { id: 't2', role: 'teacher' }, { id: 'p1', role: 'parent' }], teacher_profiles: [{ user_id: 't1', display_name: 'Meera', status: 'approved' }, { user_id: 't2', display_name: 'Pending', status: 'pending' }], students: [{ id: 's1', display_name: 'Kabir' }], teacher_assignments: [], audit_logs: [] }, { unique: { teacher_assignments: [['teacher_user', 'student_id']] } });
  const T = db._tables;
  ok((await assignTeacher(db, 'a', 'p1', 's1')).error === 'not_a_teacher', 'a parent cannot be assigned as teacher');
  ok((await assignTeacher(db, 'a', 't2', 's1')).error === 'teacher_not_approved', 'pending teacher refused');
  ok((await assignTeacher(db, 'a', 't1', 'nope')).error === 'student_not_found', 'unknown student refused');
  ok((await assignTeacher(db, 'a', 't1', 's1', 'maths')).ok && T.teacher_assignments.length === 1, 'assigned');
  ok((await assignTeacher(db, 'a', 't1', 's1')).error === 'already_assigned' && T.teacher_assignments.length === 1, 'no duplicate');
  const id = T.teacher_assignments[0].id; ok((await endAssignment(db, 'a', id)).ok && T.teacher_assignments[0].status === 'ended', 'ended');
  ok(!(await endAssignment(db, 'a', id)).ok, 'cannot end twice');
  ok((await assignTeacher(db, 'a', 't1', 's1')).ok && T.teacher_assignments[0].status === 'active' && T.teacher_assignments.length === 1, 'reassign reactivates the same row');
  const l = await listAssignments(db); ok(l[0].teacher_name === 'Meera' && l[0].student_name === 'Kabir', 'names resolved');
  ok(T.audit_logs.filter((a: any) => a.action.startsWith('assignment.')).length === 3, 'audited (add, end, add)');
  ok(permissionForPath('/admin/assignments') === 'academic', 'academic permission');
  console.log(`t80: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
