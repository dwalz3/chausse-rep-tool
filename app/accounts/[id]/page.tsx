'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
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

function StatusPill({ isDormant, isNew }: { isDormant: boolean; isNew: boolean }) {
  const label = isNew ? 'New' : isDormant ? 'Dormant' : 'Active';
  const color = isNew ? '#2563eb' : isDormant ? '#d97706' : '#16a34a';
  const bg = isNew ? '#dbeafe' : isDormant ? '#fef3c7' : '#dcfce7';
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
  const accountNotes = useStore((s) => s.accountNotes);
  const setAccountNote = useStore((s) => s.setAccountNote);

  const [noteText, setNoteText] = useState<string | null>(null);

  const account = useMemo(() => {
    if (!rc5Data) return null;
    return rc5Data.rows.find((r) => r.accountCode === id || r.account === id) ?? null;
  }, [rc5Data, id]);

  const currentNote = noteText ?? (account ? (accountNotes[account.account] ?? '') : '');

  const handleNoteBlur = useCallback(() => {
    if (account && noteText !== null) {
      setAccountNote(account.account, noteText);
    }
  }, [account, noteText, setAccountNote]);

  // Wine properties and pricing lookups
  const winePropsMap = useMemo(() => {
    const map = new Map<string, { wineType: WineType; producer: string; wineName: string }>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        map.set(normCode(w.wineCode), { wineType: w.wineType, producer: w.producer, wineName: w.wineName || w.name });
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

  // Top wines: use RA25 wine-level rows filtered to this account, with wine props join
  const topWines = useMemo(() => {
    if (!ra25Data || !account) return [];
    const accountLower = account.account.toLowerCase();

    // Aggregate wine-level rows for this account
    const wineMap = new Map<string, { wineName: string; wineCode: string; revenue: number; qty: number; importer: string }>();
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
          importer: row.importer,
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
        <div style={{ padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>
          Upload RC5 data first.
        </div>
      </Shell>
    );
  }

  if (!account) {
    return (
      <Shell>
        <div style={{ padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>
          Account not found: <strong>{id}</strong>
        </div>
      </Shell>
    );
  }

  const three_mo = account.monthlyRevenue[10] + account.monthlyRevenue[11] + account.monthlyRevenue[12];
  const ytd = account.monthlyRevenue.slice(1).reduce((s, v) => s + v, 0);
  const avgMonthly = account.activeMonths > 0 ? Math.round(account.totalRevenue / account.activeMonths) : 0;

  // Prior 3-month period
  const prior3mo = account.monthlyRevenue[7] + account.monthlyRevenue[8] + account.monthlyRevenue[9];
  const trendPct = prior3mo > 0 ? ((three_mo - prior3mo) / prior3mo) * 100 : null;

  return (
    <Shell>
      <div style={{ maxWidth: 800 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#a8a29e', fontSize: 13, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={14} />
          Back to Accounts
        </button>

        {/* Header */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E1DC', padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 8px' }}>
                {account.account}
              </h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill isDormant={account.isDormant} isNew={account.isNew} />
                {account.accountType && (
                  <span style={{ fontSize: 12, backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: 4, padding: '2px 8px', fontWeight: 500 }}>
                    {account.accountType}
                  </span>
                )}
                {account.region && (
                  <span style={{ fontSize: 12, backgroundColor: '#EFF6FF', color: '#1D4ED8', borderRadius: 4, padding: '2px 8px', fontWeight: 500 }}>
                    {account.region}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #F3F4F6', paddingTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: '3-Mo Revenue', value: fmt$(three_mo),
                sub: trendPct !== null ? `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(0)}% vs prior` : undefined },
              { label: 'YTD Revenue', value: fmt$(ytd) },
              { label: 'All-Time', value: fmt$(account.totalRevenue) },
              { label: 'Avg/Month', value: avgMonthly > 0 ? fmt$(avgMonthly) : '—', sub: `${account.activeMonths} active mo` },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ flex: 1, minWidth: 120, padding: '0 16px 0 0' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#a8a29e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 700, color: '#1C1917' }}>{value}</p>
                {sub && <p style={{ margin: 0, fontSize: 11, color: trendPct !== null && label === '3-Mo Revenue' ? (trendPct >= 0 ? '#16a34a' : '#dc2626') : '#a8a29e' }}>{sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Revenue chart */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: '16px 20px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>Revenue by Month</h3>
          <AccountRevenueChart monthlyRevenue={account.monthlyRevenue} monthLabels={account.monthLabels} />
        </div>

        {/* Top wines */}
        {topWines.length > 0 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: '16px 20px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>Top Wines Purchased</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E1DC' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: '#a8a29e', fontWeight: 500 }}>Wine</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#a8a29e', fontWeight: 500 }}>Revenue</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#a8a29e', fontWeight: 500 }}>Cases</th>
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
                      style={{ borderBottom: '1px solid #F3F4F6', cursor: canNavigate ? 'pointer' : 'default' }}
                      onClick={() => canNavigate && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                      onMouseEnter={(e) => canNavigate && (e.currentTarget.style.backgroundColor = '#F9F9F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '8px 0', color: '#1C1917', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500 }}>{displayName}</div>
                        {props?.producer && <div style={{ fontSize: 11, color: '#a8a29e' }}>{props.producer}</div>}
                      </td>
                      <td style={{ padding: '8px 8px' }}>
                        {props && <WineTypeBadge type={props.wineType as WineType} />}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#1C1917' }}>{fmt$(w.revenue)}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#a8a29e' }}>{cases > 0 ? `${cases} cs` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Account Notes */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 10px' }}>Your Notes</h3>
          <textarea
            value={currentNote}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Add notes about this account — save on blur..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E1DC',
              borderRadius: 8,
              fontSize: 13,
              color: '#1C1917',
              backgroundColor: '#F9F9F9',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </Shell>
  );
}
