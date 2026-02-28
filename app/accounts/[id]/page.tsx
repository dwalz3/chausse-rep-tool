'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { ArrowLeft } from 'lucide-react';

const AccountRevenueChart = dynamic(
  () => import('@/components/dashboard/AccountRevenueChart'),
  { ssr: false }
);

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

  const account = useMemo(() => {
    if (!rc5Data) return null;
    return rc5Data.rows.find(
      (r) => r.accountCode === id || r.account === id
    ) ?? null;
  }, [rc5Data, id]);

  // Top wines from RA25 for this account
  const topWines = useMemo(() => {
    if (!ra25Data) return [];
    return ra25Data.rows
      .filter((r) => r.account.toLowerCase() === (account?.account ?? '').toLowerCase())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
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
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 6px' }}>
                {account.account}
              </h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusPill isDormant={account.isDormant} isNew={account.isNew} />
                {account.accountType && (
                  <span style={{ fontSize: 13, color: '#a8a29e' }}>{account.accountType}</span>
                )}
                {account.region && (
                  <span style={{ fontSize: 13, color: '#a8a29e' }}>· {account.region}</span>
                )}
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'flex', gap: 24, borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
            {[
              { label: '3-Mo Revenue', value: fmt$(three_mo) },
              { label: 'YTD Revenue', value: fmt$(ytd) },
              { label: 'All-Time', value: fmt$(account.totalRevenue) },
              { label: 'Active Months', value: account.activeMonths },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: 11, color: '#a8a29e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#1C1917' }}>{value}</p>
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
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>Top Wines Purchased</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E1DC' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: '#a8a29e', fontWeight: 500 }}>Wine</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#a8a29e', fontWeight: 500 }}>Revenue</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#a8a29e', fontWeight: 500 }}>Cases</th>
                </tr>
              </thead>
              <tbody>
                {topWines.map((w, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 0', color: '#1C1917' }}>{w.importer || w.account}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#1C1917' }}>{fmt$(w.totalRevenue)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#a8a29e' }}>{Math.round(w.totalQty / 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
