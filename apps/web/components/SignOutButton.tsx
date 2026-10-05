'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

// Shared with SiteHeader's inline sign-out logic in spirit — pulled out so
// /admin/feedback can offer "wrong account? sign out" without duplicating
// the signOut() + redirect dance.
export function SignOutButton({ label = 'Sign out' }: { label?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} className="btn btn--ghost btn--small">
      {label}
    </button>
  );
}
