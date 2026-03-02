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

  // Use brand colors for progress
  const colorClass =
    attainment >= 100 ? 'bg-primary' :
      attainment >= 75 ? 'bg-accent' :
        'bg-red-500/80';

  const textClass =
    attainment >= 100 ? 'text-primary' :
      attainment >= 75 ? 'text-accent' :
        'text-red-500 dark:text-red-400';

  const label = new Date(yearMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-surface rounded-xl border border-border p-4 sm:p-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[13px] font-semibold text-text">{label} Goal</span>
        <span className={`text-[13px] font-bold ${textClass}`}>
          {attainment.toFixed(0)}%
        </span>
      </div>

      {/* Bar */}
      <div className="bg-black/5 dark:bg-white/10 rounded-md h-2 overflow-hidden mb-2 relative">
        <div
          className={`h-full rounded-md transition-[width] duration-400 ease-out ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted">
        <span>Actual: <span className="text-text font-semibold">{fmt$(actual)}</span></span>
        <span>Target: <span className="text-text font-semibold">{fmt$(target)}</span></span>
        <span>Delta: <span className={`font-semibold ${actual >= target ? 'text-primary' : 'text-red-500 dark:text-red-400'}`}>{fmt$(actual - target)}</span></span>
      </div>
    </div>
  );
}
