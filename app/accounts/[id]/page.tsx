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
  const color = isNew ? '#58A6FF' : isDormant ? '#E3B341' : '#3FB950';
  const bg = isNew ? '#031D41' : isDormant ? '#2D2000' : '#0D2918';
  return (
    <span style={{ backgroundColor: bg, color, borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '3px 10px' }}>
      {label}
    </span>
  );
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(String(params.id ?? ''));

  const rc5Data = useStore((s) => s.rc5Data);
  const ra25Data = useStore((s) => s.ra25Data);
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

  const topWines = useMemo(() => {
    if (!ra25Data || !account) return [];
    const accountLower = account.account.toLowerCase();
    const wineMap = new Map<string, { wineName: string; wineCode: string; revenue: number; qty: number }>();
    for (const row of ra25Data.rows) {
      if (row.account.toLowerCase() !== accountLower) continue;
      const rawName = row.wineName || row.importer || '';
      if (!rawName) continue;
      const key = row.wineCode ? normCode(row.wineCode) : rawName.toUpperCase();
      const ex = wineMap.get(key);
      if (ex) {
        ex.revenue += row.totalRevenue;
        ex.qty += row.totalQty;
      } else {
        wineMap.set(key, {
          wineName: rawName,
          wineCode: row.wineCode ? normCode(row.wineCode) : key,
          revenue: row.totalRevenue,
          qty: row.totalQty,
        });
      }
    }
    return Array.from(wineMap.values())
      .filter((w) => w.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [ra25Data, account]);

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
      <div style={{ maxWidth: 960 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#7D8590', fontSize: 13, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={14} />
          Back to Accounts
        </button>

        {/* Header card — full width */}
        <div style={{ backgroundColor: '#161B22', borderRadius: 12, border: '1px solid #30363D', padding: '20px 24px', marginBottom: 20 }}>
          {/* Name + sparkline row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 8px' }}>
                {account.account}
              </h1>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill isDormant={account.isDormant} isNew={account.isNew} />
                {account.accountType && (
                  <span style={{ fontSize: 11, backgroundColor: '#21262D', color: '#8B949E', borderRadius: 4, padding: '2px 7px', fontWeight: 500 }}>
                    {account.accountType}
                  </span>
                )}
                {account.region && (
                  <span style={{ fontSize: 11, backgroundColor: '#031D41', color: '#58A6FF', borderRadius: 4, padding: '2px 7px', fontWeight: 500 }}>
                    {account.region}
                  </span>
                )}
              </div>
            </div>
            <TrendSparkline data={account.monthlyRevenue} width={80} height={28} />
          </div>

          {/* KPI grid — 4 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #21262D', paddingTop: 16, gap: 0 }}>
            {[
              {
                label: '3-Mo Revenue',
                value: fmt$(three_mo),
                sub: trendPct !== null ? `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(0)}% vs prior` : 'no prior period',
                subColor: trendColor,
              },
              { label: 'YTD Revenue', value: fmt$(ytd), sub: 'calendar year', subColor: '#7D8590' },
              { label: 'All-Time', value: fmt$(account.totalRevenue), sub: `${account.activeMonths} mo active`, subColor: '#7D8590' },
              { label: 'Avg / Month', value: avgMonthly > 0 ? fmt$(avgMonthly) : '—', sub: 'active months only', subColor: '#7D8590' },
            ].map(({ label, value, sub, subColor }) => (
              <div key={label} style={{ padding: '0 12px 0 0' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#7D8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {label}
                </p>
                <p style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 700, color: '#E6EDF3' }}>{value}</p>
                <p style={{ margin: 0, fontSize: 11, color: subColor }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout: main + sidenote sidebar */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Main column — chart + top wines */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3', margin: '0 0 12px' }}>Revenue by Month</h3>
              <AccountRevenueChart monthlyRevenue={account.monthlyRevenue} monthLabels={account.monthLabels} />
            </div>

            {topWines.length > 0 && (
              <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 20px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3', margin: '0 0 12px' }}>Top Wines Purchased</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #30363D' }}>
                      <th style={{ textAlign: 'left', padding: '5px 0', color: '#7D8590', fontWeight: 500, fontSize: 11 }}>Wine</th>
                      <th style={{ textAlign: 'left', padding: '5px 8px', color: '#7D8590', fontWeight: 500, fontSize: 11 }}>Type</th>
                      <th style={{ textAlign: 'right', padding: '5px 0', color: '#7D8590', fontWeight: 500, fontSize: 11 }}>Revenue</th>
                      <th style={{ textAlign: 'right', padding: '5px 0', color: '#7D8590', fontWeight: 500, fontSize: 11 }}>Cases</th>
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
                          style={{ borderBottom: '1px solid #21262D', cursor: canNavigate ? 'pointer' : 'default' }}
                          onClick={() => canNavigate && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                          onMouseEnter={(e) => canNavigate && (e.currentTarget.style.backgroundColor = '#1C2128')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '7px 0', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 500, color: '#E6EDF3' }}>{displayName}</div>
                            {props?.producer && <div style={{ fontSize: 11, color: '#7D8590' }}>{props.producer}</div>}
                          </td>
                          <td style={{ padding: '7px 8px' }}>
                            {props && <WineTypeBadge type={props.wineType} />}
                          </td>
                          <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 600, color: '#E6EDF3' }}>{fmt$(w.revenue)}</td>
                          <td style={{ padding: '7px 0', textAlign: 'right', color: '#7D8590' }}>{cases > 0 ? `${cases} cs` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sidenote sidebar — metadata + notes */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 18px', marginBottom: 16 }}>
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
                  <span style={{ textTransform: 'capitalize' }}>{account.primaryRep}</span>
                </SidenoteField>
              )}
            </div>
            <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 18px' }}>
              <AccountNotes accountName={account.account} />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
