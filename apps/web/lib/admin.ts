import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { can, teamMemberByEmail, type Permission } from '@adaptive-tutor/core';

// The single admin gate for the new v36 admin routes (same ADMIN_EMAILS rule as
// /admin/payments and /admin/feedback): the caller's own authenticated email must be
// listed. Never trusts a client-supplied flag.
export async function getAdminUser(perm?: Permission): Promise<{ id: string; email: string; superAdmin: boolean } | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.includes(user.email.toLowerCase())) return { id: user.id, email: user.email, superAdmin: true };
  // v79: a team member may pass ONLY when a permission was asked for, the member is active and holds it. No permission asked = Super Admin only.
  if (!perm) return null;
  try {
    const member = await teamMemberByEmail(createServiceClient(), user.email);
    if (can({ superAdmin: false, member }, perm)) return { id: user.id, email: user.email, superAdmin: false };
  } catch { /* any doubt = no access */ }
  return null;
}

export async function requireAdmin(perm?: Permission): Promise<{ id: string; email: string; superAdmin: boolean }> {
  const admin = await getAdminUser(perm);
  if (!admin) throw new Error('not_authorized');
  return admin;
}

/** Random password with no look-alike characters, for accounts the founder creates. Shown once, never stored. */
export function generatePassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
