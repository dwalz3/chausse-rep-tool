'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { AlertCircle, X, ExternalLink } from 'lucide-react';

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

interface DormantRow {
  account: string;
  accountCode: string;
  accountType: string;
  lastActiveMonth: string | null;
  monthsSinceLast: number;
  ltm: number;
  rc3Priority: 'High' | 'Medium' | 'Low' | null;
  rc3Score: number | null;
}

interface ModalProps {
  row: DormantRow;
  onClose: () => void;
  onContacted: () => void;
}

function ReEngageModal({ row, onClose, onContacted }: ModalProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const setAccountNote = useStore((s) => s.setAccountNote);
  const markContacted = useStore((s) => s.markContacted);

  function handleMarkContacted() {
    if (notes) setAccountNote(row.account, notes);
    markContacted(row.account);
    onContacted();
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#161B22', borderRadius: 12, border: '1px solid #30363D', width: '100%', maxWidth: 480, padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#E6EDF3' }}>Re-engage</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#7D8590' }}>{row.account}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#7D8590' }}>
            <X size={18} />
          </button>
        </div>

        {/* Account summary */}
        <div style={{ backgroundColor: '#1C2128', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <div>
              <span style={{ color: '#7D8590' }}>Last active</span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#E6EDF3' }}>{fmtMonth(row.lastActiveMonth)}</p>
            </div>
            <div>
              <span style={{ color: '#7D8590' }}>LTM revenue</span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#E6EDF3' }}>{fmt$(row.ltm)}</p>
            </div>
            <div>
              <span style={{ color: '#7D8590' }}>Months since order</span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: row.monthsSinceLast >= 6 ? '#F85149' : '#E3B341' }}>
                {row.monthsSinceLast}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#E6EDF3', marginBottom: 6 }}>
            What will you say?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your pitch notes for this account..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #30363D', borderRadius: 8, fontSize: 13, color: '#E6EDF3', backgroundColor: '#1C2128', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleMarkContacted}
            style={{ flex: 1, backgroundColor: '#3FB950', color: '#161B22', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Mark as Contacted
          </button>
          <button
            onClick={() => { onClose(); router.push(`/accounts/${encodeURIComponent(row.accountCode || row.account)}`); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#161B22', color: '#E6EDF3', border: '1px solid #30363D', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            <ExternalLink size={13} />
            Open Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DormantPage() {
  const rc5Data = useStore((s) => s.rc5Data);
  const rc3Data = useStore((s) => s.rc3Data);
  const rep = useStore((s) => s.rep);
  const contactedAccounts = useStore((s) => s.contactedAccounts);
  const router = useRouter();

  const [modalRow, setModalRow] = useState<DormantRow | null>(null);
  const [recentlyContacted, setRecentlyContacted] = useState<Set<string>>(new Set());

  // Build RC3 lookup: accountName (lowercase) → { priorityScore, priority }
  const rc3Map = useMemo(() => {
    const map = new Map<string, { priorityScore: number; priority: 'High' | 'Medium' | 'Low' }>();
    if (rc3Data) {
      for (const r of rc3Data.rows) map.set(r.account.toLowerCase(), { priorityScore: r.priorityScore, priority: r.priority });
    }
    return map;
  }, [rc3Data]);

  const dormant = useMemo(() => {
    if (!rc5Data || !rep) return [];
    const rows = rc5Data.rows
      .filter((r) => r.primaryRep === rep && r.isDormant)
      .map((r) => {
        const rc3Entry = rc3Map.get(r.account.toLowerCase());
        return {
          account: r.account,
          accountCode: r.accountCode,
          accountType: r.accountType,
          lastActiveMonth: r.lastActiveMonth,
          monthsSinceLast: monthsSince(r.lastActiveMonth, rc5Data.monthLabels),
          ltm: r.monthlyRevenue.slice(0, 10).reduce((s, v) => s + v, 0),
          rc3Priority: rc3Entry?.priority ?? null,
          rc3Score: rc3Entry?.priorityScore ?? null,
        };
      });

    // If RC3 data available, sort by priorityScore; otherwise sort by ltm
    if (rc3Data) {
      rows.sort((a, b) => (b.rc3Score ?? b.ltm) - (a.rc3Score ?? a.ltm));
    } else {
      rows.sort((a, b) => b.ltm - a.ltm);
    }
    return rows;
  }, [rc5Data, rep, rc3Map, rc3Data]);

  const active = dormant.filter((r) => !recentlyContacted.has(r.account) && !contactedAccounts[r.account]);
  const contacted = dormant.filter((r) => recentlyContacted.has(r.account) || contactedAccounts[r.account]);

  // RC3-only accounts: in RC3 but not in RC5 dormant list
  const dormantAccountNames = useMemo(() => new Set(dormant.map((d) => d.account.toLowerCase())), [dormant]);
  const rc3OnlyAccounts = useMemo(() => {
    if (!rc3Data) return [];
    return rc3Data.rows.filter((r) => !dormantAccountNames.has(r.account.toLowerCase()));
  }, [rc3Data, dormantAccountNames]);

  const noData = !rc5Data || !rep;

  function DormantRow({ r }: { r: DormantRow }) {
    return (
      <tr
        onClick={() => router.push(`/accounts/${encodeURIComponent(r.accountCode || r.account)}`)}
        style={{ borderTop: '1px solid #21262D', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <td style={{ padding: '10px 16px', color: '#E6EDF3', fontWeight: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {r.account}
            {r.accountType && <span style={{ fontSize: 11, color: '#7D8590', fontWeight: 400 }}>{r.accountType}</span>}
            {r.rc3Priority === 'High' && (
              <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#3D0000', color: '#F85149', borderRadius: 4, padding: '1px 5px' }}>
                VS High
              </span>
            )}
            {r.rc3Priority === 'Medium' && (
              <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#2D2000', color: '#E3B341', borderRadius: 4, padding: '1px 5px' }}>
                VS Med
              </span>
            )}
          </div>
        </td>
        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#7D8590' }}>{fmtMonth(r.lastActiveMonth)}</td>
        <td style={{ padding: '10px 16px', textAlign: 'right', color: r.monthsSinceLast >= 6 ? '#F85149' : '#E3B341', fontWeight: 600 }}>
          {r.monthsSinceLast}
        </td>
        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#E6EDF3', fontWeight: 600 }}>{fmt$(r.ltm)}</td>
        <td style={{ padding: '10px 16px' }} onClick={(e) => e.stopPropagation()}>
          <span
            onClick={() => setModalRow(r)}
            style={{ backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 6, fontSize: 11, fontWeight: 600, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            <AlertCircle size={11} />
            Re-engage
          </span>
        </td>
      </tr>
    );
  }

  return (
    <Shell>
      {modalRow && (
        <ReEngageModal
          row={modalRow}
          onClose={() => setModalRow(null)}
          onContacted={() => setRecentlyContacted((s) => new Set([...s, modalRow.account]))}
        />
      )}

      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>Dormant Accounts</h1>
          {!noData && (
            <p style={{ fontSize: 13, color: '#7D8590', margin: '4px 0 0' }}>
              {active.length} accounts with no revenue in last 3 months · sorted by historical value
            </p>
          )}
        </div>

        {noData ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 32, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload RC5 data on the <a href="/upload" style={{ color: '#3FB950', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : dormant.length === 0 ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 32, textAlign: 'center', color: '#3FB950', fontSize: 14, fontWeight: 600 }}>
            No dormant accounts — great work!
          </div>
        ) : (
          <>
            {/* Active dormant */}
            {active.length > 0 && (
              <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ backgroundColor: '#1C2128' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Account</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Last Active</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Months Ago</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>LTM Revenue</th>
                      <th style={{ padding: '10px 16px', color: '#7D8590', fontWeight: 500 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((r) => <DormantRow key={r.accountCode || r.account} r={r} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* RC3-only accounts */}
            {rc3OnlyAccounts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Other Unloved Accounts — from Vinosmith RC3 ({rc3OnlyAccounts.length})
                </p>
                <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', opacity: 0.8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ backgroundColor: '#1C2128' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Account</th>
                        <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Priority</th>
                        <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>LTM Revenue</th>
                        <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Days Inactive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rc3OnlyAccounts.slice(0, 10).map((r) => (
                        <tr key={r.account} style={{ borderTop: '1px solid #21262D' }}>
                          <td style={{ padding: '8px 16px', color: '#E6EDF3' }}>{r.account}</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px', backgroundColor: r.priority === 'High' ? '#3D0000' : r.priority === 'Medium' ? '#2D2000' : '#21262D', color: r.priority === 'High' ? '#F85149' : r.priority === 'Medium' ? '#E3B341' : '#7D8590' }}>
                              {r.priority}
                            </span>
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', color: '#7D8590', fontVariantNumeric: 'tabular-nums' }}>{fmt$(r.ltmRevenue)}</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', color: '#E3B341', fontVariantNumeric: 'tabular-nums' }}>{r.daysSinceOrder ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Contacted section */}
            {contacted.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Contacted — Awaiting Response ({contacted.length})
                </p>
                <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', opacity: 0.7 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {contacted.map((r) => (
                        <tr
                          key={r.accountCode || r.account}
                          onClick={() => router.push(`/accounts/${encodeURIComponent(r.accountCode || r.account)}`)}
                          style={{ borderTop: '1px solid #21262D', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '10px 16px', color: '#7D8590', fontWeight: 500, textDecoration: 'line-through' }}>{r.account}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#7D8590' }}>{fmtMonth(r.lastActiveMonth)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#7D8590' }}>{fmt$(r.ltm)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 11, color: '#3FB950', fontWeight: 600 }}>✓ Contacted</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
