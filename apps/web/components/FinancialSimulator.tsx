'use client';
import { useMemo, useState } from 'react';
import { cleanSim, combination, gapToTarget, presetGrid, handwrittenCalculator, breakEvenCustomers, handwrittenCostPerEval, unitContribution, inr, lakh, SCENARIO_NOTE, TARGET_PRESETS, MARGIN_PRESETS, STUDENT_ARPU_PRESETS, ZERO_COUNTS, type SimInputs, type Counts } from '@adaptive-tutor/core';

const LABELS: [keyof SimInputs, string, string][] = [
  ['arpuStudent', 'Average revenue per student / month (₹)', 'arpu'], ['arpuTutor', 'Average revenue per tutor / month (₹)', 'arpu'], ['arpuCentre', 'Average revenue per coaching centre / month (₹)', 'arpu'], ['arpuSchool', 'Average revenue per school / month (₹)', 'arpu'],
  ['aiCostStudent', 'AI cost per student / month (₹)', 'cost'], ['aiCostTutor', 'AI cost per tutor / month (₹)', 'cost'], ['aiCostCentre', 'AI cost per centre / month (₹)', 'cost'], ['aiCostSchool', 'AI cost per school / month (₹)', 'cost'],
  ['paymentFeePct', 'Payment processing (% of revenue)', 'cost'], ['monthlyOperating', 'Monthly operating expenses (₹)', 'fixed'], ['monthlyMarketing', 'Monthly marketing (₹)', 'fixed'], ['otherFixed', 'Other fixed costs / month (₹)', 'fixed'], ['taxReservePct', 'Tax reserve (% of profit)', 'fixed'],
  ['handwrittenPrice', 'Handwritten mock price (₹)', 'hw'], ['handwrittenImages', 'Images per evaluation', 'hw'], ['visionCostPerImage', 'Vision / OCR cost per image (₹)', 'hw'], ['reasoningCostPerEval', 'Reasoning cost per evaluation (₹)', 'hw'], ['storageCostPerEval', 'Storage per evaluation (₹)', 'hw'], ['humanCostPerEval', 'Human review per evaluation (₹)', 'hw'], ['otherCostPerEval', 'Other variable cost per evaluation (₹)', 'hw'],
  ['targetNetProfit', 'Target net profit / month (₹)', 'target'],
];
const GROUPS: Record<string, string> = { arpu: 'Average revenue', cost: 'Variable costs', fixed: 'Fixed costs and tax', hw: 'Handwritten mock', target: 'Target' };
const box: React.CSSProperties = { border: '1px solid var(--line, #cbd5e1)', borderRadius: 12, padding: '1rem', margin: '1rem 0' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.25rem 0.8rem 0.25rem 0', borderBottom: '1px solid var(--line, #cbd5e1)' };
const td: React.CSSProperties = { padding: '0.25rem 0.8rem 0.25rem 0' };

export function FinancialSimulator({ initial }: { initial: SimInputs }) {
  const [s, setS] = useState<SimInputs>(initial);
  const [c, setC] = useState<Counts>({ ...ZERO_COUNTS, students: 500, tutors: 20, centres: 5, handwrittenMocks: 100 });
  const [msg, setMsg] = useState('');
  const set = (k: keyof SimInputs) => (e: React.ChangeEvent<HTMLInputElement>) => setS(cleanSim({ ...s, [k]: e.target.value === '' ? 0 : Number(e.target.value) }));
  const setCount = (k: keyof Counts) => (e: React.ChangeEvent<HTMLInputElement>) => setC({ ...c, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) });
  const combo = useMemo(() => combination(s, c), [s, c]);
  const gap = useMemo(() => gapToTarget(s, c), [s, c]);
  const hw = useMemo(() => handwrittenCalculator(s), [s]);
  const missingCosts = s.aiCostStudent === 0 && s.aiCostTutor === 0 && s.aiCostCentre === 0;
  async function save() {
    const r = await fetch('/api/admin/simulator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: s }) });
    const j = await r.json(); setMsg(j.error ? 'Problem: ' + j.error : 'Saved.');
  }
  const grid = (arpu: number, who: string) => {
    const rows = presetGrid(arpu);
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead><tr><th style={th}>Net profit / month</th>{MARGIN_PRESETS.map((m) => <th key={m} style={th}>{m}% margin</th>)}</tr></thead>
          <tbody>{TARGET_PRESETS.map((t) => (
            <tr key={t}><td style={td}><strong>{lakh(t)}</strong></td>
              {MARGIN_PRESETS.map((m) => { const r = rows.find((x) => x.target === t && x.margin === m)!; return <td key={m} style={td}>{r.customers === null ? 'Insufficient data' : <>{r.customers.toLocaleString('en-IN')} {who}<br /><span style={{ color: 'var(--slate)' }}>{lakh(r.revenue)} revenue</span></>}</td>; })}</tr>
          ))}</tbody>
        </table>
      </div>
    );
  };
  return (
    <div>
      <p className="alert" role="note">{SCENARIO_NOTE}</p>
      {missingCosts && <p className="alert">AI cost per customer is 0 in these numbers, so profits look better than they will be. Enter the real figure (see AI Economics) before relying on any result.</p>}
      <div style={box}>
        <h2>Your numbers</h2>
        {Object.entries(GROUPS).map(([g, title]) => (
          <fieldset key={g} style={{ border: 0, padding: 0, margin: '0 0 0.8rem' }}>
            <legend style={{ fontWeight: 600 }}>{title}</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '0.5rem' }}>
              {LABELS.filter((l) => l[2] === g).map(([k, label]) => (
                <label key={k} style={{ display: 'block', fontSize: '0.88rem' }}>{label}
                  <input className="field__input" type="number" min={0} inputMode="decimal" value={s[k]} onChange={set(k)} />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="btn btn--accent" onClick={save}>Save these numbers</button> {msg && <span role="status">{msg}</span>}
      </div>

      <div style={box}>
        <h2>What do I get with this many? <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>PLANNING SCENARIO</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.5rem' }}>
          {([['students', 'Students'], ['tutors', 'Tutors'], ['centres', 'Coaching centres'], ['schools', 'Schools'], ['handwrittenMocks', 'Handwritten mocks / month'], ['otherRevenue', 'Other revenue / month (₹)']] as [keyof Counts, string][]).map(([k, l]) => (
            <label key={k} style={{ fontSize: '0.88rem' }}>{l}<input className="field__input" type="number" min={0} value={c[k]} onChange={setCount(k)} /></label>
          ))}
        </div>
        <table style={{ borderCollapse: 'collapse', marginTop: '0.8rem' }}><tbody>
          <tr><td style={td}>Total revenue</td><td><strong>{inr(combo.revenue)}</strong></td></tr>
          <tr><td style={td}>Variable cost (AI, payment fees, handwritten)</td><td>{inr(combo.variableCost)}</td></tr>
          <tr><td style={td}>Fixed cost</td><td>{inr(combo.fixedCost)}</td></tr>
          <tr><td style={td}>Tax reserve</td><td>{inr(combo.tax)}</td></tr>
          <tr><td style={td}><strong>Net profit</strong></td><td><strong>{inr(combo.netProfit)}</strong></td></tr>
          <tr><td style={td}>Net margin</td><td>{combo.netMarginPct === null ? 'Insufficient data' : combo.netMarginPct + '%'}</td></tr>
        </tbody></table>
        <h3 style={{ marginTop: '1rem' }}>What do I need to add to reach {inr(gap.target)} net profit?</h3>
        {gap.reached ? <p>This mix already reaches the target in this scenario.</p> : (
          <>
            <p>Now {inr(gap.current)}; {inr(gap.shortfall)} short. Any one of these would close it in this scenario:</p>
            <ul>{gap.suggestions.map((g) => <li key={g.label}>Add {Object.entries(g.add).map(([k, n]) => `${(n as number).toLocaleString('en-IN')} ${k}`).join(', ')} ({g.label}) → net profit {inr(g.resultingNetProfit)}</li>)}</ul>
            {gap.note && <p className="alert">{gap.note}</p>}
          </>
        )}
        <p style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>Customers needed just to cover fixed costs (break-even): students {breakEvenCustomers(s, 'student') ?? 'n/a'}, tutors {breakEvenCustomers(s, 'tutor') ?? 'n/a'}, centres {breakEvenCustomers(s, 'centre') ?? 'n/a'}. Contribution per customer per month: student {inr(unitContribution(s, 'student'))}, tutor {inr(unitContribution(s, 'tutor'))}, centre {inr(unitContribution(s, 'centre'))}.</p>
      </div>

      <div style={box}>
        <h2>Student-only economics <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>PLANNING SCENARIO</span></h2>
        <p>Customers needed = required revenue ÷ average revenue per student (₹{s.arpuStudent.toLocaleString('en-IN')}). Required revenue = net profit ÷ margin.</p>
        {grid(s.arpuStudent, 'students')}
        <h3>Same ₹10 lakh target at other student averages (50% margin)</h3>
        <p>{STUDENT_ARPU_PRESETS.map((a) => `₹${a.toLocaleString('en-IN')}: ${Math.ceil(2000000 / a).toLocaleString('en-IN')} students`).join(' · ')}</p>
      </div>
      <div style={box}><h2>Tutor-only economics <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>PLANNING SCENARIO</span></h2>{grid(s.arpuTutor, 'tutors')}</div>
      <div style={box}><h2>Coaching-centre-only economics <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>PLANNING SCENARIO</span></h2>{grid(s.arpuCentre, 'centres')}</div>

      <div style={box}>
        <h2>Handwritten mock calculator <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>PLANNING SCENARIO</span></h2>
        {hw.incomplete && <p className="alert">No cost has been entered, so the contribution below is only the price minus payment fees. Enter the vision, reasoning, storage and review costs.</p>}
        <p>Price {inr(hw.price)} · cost per evaluation {inr(hw.costPerEval)} ({s.handwrittenImages} images) · contribution per evaluation <strong>{inr(hw.contributionPerEval)}</strong> · margin {hw.marginPct === null ? 'Insufficient data' : hw.marginPct + '%'} {hw.positive ? '' : '· NEGATIVE: the price does not cover the cost'}</p>
        <table style={{ borderCollapse: 'collapse' }}><thead><tr><th style={th}>Mocks / month</th><th style={th}>Revenue</th><th style={th}>Cost</th><th style={th}>Contribution</th></tr></thead>
          <tbody>{hw.scenarios.map((x) => <tr key={x.volume}><td style={td}>{x.volume.toLocaleString('en-IN')}</td><td style={td}>{inr(x.revenue)}</td><td style={td}>{inr(x.cost)}</td><td style={td}>{inr(x.contribution)}</td></tr>)}</tbody></table>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Total cost per evaluation used above: {inr(handwrittenCostPerEval(s))} before payment fees.</p>
      </div>
    </div>
  );
}
