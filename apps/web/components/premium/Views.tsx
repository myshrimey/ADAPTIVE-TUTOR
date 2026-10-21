import { t, READINESS_NOTE, type ParentReport, type Programme, type RescuePlan, type WeakSkill } from '@adaptive-tutor/core';

type Lang = 'en' | 'hi';

export function ReadinessView({ report, weak, lang, heading, backHref }: { report: ParentReport; weak: Map<string, WeakSkill[]>; lang: Lang; heading: string; backHref: string }) {
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <p><a href={backHref}>← Back</a></p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>{heading}</h1>
        <p style={{ color: 'var(--slate)' }}>{READINESS_NOTE}</p>
      </div>
      {report.subjects.length === 0 && <p style={{ color: 'var(--slate)' }}>No assessment yet. A diagnostic is needed first.</p>}
      {report.subjects.map((s) => {
        const w = (weak.get(s.subjectId) ?? []).slice(0, 5);
        return (
          <section key={s.subjectId} className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            <div className="chapter-row__title">{s.subjectName} · <span data-band={s.readiness.band}>{t(`readiness.band.${s.readiness.band}` as any, lang)}</span></div>
            <p style={{ margin: '0.3rem 0' }}>
              Coverage {Math.round(s.coveragePercent)}% ({s.skillsAssessed}/{s.skillsTotal} skills) · evidence: {t(`report.evidence.${s.evidence}` as any, lang)}
              {s.currentAvgPercent !== null && <> · average skill mastery {Math.round(s.currentAvgPercent)}%</>}
              {s.mockCount > 0 && s.latestMockPercent !== null && <> · {s.mockCount} timed mock{s.mockCount > 1 ? 's' : ''}, latest {s.latestMockPercent}%</>}
            </p>
            <ul style={{ margin: '0.2rem 0', paddingLeft: '1.1rem', fontSize: '0.9rem', color: 'var(--slate)' }}>
              {s.readiness.reasons.map((r, i) => <li key={i}>{t(`readiness.reason.${r.code}` as any, lang, r.params)}</li>)}
            </ul>
            {w.length > 0 && (<>
              <div style={{ fontWeight: 600 }}>Work on these first</div>
              <ol style={{ margin: '0.2rem 0', paddingLeft: '1.2rem' }}>{w.map((x) => <li key={x.skillId}>{x.name} ({Math.round(x.score)}%){x.weakPrerequisites[0] ? ` — base to repair first: ${x.weakPrerequisites[0].name}` : ''}</li>)}</ol>
            </>)}
            {s.likelyCauses.length > 0 && <p style={{ fontSize: '0.9rem', margin: '0.3rem 0' }}><strong>Patterns seen in wrong answers (possible, not certain):</strong> {s.likelyCauses.join('; ')}</p>}
            <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>{t(`readiness.next.${s.readiness.nextStep}` as any, lang)}</p>
          </section>
        );
      })}
    </div></main>
  );
}

export function RescueView({ plan, days, backHref, pathBase }: { plan: RescuePlan; days: number; backHref: string; pathBase: string }) {
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <p><a href={backHref}>← Back</a></p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Exam Rescue sprint</h1>
        <p>Choose a length: <a href={`${pathBase}days=7`}>7 days</a> · <a href={`${pathBase}days=14`}>14 days</a>. Now showing {days} days.</p>
        <p style={{ color: 'var(--slate)' }}>{plan.note}</p>
      </div>
      {plan.days.map((d) => (
        <div key={d.day} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem' }}>
          <strong>Day {d.day}</strong> · {d.subject} · about {d.minutes} minutes
          <div>{d.task}</div>
        </div>
      ))}
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Guidance only. Sahayak does not predict marks or guarantee results.</p>
    </div></main>
  );
}

export function ProgrammeView({ programme, backHref, boardLabel }: { programme: Programme; backHref: string; boardLabel: string }) {
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-4)' }}>
        <p><a href={backHref}>← Back</a></p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Board Preparation Programme</h1>
        <p style={{ color: 'var(--slate)' }}>
          {programme.datesSet ? `Planned towards ${boardLabel}.` : 'Exam dates have not been entered yet, so this shows the next 12 weeks. It will adjust once the dates are set.'} The programme is rebuilt from the latest evidence every time you open it.
        </p>
      </div>
      {programme.weeks.length === 0 && <p>No weeks to plan yet.</p>}
      {programme.weeks.map((w) => (
        <section key={w.week} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <div className="chapter-row__title">Week {w.week}</div>
          {w.items.map((it) => (<div key={it.subject}><strong>{it.subject}</strong><ul style={{ margin: '0.1rem 0 0.3rem', paddingLeft: '1.1rem' }}>{it.steps.map((x, i) => <li key={i}>{x}</li>)}</ul></div>))}
          {w.checkpoint && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--slate)' }}>{w.checkpoint}</p>}
        </section>
      ))}
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>Guidance only. Sahayak does not predict marks or guarantee results.</p>
    </div></main>
  );
}
