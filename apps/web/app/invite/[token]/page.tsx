import { createServiceClient } from '@/lib/supabase-server';
import { lookupToken, markOpened, findExistingAccount, flagExisting, MSG_EXISTING } from '@adaptive-tutor/core';
import { InviteForm } from '@/components/invite/InviteForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your Sahayak invitation', robots: { index: false, follow: false } };
// Public, token-gated. Shows nothing about the invitation unless the token is valid. The error texts are fixed, plain and reveal no other record.
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params; const sp = await searchParams; const service = createServiceClient();
  const r = await lookupToken(service, token);
  if (!r.ok) return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Sahayak invitation</h1><p className="alert" role="alert">{r.message}</p><p><a href="/help">Help</a> · <a href="/contact">Contact us</a></p>
    </div></main>);
  const inv = r.inv;
  await markOpened(service, inv, { source: sp.source ?? sp.src ?? null, campaign: sp.campaign ?? null, ref: sp.ref ?? null });
  const existing = await findExistingAccount(service, inv.invitee_email);
  if (existing) await flagExisting(service, inv, existing);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Welcome to Sahayak</h1>
      {existing ? (<><p className="alert" role="alert">{MSG_EXISTING}</p><p><a className="btn btn--accent" href={inv.role === 'student' ? '/' : `/${inv.role}/login`}>Go to sign in</a></p></>)
        : <InviteForm token={token} role={inv.role} name={inv.invitee_name ?? ''} filled={inv.fields ?? {}} />}
    </div></main>
  );
}
