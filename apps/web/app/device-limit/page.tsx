import { FOUNDER, MAX_DEVICES_PER_ACCOUNT } from '@adaptive-tutor/core';
import { createServerClient, checkCurrentDevice } from '@/lib/supabase-server';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

// Shown when a login is already in use on the maximum number of devices.
export default async function DeviceLimitPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const r = user ? await checkCurrentDevice(user) : null;
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>This login is already used on {MAX_DEVICES_PER_ACCOUNT} devices</h1>
        <p>
          To protect each family&apos;s progress, one Sahayak login works on up to {MAX_DEVICES_PER_ACCOUNT} devices (computers, phones or browsers).
          This device is a new one, so it cannot be used.
        </p>
        <p>
          If you changed your computer or phone, please contact {FOUNDER.name} on {FOUNDER.contactPhone}. We will clear the old devices so you can sign in on the new one.
        </p>
        {r && !r.allowed && r.devices.length > 0 && (
          <>
            <h2 style={{ fontSize: 'var(--step-1)' }}>Devices already registered</h2>
            <ul>
              {r.devices.map((d, i) => (
                <li key={i}>
                  {d.label ?? 'A device'}, first used {d.first_seen.slice(0, 10)}, last used {d.last_seen.slice(0, 10)}
                </li>
              ))}
            </ul>
          </>
        )}
        {user && <SignOutButton label="Sign out" />}
      </div>
    </main>
  );
}
