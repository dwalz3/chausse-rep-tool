'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import WineTypeBadge from '@/components/ui/WineTypeBadge';
import TrendSparkline from '@/components/ui/TrendSparkline';
import SidenoteField from '@/components/ui/SidenoteField';
import AccountNotes from '@/components/ui/AccountNotes';
import { ArrowLeft } from 'lucide-react';
import { WineType } from '@/types';

const AccountRevenueChart = dynamic(
  () => import('@/components/dashboard/AccountRevenueChart'),
  { ssr: false }
);

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

function fmt$(n: number) {
  return n === 0 ? '—' : '$' + Math.round(n).toLocaleString();
}

function fmtMonth(ym: string | null) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function StatusPill({ isDormant, isNew }: { isDormant: boolean; isNew: boolean }) {
  const label = isNew ? 'New' : isDormant ? 'Dormant' : 'Active';
  const textClass = isNew ? 'text-blue-700 dark:text-blue-300' : isDormant ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300';
  const bgClass = isNew ? 'bg-blue-100 dark:bg-blue-900/40' : isDormant ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-green-100 dark:bg-green-900/40';
  return (
    <span className={`rounded-full text-xs font-semibold px-2.5 py-1 whitespace-nowrap ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(String(params.id ?? ''));

  const rc5Data = useStore((s) => s.rc5Data);
  const ra23Data = useStore((s) => s.ra23Data);
  const ra25Data = useStore((s) => s.ra25Data);
  const ra21Data = useStore((s) => s.ra21Data);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);

  const account = useMemo(() => {
    if (!rc5Data) return null;
    return rc5Data.rows.find((r) => r.accountCode === id || r.account === id) ?? null;
  }, [rc5Data, id]);

  const winePropsMap = useMemo(() => {
    const map = new Map<string, { wineType: WineType; producer: string; wineName: string }>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        map.set(normCode(w.wineCode), { wineType: w.wineType, producer: w.producer, wineName: w.wineName || w.name });
      }
    }
    return map;
  }, [winePropertiesData]);

  // priceMap used for potential future per-wine price display
  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (pricingData) {
      for (const p of pricingData) {
        map.set(normCode(p.wineCode), p.defaultPrice);
      }
    }
    return map;
  }, [pricingData]);
  void priceMap; // reserved for future use

  // Prefer RA23 (account × wine detail); fall back to RA25
  const topWines = useMemo(() => {
    if (!account) return [];
    const accountLower = account.account.toLowerCase();
    const wineMap = new Map<string, { wineName: string; wineCode: string; revenue: number; qty: number }>();

    if (ra23Data && ra23Data.rows.length > 0) {
      for (const row of ra23Data.rows) {
        if (row.account.toLowerCase() !== accountLower) continue;
        const rawName = row.wineName || row.wineCode || '';
        if (!rawName) continue;
        const key = row.wineCode ? normCode(row.wineCode) : rawName.toUpperCase();
        const ex = wineMap.get(key);
        if (ex) { ex.revenue += row.revenue; ex.qty += row.qty; }
        else wineMap.set(key, { wineName: rawName, wineCode: row.wineCode ? normCode(row.wineCode) : key, revenue: row.revenue, qty: row.qty });
      }
    } else if (ra25Data) {
      for (const row of ra25Data.rows) {
        if (row.account.toLowerCase() !== accountLower) continue;
        const rawName = row.wineName || '';
        if (!rawName) continue;
        const key = row.wineCode ? normCode(row.wineCode) : rawName.toUpperCase();
        const ex = wineMap.get(key);
        if (ex) { ex.revenue += row.totalRevenue; ex.qty += row.totalQty; }
        else wineMap.set(key, { wineName: rawName, wineCode: row.wineCode ? normCode(row.wineCode) : key, revenue: row.totalRevenue, qty: row.totalQty });
      }
    }

    return Array.from(wineMap.values())
      .filter((w) => w.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [ra23Data, ra25Data, account]);

  // "Suggest These Next" — wines from RA21 not yet ordered by this account
  const suggestNext = useMemo(() => {
    if (!ra21Data || !account) return [];
    const purchasedCodes = new Set(topWines.map((w) => normCode(w.wineCode)));
    return ra21Data.rows
      .filter((r) => r.wineCode && !purchasedCodes.has(normCode(r.wineCode)))
      .slice(0, 5);
  }, [ra21Data, topWines, account]);

  if (!rc5Data) {
    return (
      <Shell>
        <div style={{ padding: 32, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
          Upload RC5 data first.
        </div>
      </Shell>
    );
  }

  if (!account) {
    return (
      <Shell>
        <div style={{ padding: 32, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
          Account not found: <strong>{id}</strong>
        </div>
      </Shell>
    );
  }

  const three_mo = account.monthlyRevenue[10] + account.monthlyRevenue[11] + account.monthlyRevenue[12];
  const ytd = account.monthlyRevenue.slice(1).reduce((s, v) => s + v, 0);
  const avgMonthly = account.activeMonths > 0 ? Math.round(account.totalRevenue / account.activeMonths) : 0;
  const prior3mo = account.monthlyRevenue[7] + account.monthlyRevenue[8] + account.monthlyRevenue[9];
  const trendPct = prior3mo > 0 ? ((three_mo - prior3mo) / prior3mo) * 100 : null;
  const trendColor = trendPct !== null ? (trendPct >= 0 ? '#3FB950' : '#F85149') : '#7D8590';

  return (
    <Shell>
      <div className="max-w-[1000px] mx-auto w-full pb-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-muted text-[13px] mb-5 p-0 hover:text-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Accounts
        </button>

        {/* Header card — full width */}
        <div className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-5">
          {/* Name + sparkline row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-text m-0 mb-2 leading-tight">
                {account.account}
              </h1>
              <div className="flex gap-2 items-center flex-wrap">
                <StatusPill isDormant={account.isDormant} isNew={account.isNew} />
                {account.accountType && (
                  <span className="text-[11px] bg-black/5 dark:bg-white/10 text-muted rounded p-1 px-2 font-medium">
                    {account.accountType}
                  </span>
                )}
                {account.region && (
                  <span className="text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded p-1 px-2 font-medium">
                    {account.region}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:block">
              <TrendSparkline data={account.monthlyRevenue} width={80} height={28} />
            </div>
          </div>

          {/* KPI grid — 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border/50 pt-4 gap-4 md:gap-0">
            {[
              {
                label: '3-Mo Revenue',
                value: fmt$(three_mo),
                sub: trendPct !== null ? `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(0)}% vs prior` : 'no prior period',
                subColorClass: trendPct !== null ? (trendPct >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500') : 'text-muted',
              },
              { label: 'YTD Revenue', value: fmt$(ytd), sub: 'calendar year', subColorClass: 'text-muted' },
              { label: 'All-Time', value: fmt$(account.totalRevenue), sub: `${account.activeMonths} mo active`, subColorClass: 'text-muted' },
              { label: 'Avg / Month', value: avgMonthly > 0 ? fmt$(avgMonthly) : '—', sub: 'active months only', subColorClass: 'text-muted' },
            ].map(({ label, value, sub, subColorClass }) => (
              <div key={label} className="md:pr-3">
                <p className="m-0 text-[10px] text-muted font-semibold uppercase tracking-wider mb-1">
                  {label}
                </p>
                <p className="m-0 text-xl font-bold text-text mb-0.5">{value}</p>
                <p className={`m-0 text-[11px] ${subColorClass}`}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout: main + sidenote sidebar */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Main column — chart + top wines */}
          <div className="flex-1 min-w-0 w-full">
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 mb-4">
              <h3 className="text-sm font-bold text-text m-0 mb-4 tracking-tight">Revenue by Month</h3>
              <AccountRevenueChart monthlyRevenue={account.monthlyRevenue} monthLabels={account.monthLabels} />
            </div>

            {topWines.length > 0 && (
              <div className="bg-surface rounded-xl border border-border pt-5 pb-0 mb-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-4 px-5">
                  <h3 className="text-sm font-bold text-text m-0">Top Wines Purchased</h3>
                  {ra23Data && (
                    <span className="text-[11px] bg-primary/10 text-primary rounded px-1.5 py-0.5 font-semibold">
                      RA23
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full border-collapse text-[13px] min-w-[400px]">
                    <thead className="bg-black/5 dark:bg-white/5 border-y border-border/50">
                      <tr>
                        <th className="text-left py-2 px-5 text-muted font-medium whitespace-nowrap">Wine</th>
                        <th className="text-left py-2 px-2 text-muted font-medium whitespace-nowrap">Type</th>
                        <th className="text-right py-2 px-5 text-muted font-medium whitespace-nowrap">Revenue</th>
                        <th className="text-right py-2 px-5 text-muted font-medium whitespace-nowrap">Cases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topWines.map((w, i) => {
                        const props = winePropsMap.get(w.wineCode);
                        const displayName = props?.wineName || w.wineName;
                        const cases = w.qty > 0 ? Math.round(w.qty / 12) : 0;
                        const canNavigate = !!props;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-border/50 last:border-0 transition-colors ${canNavigate ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                            onClick={() => canNavigate && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                          >
                            <td className="py-3 px-5 text-text truncate max-w-[200px] sm:max-w-xs">
                              <div className="font-medium text-text truncate">{displayName}</div>
                              {props?.producer && <div className="text-[11px] text-muted truncate">{props.producer}</div>}
                            </td>
                            <td className="py-3 px-2">
                              {props && <WineTypeBadge type={props.wineType} />}
                            </td>
                            <td className="py-3 px-5 text-right font-semibold text-text whitespace-nowrap">{fmt$(w.revenue)}</td>
                            <td className="py-3 px-5 text-right text-muted whitespace-nowrap">{cases > 0 ? `${cases} cs` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suggest These Next */}
            {suggestNext.length > 0 && (
              <div className="bg-surface rounded-xl border border-border pt-5 pb-0 mb-4 overflow-hidden">
                <div className="px-5 mb-4">
                  <h3 className="text-sm font-bold text-blue-500 m-0 mb-1">Suggest These Next</h3>
                  <p className="m-0 text-xs text-muted">Top wines this account hasn&apos;t ordered yet.</p>
                </div>
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full border-collapse text-[13px] min-w-[400px]">
                    <thead className="bg-black/5 dark:bg-white/5 border-y border-border/50">
                      <tr>
                        <th className="py-2 px-5 w-10"></th>
                        <th className="text-left py-2 px-2 text-muted font-medium whitespace-nowrap">Type</th>
                        <th className="text-left py-2 px-5 text-muted font-medium whitespace-nowrap">Wine</th>
                        <th className="text-right py-2 px-5 text-muted font-medium whitespace-nowrap">Global Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestNext.map((w, i) => {
                        const props = winePropsMap.get(normCode(w.wineCode));
                        return (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            onClick={() => w.wineCode && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                          >
                            <td className="py-3 px-5 text-muted text-xs whitespace-nowrap">#{w.rank}</td>
                            <td className="py-3 px-2">
                              {props && <WineTypeBadge type={props.wineType} />}
                            </td>
                            <td className="py-3 px-5 text-text truncate max-w-[180px] sm:max-w-xs">
                              <div className="font-medium text-text truncate">{props?.wineName || w.wineName}</div>
                              {props?.producer && <div className="text-[11px] text-muted truncate">{props.producer}</div>}
                            </td>
                            <td className="py-3 px-5 text-right text-muted tabular-nums whitespace-nowrap">
                              {w.revenue > 0 ? fmt$(w.revenue) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidenote sidebar — metadata + notes */}
          <div className="w-full xl:w-[260px] shrink-0 flex flex-col gap-4">
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-5">
              {account.region && (
                <SidenoteField label="Territory">{account.region}</SidenoteField>
              )}
              {account.accountType && (
                <SidenoteField label="Account Type">{account.accountType}</SidenoteField>
              )}
              <SidenoteField label="Status">
                <StatusPill isDormant={account.isDormant} isNew={account.isNew} />
              </SidenoteField>
              <SidenoteField label="Last Active">{fmtMonth(account.lastActiveMonth)}</SidenoteField>
              {account.primaryRep && account.primaryRep !== 'unknown' && account.primaryRep !== 'shared' && (
                <SidenoteField label="Primary Rep">
                  <span className="capitalize">{account.primaryRep}</span>
                </SidenoteField>
              )}
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-5">
              <AccountNotes accountName={account.account} />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
