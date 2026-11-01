import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { getControl } from '@/lib/control';
import { currentExecution } from '@adaptive-tutor/core';
import { ControlNav, SourceNote, StatusChip } from '@/components/ControlNav';

export const dynamic = 'force-dynamic';
// Super Admin only. Read only: shows what is running and what waits for you. Nothing here starts work.
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { reg, source } = await getControl(); const c = currentExecution(reg);
  const list = (rows: typeof c.partly, empty: string) => rows.length ? <ul>{rows.map((t) => <li key={t.id}><strong>{t.id}</strong> {t.title} <StatusChip s={t.status} />{t.note ? <div style={{ color: 'var(--slate)', fontSize: '0.82rem' }}>{t.note}</div> : null}</li>)}</ul> : <p style={{ color: 'var(--slate)' }}>{empty}</p>;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Current execution</h1>
        <p style={{ color: 'var(--slate)' }}>What is running, what waits for your check, and what Claude would recommend. This page only shows; it never starts work. Claude starts a task when you tell Claude to, in the chat.</p>
        <AdminNav /><ControlNav here="/admin/control/current" /><SourceNote source={source} /></div>
      <p><a className="btn" href="/api/admin/control/resume" download="SESSION_RESUME.txt">Download the session resume (text)</a> <span style={{ color: 'var(--slate)', fontSize: '0.84rem' }}>Paste it at the start of a new chat so nothing is lost.</span></p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Active prompt</h2>
      <p>{c.activePrompt ? <><strong>{c.activePrompt.id}</strong> {c.activePrompt.title}<br /><span style={{ color: 'var(--slate)' }}>{c.activePrompt.why}</span></> : 'No prompt has open tasks.'}</p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Your chosen next task</h2>
      <p>{c.founderNext ? <><strong>{c.founderNext.id}</strong> {c.founderNext.title}</> : 'You have not chosen one (use "Mark as next" on the Task backlog).'}</p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Claude&apos;s recommendation</h2>
      <p>{c.recommendedNext ? <><strong>{c.recommendedNext.id}</strong> {c.recommendedNext.title} <span style={{ color: 'var(--slate)' }}>(lowest open task whose earlier tasks are all done and that needs nothing from you)</span></> : 'Nothing is ready: every open task waits for an earlier task or for you.'}</p>
      <h2 style={{ fontSize: 'var(--step-1)' }}>Running now</h2>{list(c.inFlight, 'Nothing is running between deliveries.')}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Waiting for your check ({c.waitingForFounderCheck.length})</h2>{list(c.waitingForFounderCheck, 'Nothing waits for your check.')}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Partly done ({c.partly.length})</h2>{list(c.partly, 'None.')}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Waiting for your decision</h2>
      {c.decisionsWaiting.length ? <ul>{c.decisionsWaiting.map((d) => <li key={d.id}><strong>{d.id}</strong> {d.decision} <span style={{ color: 'var(--slate)' }}>(affects {d.affects || 'n/a'})</span></li>)}</ul> : <p style={{ color: 'var(--slate)' }}>None.</p>}
      {c.blockedByFounder.length > 0 && <><h2 style={{ fontSize: 'var(--step-1)' }}>Tasks held up only by you</h2><ul>{c.blockedByFounder.map((b) => <li key={b.task.id}><strong>{b.task.id}</strong> {b.task.title} <span style={{ color: '#8a5a00' }}>waiting on: {b.waitingOn.join(', ')}</span></li>)}</ul></>}
      <h2 style={{ fontSize: 'var(--step-1)' }}>Last delivery</h2>
      <p>{c.lastExecution ? <><strong>{c.lastExecution.id}</strong> ({c.lastExecution.executed_on}): {c.lastExecution.summary}</> : 'None recorded.'} <a href="/admin/control/history">All deliveries</a></p>
    </div></main>
  );
}
