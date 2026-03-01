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
    <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '18px 20px', flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#7D8590', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '6px 0 2px', fontSize: 26, fontWeight: 700, color: '#E6EDF3' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: '#7D8590' }}>{sub}</p>}
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

  const hasData = !!rc5Data && !!rep;

  return (
    <Shell>
      <div style={{ maxWidth: 960 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 20px' }}>Dashboard</h1>

        {!hasData && (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '32px', textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload RC5 data on the{' '}
            <a href="/upload" style={{ color: '#3FB950', fontWeight: 600 }}>Upload page</a>{' '}
            to see your dashboard.
          </div>
        )}

        {hasData && (
          <>
            {/* KPI row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <KpiCard label="My Accounts" value={activeCount} sub={`${dormantCount} dormant`} />
              <KpiCard label="MTD Revenue" value={'$' + Math.round(mtdRevenue).toLocaleString()} sub={mtdSub} />
              {goalIsSet ? (
                <KpiCard
                  label="Goal Attainment"
                  value={attainmentPct.toFixed(0) + '%'}
                  sub={`of $${Math.round(target).toLocaleString()}`}
                />
              ) : (
                <div
                  style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px dashed #30363D', padding: '18px 20px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => router.push('/settings')}
                >
                  <p style={{ margin: 0, fontSize: 12, color: '#7D8590', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goal Attainment</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#7D8590' }}>Set a monthly goal in <span style={{ color: '#3FB950', fontWeight: 600 }}>Settings →</span></p>
                </div>
              )}
              <KpiCard label="Dormant" value={dormantCount} sub="need attention" />
            </div>

            {/* Goal progress bar */}
            {goalIsSet && (
              <div style={{ marginBottom: 16 }}>
                <GoalProgressBar actual={mtdRevenue} target={target} yearMonth={currentYM} />
              </div>
            )}

            {/* Revenue trend */}
            <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E6EDF3', margin: '0 0 12px' }}>Revenue Trend (13 months)</h3>
              <RepRevenueChart rc5Data={rc5Data} rep={rep!} />
            </div>

            {/* Priority Actions */}
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E6EDF3', margin: '0 0 12px' }}>Today&apos;s Priorities</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Dormant card */}
              {dormantCount > 0 && (
                <div
                  onClick={() => router.push('/dormant')}
                  style={{ flex: 1, minWidth: 200, backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #FEF3C7', padding: '16px 18px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2020')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#161B22')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AlertCircle size={16} color="#E3B341" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3' }}>Dormant Accounts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#E3B341' }}>{dormantCount}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7D8590' }}>accounts need re-engagement →</p>
                </div>
              )}

              {/* At-Risk card */}
              {atRiskCount > 0 && (
                <div
                  onClick={() => router.push('/accounts')}
                  style={{ flex: 1, minWidth: 200, backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #FEF3C7', padding: '16px 18px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2020')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#161B22')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TrendingDown size={16} color="#C8922B" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3' }}>At-Risk Accounts</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#C8922B' }}>{atRiskCount}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7D8590' }}>dropping in last month →</p>
                </div>
              )}

              {/* Focus card */}
              <div
                onClick={() => router.push('/focus')}
                style={{ flex: 1, minWidth: 200, backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #D1FAE5', padding: '16px 18px', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0D2918')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#161B22')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TrendingUp size={16} color="#3FB950" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3' }}>Focus List</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#3FB950', fontWeight: 600 }}>Top performers</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7D8590' }}>view your top wines to push →</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
