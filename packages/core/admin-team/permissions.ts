// v79: what a member of the founder's team may open. The founder (ADMIN_EMAILS) is Super Admin and may open everything.
// A page or route that asks for no permission is Super Admin only (the old behaviour). Permissions are checked on the SERVER.
export const PERMISSIONS = ['users', 'invitations', 'academic', 'content', 'marketing', 'finance', 'support', 'technology'] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const PERMISSION_LABEL: Record<Permission, string> = {
  users: 'Create and manage user accounts', invitations: 'Create and manage invitations',
  academic: 'Academic: students, teachers, learning', content: 'Content: questions and reviews', marketing: 'Marketing: acquisition, social, referrals',
  finance: 'Finance: payments, pricing, money', support: 'Support: feedback and help requests', technology: 'Technology: AI, settings, system',
};
export const TEAM_PRESETS: { id: string; label: string; department: string; permissions: Permission[]; note: string }[] = [
  { id: 'operations', label: 'Operations', department: 'Operations', permissions: ['users', 'invitations', 'support'], note: 'Creates accounts and invitations, answers feedback.' },
  { id: 'academic', label: 'Academic', department: 'Academic', permissions: ['academic', 'content', 'invitations'], note: 'Students, teachers, questions.' },
  { id: 'content', label: 'Content', department: 'Content', permissions: ['content'], note: 'Questions and reviews only.' },
  { id: 'marketing', label: 'Marketing', department: 'Marketing', permissions: ['marketing', 'invitations'], note: 'Acquisition, social growth, invitations.' },
  { id: 'finance', label: 'Finance', department: 'Finance', permissions: ['finance'], note: 'Payments, pricing and money pages.' },
  { id: 'support', label: 'Support', department: 'Support', permissions: ['support', 'users'], note: 'Feedback and account help.' },
  { id: 'technology', label: 'Technology', department: 'Technology', permissions: ['technology'], note: 'AI, settings and system pages.' },
  { id: 'custom', label: 'Custom', department: '', permissions: [], note: 'Pick the permissions yourself.' },
];
export function cleanPermissions(raw: unknown): Permission[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from(new Set(arr.map(String))).filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
}
export interface TeamMemberLite { status?: string | null; permissions?: string[] | null }
/** Super Admin (ADMIN_EMAILS) = everything. A team member needs status active AND the permission. No permission asked = Super Admin only. */
export function can(opts: { superAdmin: boolean; member?: TeamMemberLite | null }, perm?: Permission): boolean {
  if (opts.superAdmin) return true;
  if (!perm) return false;
  const m = opts.member;
  return !!m && m.status === 'active' && cleanPermissions(m.permissions).includes(perm);
}
/** Which admin page needs which permission (everything not listed is Super Admin only). Used to filter the menu and to guard pages/routes. */
export const PAGE_PERMISSION: { prefix: string; perm: Permission }[] = [
  { prefix: '/admin/users', perm: 'users' }, { prefix: '/admin/invitations', perm: 'invitations' },
  { prefix: '/admin/teachers', perm: 'academic' }, { prefix: '/admin/assignments', perm: 'academic' }, { prefix: '/admin/curriculum', perm: 'academic' }, { prefix: '/admin/partners', perm: 'users' },
  { prefix: '/admin/acquisition', perm: 'marketing' }, { prefix: '/admin/social-growth', perm: 'marketing' },
  { prefix: '/admin/feedback', perm: 'support' },
];
// v87: ONLY pages whose server gate really accepts the permission are listed above (a test checks this against the page files).
// Money, pricing, AI settings, the question bank, reviews and referral rewards are still Super Admin only, so they are NOT listed:
// a team member must never be shown a menu item the server then refuses. Opening them to a permission is a founder decision.
/** How many admin pages a permission opens today (the team screen says so, so nobody assumes a permission does more than it does). */
export const pagesOpenedBy = (perm: Permission): number => PAGE_PERMISSION.filter((p) => p.perm === perm).length;
export function permissionForPath(path: string): Permission | undefined {
  let best: { prefix: string; perm: Permission } | undefined;
  for (const p of PAGE_PERMISSION) if (path.startsWith(p.prefix) && (!best || p.prefix.length > best.prefix.length)) best = p;
  return best?.perm;
}
/** Menu filter: Super Admin sees everything, a member sees only the pages their permissions open. */
export function visiblePath(path: string, opts: { superAdmin: boolean; member?: TeamMemberLite | null }): boolean {
  if (opts.superAdmin) return true;
  const perm = permissionForPath(path.split('?')[0]);
  return can(opts, perm);
}
