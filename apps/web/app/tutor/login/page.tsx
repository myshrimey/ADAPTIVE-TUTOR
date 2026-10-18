import { PortalLoginForm } from '@/components/portal/PortalLoginForm';

export default function Page() {
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><PortalLoginForm portal="tutor" label="Tutor" registerHref="/tutor/register" /></div></main>
  );
}
