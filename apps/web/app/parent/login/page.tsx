import { PortalLoginForm } from '@/components/portal/PortalLoginForm';

export default function Page() {
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><PortalLoginForm portal="parent" label="Parent" registerHref="/parent/register" /></div></main>
  );
}
