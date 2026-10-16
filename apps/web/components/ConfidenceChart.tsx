// Small inline-SVG line chart of self-reported confidence (0-10) over the
// most recent check-ins. Server-renderable (no client JS). Shows the points
// that exist — never interpolates or invents values.
export function ConfidenceChart({ series }: { series: { date: string; value: number }[] }) {
  if (series.length < 2) return null;
  const W = 320;
  const H = 110;
  const padX = 22;
  const padY = 14;
  const stepX = (W - padX * 2) / (series.length - 1);
  const y = (v: number) => padY + (1 - v / 10) * (H - padY * 2);
  const pts = series.map((p, i) => `${padX + i * stepX},${y(p.value)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 360 }}
      role="img"
      aria-label={`Confidence over the last ${series.length} check-ins, from ${series[0].value} to ${series[series.length - 1].value} out of 10`}
    >
      {[0, 5, 10].map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="#c8d0dc" strokeWidth="1" strokeDasharray={g === 5 ? '3 3' : undefined} />
          <text x={4} y={y(g) + 3} fontSize="9" fill="#5b6778">
            {g}
          </text>
        </g>
      ))}
      <polyline points={pts} fill="none" stroke="#c8811f" strokeWidth="2" strokeLinejoin="round" />
      {series.map((p, i) => (
        <circle key={i} cx={padX + i * stepX} cy={y(p.value)} r="3" fill="#1b2a4a">
          <title>{`${p.date}: ${p.value}/10`}</title>
        </circle>
      ))}
    </svg>
  );
}
