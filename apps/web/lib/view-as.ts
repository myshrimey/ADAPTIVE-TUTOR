import { createHash } from 'node:crypto';

// v140: the signing secret is DERIVED from the server key that is already a secret (no new setting to forget, nothing in the browser).
export function viewAsSecret(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('view_as_secret_missing');
  return createHash('sha256').update('sahayak-view-as-v1:' + k).digest('hex');
}
