const BAND_COLOR: Record<string, string> = {
  mastered: '#3f7a5c',
  strong: '#3f7a5c',
  developing: '#c8811f',
  emerging: '#c8811f',
  needs_foundation: '#b5533c',
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/** A semicircular arc from 0deg to sweepDeg (0-180), protractor-style, left to right. */
function describeArc(cx: number, cy: number, r: number, sweepDeg: number) {
  const start = polarToCartesian(cx, cy, r, 0);
  const end = polarToCartesian(cx, cy, r, sweepDeg);
  const largeArcFlag = sweepDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function MasteryArc({ score, band, label, size = 96 }: { score: number; band: string; label: string; size?: number }) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2 - 4;
  const sweep = Math.max(0, Math.min(180, (score / 100) * 180));
  const color = BAND_COLOR[band] ?? '#6b7280';

  return (
    <div className="mastery-arc">
      <svg width={size} height={size / 1.7} viewBox={`0 0 ${size} ${size / 1.7}`} role="img" aria-label={`${label}: ${Math.round(score)} out of 100`}>
        <path d={describeArc(cx, cy, r, 180)} fill="none" stroke="var(--slate-light)" strokeWidth={7} strokeLinecap="round" />
        <path d={describeArc(cx, cy, r, sweep)} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <text x={cx} y={cy - 2} textAnchor="middle" className="mastery-arc__score">
          {Math.round(score)}
        </text>
      </svg>
      <span className="mastery-arc__label">{label}</span>
    </div>
  );
}
