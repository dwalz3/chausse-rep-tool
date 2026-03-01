interface TrendSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
}

// Pure SVG sparkline — Tufte: maximum data, minimum ink.
// Trims leading zeros, draws a line, dots the final value.
export default function TrendSparkline({
  data,
  width = 60,
  height = 24,
  strokeWidth = 1.5,
}: TrendSparklineProps) {
  // Drop leading zeros, keep at least 3 points
  let trimmed = [...data];
  while (trimmed.length > 3 && trimmed[0] === 0) trimmed.shift();
  if (trimmed.length < 2) return null;

  const min = Math.min(...trimmed);
  const max = Math.max(...trimmed);
  const range = max - min || 1;

  const pad = 2.5;
  const chartH = height - pad * 2;
  const xStep = (width - pad * 2) / (trimmed.length - 1);

  const pts = trimmed.map((v, i) => ({
    x: pad + i * xStep,
    y: pad + chartH * (1 - (v - min) / range),
  }));

  const polyPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const net = trimmed[trimmed.length - 1] - trimmed[0];
  const dotColor = net > 0 ? '#3FB950' : net < 0 ? '#F85149' : '#7D8590';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <polyline
        points={polyPoints}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill={dotColor} />
    </svg>
  );
}
