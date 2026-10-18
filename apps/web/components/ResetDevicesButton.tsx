'use client';

import { useState } from 'react';

export function ResetDevicesButton({ studentId }: { studentId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  async function reset() {
    if (!window.confirm('Clear all registered devices for this student? They can then sign in on any 2 devices.')) return;
    setState('busy');
    const res = await fetch('/api/admin/devices/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }) });
    const json = await res.json();
    setState(json.error ? 'err' : 'done');
  }
  return (
    <button type="button" className="btn btn--ghost" onClick={reset} disabled={state === 'busy'}>
      {state === 'done' ? 'Cleared' : state === 'err' ? 'Failed, try again' : 'Clear devices'}
    </button>
  );
}
