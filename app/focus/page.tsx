'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Ra25WineRow, WineType } from '@/types';

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

function fmt$(n: number) {
  return '$' + Math.round(n).toLocaleString();
}

function fmtMonth(ym: string | null) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function FocusPage() {
  const router = useRouter();
  const rc5Data = useStore((s) => s.rc5Data);
  const ra25Data = useStore((s) => s.ra25Data);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);
  const rep = useStore((s) => s.rep);

  const winePropsMap = useMemo(() => {
    const map = new Map<string, { wineType: WineType; producer: string; country: string }>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        map.set(normCode(w.wineCode), { wineType: w.wineType, producer: w.producer, country: w.country });
      }
    }
    return map;
  }, [winePropertiesData]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (pricingData) {
      for (const p of pricingData) {
        map.set(normCode(p.wineCode), p.defaultPrice);
      }
    }
    return map;
  }, [pricingData]);

  const repAccounts = useMemo(() => {
    if (!rc5Data || !rep) return new Set<string>();
    const s = new Set<string>();
    for (const r of rc5Data.rows) {
      if (r.primaryRep === rep) s.add(r.account.toLowerCase());
    }
    return s;
  }, [rc5Data, rep]);

  // Build wine-level totals filtered to this rep's accounts
  const wines = useMemo((): Ra25WineRow[] => {
    if (!ra25Data) return [];
    const { rows } = ra25Data;

    const filteredMap = new Map<string, { wineName: string; importer: string; revenue: number; casesSold: number; accounts: Set<string> }>();

    for (const row of rows) {
      if (repAccounts.size > 0 && !repAccounts.has(row.account.toLowerCase())) continue;
      const rawName = row.wineName || row.importer || '';
      if (!rawName) continue;
      const key = row.wineCode ? normCode(row.wineCode) : rawName.toUpperCase();
      const ex = filteredMap.get(key);
      if (ex) {
        ex.revenue += row.totalRevenue;
        ex.casesSold += row.totalQty;
        ex.accounts.add(row.account);
      } else {
        filteredMap.set(key, {
          wineName: rawName,
          importer: row.importer,
          revenue: row.totalRevenue,
          casesSold: row.totalQty,
          accounts: new Set([row.account]),
        });
      }
    }

    return Array.from(filteredMap.entries())
      .map(([key, v]) => ({
        wineCode: key,
        wineName: v.wineName,
        importer: v.importer,
        revenue: v.revenue,
        casesSold: v.casesSold,
        accountCount: v.accounts.size,
      }))
      .filter((w) => w.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [ra25Data, repAccounts]);

  // Dormant accounts with revenue history for reactivation
  const reactivateList = useMemo(() => {
    if (!rc5Data || !rep) return [];
    return rc5Data.rows
      .filter((r) => r.primaryRep === rep && r.isDormant && r.totalRevenue > 0)
      .map((r) => ({
        account: r.account,
        lastActive: r.lastActiveMonth,
        totalRevenue: r.totalRevenue,
        threeMo: r.monthlyRevenue.slice(9, 12).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8);
  }, [rc5Data, rep]);

  // KPI calculations
  const totalRevenue = wines.reduce((s, w) => s + w.revenue, 0);
  const avgRevPerAcct = repAccounts.size > 0 ? totalRevenue / repAccounts.size : 0;

  const pushList = wines.slice(0, 10);
  const watchList = wines.slice(10, 20);

  const noData = !ra25Data || !rep;

  function WineRow({ item, idx }: { item: Ra25WineRow; idx: number }) {
    const props = winePropsMap.get(item.wineCode);
    const price = priceMap.get(item.wineCode);

    return (
      <tr
        style={{ borderTop: '1px solid #21262D', cursor: props ? 'pointer' : 'default' }}
        onClick={() => props && router.push(`/portfolio/${encodeURIComponent(item.wineCode)}`)}
        onMouseEnter={(e) => props && (e.currentTarget.style.backgroundColor = '#1C2128')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <td style={{ padding: '9px 16px', color: '#7D8590', fontSize: 12, width: 32 }}>{idx + 1}</td>
        <td style={{ padding: '9px 16px', width: 80 }}>
          {props ? (
            <WineTypeBadge type={props.wineType} />
          ) : (
            <span style={{ fontSize: 11, backgroundColor: '#21262D', color: '#7D8590', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>—</span>
          )}
        </td>
        <td style={{ padding: '9px 16px', maxWidth: 280 }}>
          <div style={{ color: '#E6EDF3', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.wineName}
          </div>
          {props && (
            <div style={{ color: '#7D8590', fontSize: 11, marginTop: 1 }}>
              {props.producer}{props.country ? ` · ${props.country}` : ''}
            </div>
          )}
        </td>
        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {price && price > 0 ? `$${price.toFixed(2)}` : '—'}
        </td>
        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>
          {fmt$(item.revenue)}
        </td>
        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontVariantNumeric: 'tabular-nums' }}>
          {item.casesSold > 0 ? `${Math.round(item.casesSold / 12)} cs` : '—'}
        </td>
        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontSize: 12 }}>
          {item.accountCount} acct{item.accountCount !== 1 ? 's' : ''}
        </td>
      </tr>
    );
  }

  function WineSection({ title, items, icon, color }: { title: string; items: Ra25WineRow[]; icon: React.ReactNode; color: string }) {
    if (items.length === 0) return null;
    return (
      <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E6EDF3' }}>{title}</h3>
          <span style={{ fontSize: 12, color: '#7D8590' }}>({items.length})</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ backgroundColor: '#1C2128' }}>
            <tr>
              <th style={{ width: 32, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>#</th>
              <th style={{ width: 80, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Type</th>
              <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
              <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Price/btl</th>
              <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Revenue</th>
              <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Cases</th>
              <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Accts</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w, i) => <WineRow key={w.wineCode} item={w} idx={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 4px' }}>Focus List</h1>
        <p style={{ fontSize: 13, color: '#7D8590', margin: '0 0 20px' }}>
          Top performing wines and accounts to prioritize.
        </p>

        {noData ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 40, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload RA25 data on the{' '}
            <a href="/upload" style={{ color: '#3FB950', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Wine SKUs', value: wines.length.toLocaleString() },
                { label: 'Territory Revenue', value: totalRevenue > 0 ? fmt$(totalRevenue) : '—' },
                { label: 'Active Accounts', value: repAccounts.size.toLocaleString() },
                { label: 'Avg / Account', value: avgRevPerAcct > 0 ? fmt$(avgRevPerAcct) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, color: '#7D8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>

            {wines.length === 0 ? (
              <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 40, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
                No wine data found for your accounts.
              </div>
            ) : (
              <>
                <WineSection title="Expand These — Top Performers" items={pushList} icon={<TrendingUp size={16} />} color="#3FB950" />
                <WineSection title="Next Tier — Build Placement" items={watchList} icon={<TrendingDown size={16} />} color="#E3B341" />
              </>
            )}

            {/* Reactivate section */}
            {reactivateList.length > 0 && (
              <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#F85149' }}><RefreshCw size={16} /></span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E6EDF3' }}>Reactivate — Dormant Accounts</h3>
                  <span style={{ fontSize: 12, color: '#7D8590' }}>({reactivateList.length})</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ backgroundColor: '#1C2128' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Account</th>
                      <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Last Active</th>
                      <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Peak 3-Mo</th>
                      <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Lifetime Rev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reactivateList.map((acct) => (
                      <tr
                        key={acct.account}
                        style={{ borderTop: '1px solid #21262D' }}
                        onClick={() => router.push(`/accounts/${encodeURIComponent(acct.account)}`)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        className="cursor-pointer"
                      >
                        <td style={{ padding: '9px 16px', color: '#E6EDF3', fontWeight: 500 }}>{acct.account}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590' }}>
                          {fmtMonth(acct.lastActive)}
                        </td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontVariantNumeric: 'tabular-nums' }}>
                          {acct.threeMo > 0 ? fmt$(acct.threeMo) : '—'}
                        </td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt$(acct.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
