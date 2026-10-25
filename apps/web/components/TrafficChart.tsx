// Daily visitors (line) and page views (bars). Plain SVG, no library; scales to the width of the page.
export function TrafficChart({ daily }: { daily: Array<{ day: string; visitors: number; pageviews: number }> }) {
  const W = 760, H = 220, L = 38, R = 10, T = 12, B = 28;
  const max = Math.max(5, ...daily.map((d) => d.pageviews), ...daily.map((d) => d.visitors));
  const nice = (m: number) => { const p = Math.pow(10, Math.floor(Math.log10(m))); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const top = nice(max);
  const n = Math.max(1, daily.length);
  const bw = (W - L - R) / n;
  const x = (i: number) => L + i * bw + bw / 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const line = daily.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.visitors).toFixed(1)}`).join(' ');
  const every = Math.ceil(n / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily page views as bars and daily visitors as a line" style={{ width: '100%', height: 'auto', maxWidth: W }}>
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} stroke="var(--line, #ddd)" strokeWidth="1" /><text x={L - 6} y={y(top * f) + 4} fontSize="11" textAnchor="end" fill="var(--slate, #667)">{Math.round(top * f)}</text></g>)}
      {daily.map((d, i) => <rect key={d.day} x={x(i) - Math.max(1, bw * 0.34)} width={Math.max(2, bw * 0.68)} y={y(d.pageviews)} height={Math.max(0, H - B - y(d.pageviews))} fill="#9db9e4" rx="2"><title>{`${d.day}: ${d.pageviews} page views, ${d.visitors} visitors`}</title></rect>)}
      <path d={line} fill="none" stroke="#1b2a4a" strokeWidth="2.2" strokeLinejoin="round" />
      {daily.map((d, i) => (daily.length <= 45 ? <circle key={d.day} cx={x(i)} cy={y(d.visitors)} r="2.6" fill="#1b2a4a" /> : null))}
      {daily.map((d, i) => (i % every === 0 ? <text key={d.day} x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill="var(--slate, #667)">{d.day.slice(5)}</text> : null))}
    </svg>
  );
}
