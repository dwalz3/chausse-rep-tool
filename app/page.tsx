'use client';

import dynamic from 'next/dynamic';
import Shell from '@/components/layout/Shell';
import GoalProgressBar from '@/components/dashboard/GoalProgressBar';
import IncomingWinesSection from '@/components/dashboard/IncomingWinesSection';
import { useStore } from '@/store';
import { useMemo } from 'react';

const RepRevenueChart = dynamic(
  () => import('@/components/dashboard/RepRevenueChart'),
  { ssr: false }
);

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        border: '1px solid #E5E1DC',
        padding: '18px 20px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: '#a8a29e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 2px', fontSize: 26, fontWeight: 700, color: '#1C1917' }}>
        {value}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: '#a8a29e' }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);
  const manualGoals = useStore((s) => s.manualGoals);
  const goalMultiplier = useStore((s) => s.goalMultiplier);

  const repRows = useMemo(
    () => (rc5Data && rep ? rc5Data.rows.filter((r) => r.primaryRep === rep) : []),
    [rc5Data, rep]
  );

  // Current month = last label in monthLabels
  const currentYM = rc5Data?.monthLabels[rc5Data.monthLabels.length - 1] ?? '';
  const currentIdx = (rc5Data?.monthLabels.length ?? 1) - 1;

  // MTD revenue = last month's sum for this rep
  const mtdRevenue = useMemo(
    () => repRows.reduce((s, r) => s + (r.monthlyRevenue[currentIdx] ?? 0), 0),
    [repRows, currentIdx]
  );

  // Active accounts
  const activeCount = useMemo(
    () => repRows.filter((r) => !r.isDormant).length,
    [repRows]
  );

  // Dormant count
  const dormantCount = useMemo(
    () => repRows.filter((r) => r.isDormant).length,
    [repRows]
  );

  // Same-month last year (index currentIdx - 12, or 0 if unavailable)
  const lyIdx = currentIdx - 12;
  const lyRevenue = useMemo(
    () => lyIdx >= 0 ? repRows.reduce((s, r) => s + (r.monthlyRevenue[lyIdx] ?? 0), 0) : 0,
    [repRows, lyIdx]
  );

  // Auto target
  const autoTarget = lyRevenue * goalMultiplier;

  // Check for manual goal override for current month
  const manualGoal = manualGoals.find((g) => g.rep === rep && g.yearMonth === currentYM);
  const target = manualGoal?.manualTarget ?? autoTarget;

  // Prior month revenue (for MTD comparison)
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

  const hasData = !!rc5Data && !!rep;

  return (
    <Shell>
      <div style={{ maxWidth: 960 }}>
        {/* Header */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 20px' }}>
          Dashboard
        </h1>

        {!hasData && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              border: '1px solid #E5E1DC',
              padding: '32px',
              textAlign: 'center',
              color: '#a8a29e',
              fontSize: 14,
            }}
          >
            Upload RC5 data on the{' '}
            <a href="/upload" style={{ color: '#2D5A3D', fontWeight: 600 }}>Upload page</a>{' '}
            to see your dashboard.
          </div>
        )}

        {hasData && (
          <>
            {/* KPI row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <KpiCard
                label="My Accounts"
                value={activeCount}
                sub={`${dormantCount} dormant`}
              />
              <KpiCard
                label="MTD Revenue"
                value={'$' + Math.round(mtdRevenue).toLocaleString()}
                sub={mtdSub}
              />
              <KpiCard
                label="Goal Attainment"
                value={target > 0 ? (mtdRevenue / target * 100).toFixed(0) + '%' : '—'}
                sub={target > 0 ? `of $${Math.round(target).toLocaleString()}` : 'No target set'}
              />
              <KpiCard
                label="Dormant"
                value={dormantCount}
                sub="need attention"
              />
            </div>

            {/* Goal progress bar */}
            {target > 0 && (
              <div style={{ marginBottom: 16 }}>
                <GoalProgressBar actual={mtdRevenue} target={target} yearMonth={currentYM} />
              </div>
            )}

            {/* Revenue trend */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 10,
                border: '1px solid #E5E1DC',
                padding: '16px 20px',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
                Revenue Trend (13 months)
              </h3>
              <RepRevenueChart rc5Data={rc5Data} rep={rep!} />
            </div>

            {/* Incoming wines */}
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
              Incoming Wines
            </h2>
            <IncomingWinesSection />
          </>
        )}
      </div>
    </Shell>
  );
}
