'use client';

interface GoalProgressBarProps {
  actual: number;
  target: number;
  yearMonth: string;
}

function fmt$(n: number) {
  return '$' + Math.round(n).toLocaleString();
}

export default function GoalProgressBar({ actual, target, yearMonth }: GoalProgressBarProps) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const attainment = target > 0 ? (actual / target) * 100 : 0;

  const color =
    attainment >= 100 ? '#3FB950' :
    attainment >= 75  ? '#E3B341' :
    '#F85149';

  const label = new Date(yearMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div
      style={{
        backgroundColor: '#161B22',
        borderRadius: 10,
        padding: '16px 20px',
        border: '1px solid #30363D',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E6EDF3' }}>{label} Goal</span>
        <span style={{ fontSize: 13, color, fontWeight: 700 }}>
          {attainment.toFixed(0)}%
        </span>
      </div>

      {/* Bar */}
      <div style={{ backgroundColor: '#21262D', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 6,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7D8590' }}>
        <span>Actual: <span style={{ color: '#E6EDF3', fontWeight: 600 }}>{fmt$(actual)}</span></span>
        <span>Target: <span style={{ color: '#E6EDF3', fontWeight: 600 }}>{fmt$(target)}</span></span>
        <span>Delta: <span style={{ color: actual >= target ? '#3FB950' : '#F85149', fontWeight: 600 }}>{fmt$(actual - target)}</span></span>
      </div>
    </div>
  );
}
