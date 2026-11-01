// v93: manual test checklists per account type. Every item points at a page that EXISTS in the app (test t93 checks the folders).
// This is a list of things for a person to try with a TEST account. It is not a record of results: nothing here says a check has passed.
export type QaKind = 'student' | 'parent' | 'tutor' | 'centre' | 'teacher' | 'admin';
export interface QaItem { id: string; area: string; check: string; route: string; needs?: string }
export const QA_KINDS: readonly QaKind[] = ['student', 'parent', 'tutor', 'centre', 'teacher', 'admin'];
export const QA_LABEL: Record<QaKind, string> = { student: 'Student', parent: 'Parent', tutor: 'Tutor', centre: 'Coaching centre', teacher: 'Teacher', admin: 'Founder (admin)' };
export const QA_NOTE: Record<QaKind, string> = {
  student: 'Use a TEST student on the free plan, then give it a paid plan at /admin/students and repeat the plan-limited checks.',
  parent: 'Needs a test parent and a test student linked by a code the student makes at /sharing.',
  tutor: 'Needs a test tutor (approved at /admin/partners) linked to a test student.',
  centre: 'Needs a test centre (approved at /admin/partners) linked to a test student. Today there are no centre, tutor or teacher accounts in the live database.',
  teacher: 'Needs a test teacher (approved at /admin/teachers).',
  admin: 'Use your own founder login. Never use a real family\'s account.',
};
export const QA_CHECKLISTS: Record<QaKind, QaItem[]> = {
  student: [
    { id: 'QA-ST-01', area: 'Sign in', check: 'Sign in with username and password; you land on your own dashboard and see only your own data.', route: '/dashboard' },
    { id: 'QA-ST-02', area: 'Subjects', check: 'On the free plan you can pick exactly one subject; choosing a second is refused with a clear message.', route: '/subjects' },
    { id: 'QA-ST-03', area: 'Diagnostic', check: 'Start the 20-question diagnostic; a wrong answer adds a prerequisite check and the length stays 20.', route: '/diagnostic' },
    { id: 'QA-ST-04', area: 'Adaptive check', check: 'Start the adaptive check; it has no fixed length and ends with a plain-words summary (no class label).', route: '/baseline' },
    { id: 'QA-ST-05', area: 'Learning', check: 'Open a lesson, answer questions, see the explanation after answering. Math and figures display correctly.', route: '/learn' },
    { id: 'QA-ST-06', area: 'Revision', check: 'Revision page lists due items; answering moves their due date.', route: '/review' },
    { id: 'QA-ST-07', area: 'Mock', check: 'Start a mock, submit it, and open the saved report.', route: '/mock' },
    { id: 'QA-ST-08', area: 'Reports', check: 'Saved reports show the student version only (no adult notes).', route: '/reports' },
    { id: 'QA-ST-09', area: 'Challenge zone', check: 'A skill opens only after enough evidence; a wrong answer is framed as normal; mastery does not change.', route: '/stretch' },
    { id: 'QA-ST-10', area: 'Sharing', check: 'Make a sharing code; an adult can use it once; you can revoke the link.', route: '/sharing' },
    { id: 'QA-ST-11', area: 'My data', check: 'Download your data; request deletion and see it appear for the founder.', route: '/my-data' },
    { id: 'QA-ST-12', area: 'Feedback', check: 'Report a question; it appears under your reports with a plain status.', route: '/my-feedback' },
    { id: 'QA-ST-13', area: 'Plans page', check: 'Prices come from the database and every price card says "Terms & Conditions Apply.".', route: '/plans' },
    { id: 'QA-ST-14', area: 'Devices', check: 'A third device is refused with the device-limit page (admins are exempt).', route: '/device-limit' },
  ],
  parent: [
    { id: 'QA-PA-01', area: 'Register and sign in', check: 'Register as a parent and sign in; you see no student until one links you.', route: '/parent/register' },
    { id: 'QA-PA-02', area: 'Link', check: 'Use the student\'s code; the child appears. Revoke the link from the student side; the child disappears at once.', route: '/parent', needs: 'test student + code' },
    { id: 'QA-PA-03', area: 'Student view', check: 'The adult version of a report opens; the student version never shows adult notes.', route: '/parent/student/[id]', needs: 'linked student' },
    { id: 'QA-PA-04', area: 'Other children', check: 'Change the student id in the address to an unlinked student: you must see nothing.', route: '/parent/student/[id]', needs: 'second student not linked' },
    { id: 'QA-PA-05', area: 'Paid reports', check: 'A paid report is offered only for a linked child and only after purchase.', route: '/parent/student/[id]/premium/[kind]', needs: 'linked student' },
  ],
  tutor: [
    { id: 'QA-TU-01', area: 'Register and approval', check: 'Register as a tutor; you stay pending until the founder approves at /admin/partners.', route: '/tutor/register' },
    { id: 'QA-TU-02', area: 'Sign in', check: 'Approved tutor signs in and sees only linked students.', route: '/tutor', needs: 'approved tutor' },
    { id: 'QA-TU-03', area: 'Attention list', check: 'The "who needs my attention" list uses supportive wording, never labels a child.', route: '/tutor/attention', needs: 'linked students' },
    { id: 'QA-TU-04', area: 'Questions', check: 'A question you upload stays "needs review" and cannot be self-verified.', route: '/tutor/questions', needs: 'approved tutor' },
    { id: 'QA-TU-05', area: 'Unlinked student', check: 'An unlinked student id in the address shows nothing.', route: '/tutor/student/[id]', needs: 'unlinked student' },
  ],
  centre: [
    { id: 'QA-CE-01', area: 'Register and approval', check: 'Register a centre; it stays pending until approved.', route: '/centre/register' },
    { id: 'QA-CE-02', area: 'Sign in', check: 'Approved centre sees only its linked students.', route: '/centre', needs: 'approved centre' },
    { id: 'QA-CE-03', area: 'Invitations', check: 'The centre can invite only its own students, teachers and tutors; links work once and expire.', route: '/centre/invitations', needs: 'approved centre' },
    { id: 'QA-CE-04', area: 'Attention list', check: 'Counts and averages only for groups of 3 or more; no names in group views.', route: '/centre/attention', needs: 'several linked students' },
    { id: 'QA-CE-05', area: 'Unlinked student', check: 'An unlinked student id in the address shows nothing.', route: '/centre/student/[id]', needs: 'unlinked student' },
  ],
  teacher: [
    { id: 'QA-TE-01', area: 'Register and approval', check: 'Register as a teacher; you stay pending until the founder approves.', route: '/teacher/register' },
    { id: 'QA-TE-02', area: 'Sign in', check: 'Approved teacher signs in; a pending or suspended teacher is refused.', route: '/teacher', needs: 'approved teacher' },
    { id: 'QA-TE-03', area: 'Handwriting review', check: 'Handwritten answers show no student name; a teacher mark can be saved.', route: '/teacher/handwriting', needs: 'a handwritten submission' },
    { id: 'QA-TE-04', area: 'Questions', check: 'Feedback on a question never changes its status by itself.', route: '/teacher/questions', needs: 'approved teacher' },
  ],
  admin: [
    { id: 'QA-AD-01', area: 'Gate', check: 'Signed out, every /admin page shows only the sign-in screen; a student login shows "not in ADMIN_EMAILS".', route: '/admin/accounts' },
    { id: 'QA-AD-02', area: 'Audit', check: 'Change a test student\'s plan; a line appears in the Audit log with the account and no password.', route: '/admin/audit-log' },
    { id: 'QA-AD-03', area: 'Accounts', check: 'The directory shows masked emails and initials only; opening an account adds an audit line.', route: '/admin/accounts' },
    { id: 'QA-AD-04', area: 'Payments', check: 'A payment claim becomes access only after you press "Verify payment and activate".', route: '/admin/payments' },
    { id: 'QA-AD-05', area: 'Team limits', check: 'A team member sees only pages for their permissions; money, settings and team pages stay Super Admin only.', route: '/admin/team' },
    { id: 'QA-AD-06', area: 'Control centre', check: 'Load from documents keeps your priority and acceptance choices.', route: '/admin/control' },
    { id: 'QA-AD-07', area: 'Data requests', check: 'A deletion request removes only that family\'s data; admin and teacher accounts are protected.', route: '/admin/data-requests', needs: 'a TEST deletion request' },
  ],
};
export function qaText(kind: QaKind): string {
  return [`${QA_LABEL[kind]} test checklist`, QA_NOTE[kind], '', ...QA_CHECKLISTS[kind].map((i) => `[ ] ${i.id} ${i.area}: ${i.check} (${i.route}${i.needs ? '; needs ' + i.needs : ''})`)].join('\n');
}
