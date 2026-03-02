'use client';

import dynamic from 'next/dynamic';
import Shell from '@/components/layout/Shell';
import GoalProgressBar from '@/components/dashboard/GoalProgressBar';
import { useStore } from '@/store';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

const RepRevenueChart = dynamic(
  () => import('@/components/dashboard/RepRevenueChart'),
  { ssr: false }
);

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 flex-1 min-w-0">
      <p className="m-0 text-[11px] text-muted font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="m-0 text-xl sm:text-2xl font-bold text-text mb-0.5">{value}</p>
      {sub && <p className="m-0 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);
  const manualGoals = useStore((s) => s.manualGoals);
  const goalMultiplier = useStore((s) => s.goalMultiplier);
  const monthlyGoal = useStore((s) => s.monthlyGoal);

  const repRows = useMemo(
    () => (rc5Data && rep ? rc5Data.rows.filter((r) => r.primaryRep === rep) : []),
    [rc5Data, rep]
  );

  const currentYM = rc5Data?.monthLabels[rc5Data.monthLabels.length - 1] ?? '';
  const currentIdx = (rc5Data?.monthLabels.length ?? 1) - 1;

  const mtdRevenue = useMemo(
    () => repRows.reduce((s, r) => s + (r.monthlyRevenue[currentIdx] ?? 0), 0),
    [repRows, currentIdx]
  );

  const activeCount = useMemo(() => repRows.filter((r) => !r.isDormant).length, [repRows]);
  const dormantCount = useMemo(() => repRows.filter((r) => r.isDormant).length, [repRows]);

  // At-risk: active accounts where last month < 50% of 3-month avg
  const atRiskCount = useMemo(() => repRows.filter((r) => {
    if (r.isDormant || r.isNew) return false;
    const lastMo = r.monthlyRevenue[12];
    const avg = (r.monthlyRevenue[10] + r.monthlyRevenue[11] + r.monthlyRevenue[12]) / 3;
    return avg > 0 && lastMo < avg * 0.5 && lastMo > 0;
  }).length, [repRows]);

  // Same-month last year
  const lyIdx = currentIdx - 12;
  const lyRevenue = useMemo(
    () => lyIdx >= 0 ? repRows.reduce((s, r) => s + (r.monthlyRevenue[lyIdx] ?? 0), 0) : 0,
    [repRows, lyIdx]
  );

  const autoTarget = lyRevenue * goalMultiplier;
  const manualGoal = manualGoals.find((g) => g.rep === rep && g.yearMonth === currentYM);
  // Priority: manual override for this month > direct monthly goal > auto target
  const target = manualGoal?.manualTarget ?? (monthlyGoal > 0 ? monthlyGoal : autoTarget);
  const goalIsSet = target > 0;

  const priorIdx = currentIdx - 1;
  const priorRevenue = useMemo(
    () => priorIdx >= 0 ? repRows.reduce((s, r) => s + (r.monthlyRevenue[priorIdx] ?? 0), 0) : 0,
    [repRows, priorIdx]
  );

  const mtdDelta = mtdRevenue - priorRevenue;
  const mtdDeltaPct = priorRevenue > 0 ? (mtdDelta / priorRevenue) * 100 : 0;
  const mtdSub = priorRevenue > 0
    ? `${mtdDelta >= 0 ? '+' : ''}${mtdDeltaPct.toFixed(1)}% vs prior mo`
    : '';

  // Cap goal attainment display at 999%
  const attainmentPct = goalIsSet ? Math.min((mtdRevenue / target) * 100, 999) : 0;

  const ra21Data = useStore((s) => s.ra21Data);
  const ra30Data = useStore((s) => s.ra30Data);

  const topWine = ra21Data?.rows[0] ?? null;
  const newPlacementsCount = ra30Data?.recentPlacements.length ?? 0;

  const hasData = !!rc5Data && !!rep;

  return (
    <Shell>
      <div className="max-w-[960px] mx-auto w-full pb-8">
        <h1 className="text-2xl font-bold text-text m-0 mb-5">Dashboard</h1>

        {!hasData && (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">
            Upload RC5 data on the{' '}
            <a href="/upload" className="text-primary font-semibold hover:underline">Upload page</a>{' '}
            to see your dashboard.
          </div>
        )}

        {hasData && (
          <>
            {/* KPI row */}
            <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 mb-6">
              <div className="flex gap-3 flex-1">
                <KpiCard label="My Accounts" value={activeCount} sub={`${dormantCount} dormant`} />
                <KpiCard label="MTD Revenue" value={'$' + Math.round(mtdRevenue).toLocaleString()} sub={mtdSub} />
              </div>
              <div className="flex gap-3 flex-1">
                {goalIsSet ? (
                  <KpiCard
                    label="Goal Attainment"
                    value={attainmentPct.toFixed(0) + '%'}
                    sub={`of $${Math.round(target).toLocaleString()}`}
                  />
                ) : (
                  <div
                    className="bg-surface rounded-xl border border-dashed border-border p-4 sm:p-5 flex-1 min-w-0 cursor-pointer hover:border-text/30 transition-colors"
                    onClick={() => router.push('/settings')}
                  >
                    <p className="m-0 text-[11px] text-muted font-semibold uppercase tracking-wider mb-1">Goal Attainment</p>
                    <p className="m-0 text-xs sm:text-[13px] text-muted mt-1.5">Set a monthly goal in <span className="text-primary font-semibold">Settings →</span></p>
                  </div>
                )}
                <KpiCard label="Dormant" value={dormantCount} sub="need attention" />
              </div>
            </div>

            {/* Goal progress bar */}
            {goalIsSet && (
              <div className="mb-6">
                <GoalProgressBar actual={mtdRevenue} target={target} yearMonth={currentYM} />
              </div>
            )}

            {/* Revenue trend */}
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 mb-6">
              <h3 className="text-sm font-bold text-text m-0 mb-4 tracking-tight">Revenue Trend (13 months)</h3>
              <RepRevenueChart rc5Data={rc5Data} rep={rep!} />
            </div>

            {/* Priority Actions */}
            <h2 className="text-base font-bold text-text m-0 mb-4 tracking-tight">Today&apos;s Priorities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {/* Dormant card */}
              {dormantCount > 0 && (
                <div
                  onClick={() => router.push('/dormant')}
                  className="bg-surface rounded-xl border border-amber-500/30 p-4 sm:p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-500" />
                    <span className="text-[13px] font-bold text-text">Dormant Accounts</span>
                  </div>
                  <p className="m-0 text-2xl font-bold text-amber-600 dark:text-amber-500 group-hover:scale-105 origin-left transition-transform">{dormantCount}</p>
                  <p className="m-0 mt-1 text-xs text-muted">accounts need re-engagement →</p>
                </div>
              )}

              {/* At-Risk card */}
              {atRiskCount > 0 && (
                <div
                  onClick={() => router.push('/accounts')}
                  className="bg-surface rounded-xl border border-orange-500/30 p-4 sm:p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown size={16} className="text-orange-600 dark:text-orange-500" />
                    <span className="text-[13px] font-bold text-text">At-Risk Accounts</span>
                  </div>
                  <p className="m-0 text-2xl font-bold text-orange-600 dark:text-orange-500 group-hover:scale-105 origin-left transition-transform">{atRiskCount}</p>
                  <p className="m-0 mt-1 text-xs text-muted">dropping in last month →</p>
                </div>
              )}

              {/* Focus card — enhanced with RA21 top wine */}
              <div
                onClick={() => router.push('/focus')}
                className="bg-surface rounded-xl border border-primary/30 p-4 sm:p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="text-[13px] font-bold text-text">Focus List</span>
                </div>
                {topWine ? (
                  <>
                    <p className="m-0 text-xs text-muted truncate">
                      #1: {topWine.wineName || topWine.wineCode}
                    </p>
                    <p className="m-0 mt-1 text-xl font-bold text-primary group-hover:scale-105 origin-left transition-transform">
                      {'$' + Math.round(topWine.revenue).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="m-0 text-[13px] text-primary font-semibold">view top wines to push →</p>
                )}
              </div>

              {/* New Placements card */}
              {newPlacementsCount > 0 && (
                <div
                  onClick={() => router.push('/focus')}
                  className="bg-surface rounded-xl border border-blue-500/30 p-4 sm:p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-blue-600 dark:text-blue-500" />
                    <span className="text-[13px] font-bold text-text">New Placements</span>
                  </div>
                  <p className="m-0 text-2xl font-bold text-blue-600 dark:text-blue-500 group-hover:scale-105 origin-left transition-transform">{newPlacementsCount}</p>
                  <p className="m-0 mt-1 text-xs text-muted">in the last 90 days →</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
