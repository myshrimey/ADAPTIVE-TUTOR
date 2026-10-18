'use client';

export function UnlinkButton({ studentId, home }: { studentId: string; home: string }) {
  async function go() {
    if (!window.confirm('Stop following this student? You will need a new code to see them again.')) return;
    await fetch('/api/portal/link', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }) });
    window.location.href = home;
  }
  return <button type="button" className="btn btn--ghost btn--small" onClick={go}>Stop following this student</button>;
}
