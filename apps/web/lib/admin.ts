import { createServerClient } from '@/lib/supabase-server';

// The single admin gate for the new v36 admin routes (same ADMIN_EMAILS rule as
// /admin/payments and /admin/feedback): the caller's own authenticated email must be
// listed. Never trusts a client-supplied flag.
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) return null;
  return { id: user.id, email: user.email };
}

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const admin = await getAdminUser();
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
