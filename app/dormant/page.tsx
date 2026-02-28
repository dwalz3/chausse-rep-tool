'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { AlertCircle } from 'lucide-react';

function fmt$(n: number) {
  return n === 0 ? '—' : '$' + Math.round(n).toLocaleString();
}

function fmtMonth(ym: string | null) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function monthsSince(lastActiveMonth: string | null, currentLabels: string[]): number {
  if (!lastActiveMonth) return 99;
  const last = currentLabels.indexOf(lastActiveMonth);
  if (last === -1) return 99;
  return currentLabels.length - 1 - last;
}

export default function DormantPage() {
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);
  const router = useRouter();

  const dormant = useMemo(() => {
    if (!rc5Data || !rep) return [];
    return rc5Data.rows
      .filter((r) => r.primaryRep === rep && r.isDormant)
      .map((r) => ({
        ...r,
        monthsSinceLast: monthsSince(r.lastActiveMonth, rc5Data.monthLabels),
        ltm: r.monthlyRevenue.slice(0, 10).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.ltm - a.ltm);
  }, [rc5Data, rep]);

  const noData = !rc5Data || !rep;

  return (
    <Shell>
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0 }}>Dormant Accounts</h1>
          {!noData && (
            <p style={{ fontSize: 13, color: '#a8a29e', margin: '4px 0 0' }}>
              {dormant.length} accounts with no revenue in last 3 months · sorted by historical value
            </p>
          )}
        </div>

        {noData ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>
            Upload RC5 data on the <a href="/upload" style={{ color: '#2D5A3D', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : dormant.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: 32, textAlign: 'center', color: '#16a34a', fontSize: 14, fontWeight: 600 }}>
            No dormant accounts — great work!
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ backgroundColor: '#F9F9F9' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#a8a29e', fontWeight: 500 }}>Account</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', color: '#a8a29e', fontWeight: 500 }}>Last Active</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', color: '#a8a29e', fontWeight: 500 }}>Months Ago</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', color: '#a8a29e', fontWeight: 500 }}>LTM Revenue</th>
                  <th style={{ padding: '10px 16px', color: '#a8a29e', fontWeight: 500 }} />
                </tr>
              </thead>
              <tbody>
                {dormant.map((r) => (
                  <tr
                    key={r.accountCode || r.account}
                    onClick={() => router.push(`/accounts/${encodeURIComponent(r.accountCode || r.account)}`)}
                    style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9F9F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 16px', color: '#1C1917', fontWeight: 500 }}>
                      {r.account}
                      {r.accountType && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#a8a29e', fontWeight: 400 }}>{r.accountType}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#a8a29e' }}>
                      {fmtMonth(r.lastActiveMonth)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: r.monthsSinceLast >= 6 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                      {r.monthsSinceLast}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#1C1917', fontWeight: 600 }}>
                      {fmt$(r.ltm)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <AlertCircle size={11} />
                        Re-engage
                      </span>
                    </td>
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
