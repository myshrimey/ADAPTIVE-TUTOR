import { createServerClient } from '@/lib/supabase-server';
import { AdminSignIn } from '@/components/AdminSignIn';
import { SignOutButton } from '@/components/SignOutButton';
import { AdminMenu } from '@/components/AdminMenu';
import { ADMIN_MENU } from '@/lib/admin-menu';

// Shared gate for server-rendered admin pages: returns the admin's email, or the sign-in UI to render.
export async function adminPageGate(): Promise<{ email: string } | { gate: React.ReactNode }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (user?.email && allowed.includes(user.email.toLowerCase())) return { email: user.email };
  return {
    gate: (
      <main className="page">
        <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Admin sign in</h1>
          {user ? (
            <>
              <p className="alert">Signed in as {user.email}, but this account isn&apos;t in ADMIN_EMAILS.</p>
              <SignOutButton label="Sign out" />
            </>
          ) : (
            <AdminSignIn />
          )}
        </div>
      </main>
    ),
  };
}

// The admin menu: grouped by category (see apps/web/lib/admin-menu.ts). Every admin page already renders <AdminNav />, so this one change reorganises all of them.
export function AdminNav() {
  return <AdminMenu />;
}

// "Everything in one place": the same list as cards, for the Command Centre home.
export function AdminMap() {
  return (
    <div className="admin-map">
      {ADMIN_MENU.map((g) => (
        <div key={g.id} className="admin-map__card">
          <h3>{g.label}</h3>
          <p>{g.blurb}</p>
          {g.items.map((it) => <a key={it.href} href={it.href}>{it.label}</a>)}
        </div>
      ))}
    </div>
  );
}
