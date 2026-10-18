import { PortalLoginForm } from '@/components/portal/PortalLoginForm';

export default function Page() {
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><PortalLoginForm portal="teacher" label="Teacher" registerHref="/teacher/register" /></div></main>
  );
}
