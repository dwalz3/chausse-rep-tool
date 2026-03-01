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
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E1DC', width: '100%', maxWidth: 480, padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1C1917' }}>Re-engage</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#a8a29e' }}>{row.account}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#a8a29e' }}>
            <X size={18} />
          </button>
        </div>

        {/* Account summary */}
        <div style={{ backgroundColor: '#F9F9F9', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <div>
              <span style={{ color: '#a8a29e' }}>Last active</span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#1C1917' }}>{fmtMonth(row.lastActiveMonth)}</p>
            </div>
            <div>
              <span style={{ color: '#a8a29e' }}>LTM revenue</span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#1C1917' }}>{fmt$(row.ltm)}</p>
            </div>
            <div>
              <span style={{ color: '#a8a29e' }}>Months since order</span>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: row.monthsSinceLast >= 6 ? '#dc2626' : '#d97706' }}>
                {row.monthsSinceLast}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1C1917', marginBottom: 6 }}>
            What will you say?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your pitch notes for this account..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E1DC', borderRadius: 8, fontSize: 13, color: '#1C1917', backgroundColor: '#F9F9F9', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleMarkContacted}
            style={{ flex: 1, backgroundColor: '#2D5A3D', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Mark as Contacted
          </button>
          <button
            onClick={() => { onClose(); router.push(`/accounts/${encodeURIComponent(row.accountCode || row.account)}`); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', color: '#1C1917', border: '1px solid #E5E1DC', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
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
  const rep = useStore((s) => s.rep);
  const contactedAccounts = useStore((s) => s.contactedAccounts);
  const router = useRouter();

  const [modalRow, setModalRow] = useState<DormantRow | null>(null);
  const [recentlyContacted, setRecentlyContacted] = useState<Set<string>>(new Set());

  const dormant = useMemo(() => {
    if (!rc5Data || !rep) return [];
    return rc5Data.rows
      .filter((r) => r.primaryRep === rep && r.isDormant)
      .map((r) => ({
        account: r.account,
        accountCode: r.accountCode,
        accountType: r.accountType,
        lastActiveMonth: r.lastActiveMonth,
        monthsSinceLast: monthsSince(r.lastActiveMonth, rc5Data.monthLabels),
        ltm: r.monthlyRevenue.slice(0, 10).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.ltm - a.ltm);
  }, [rc5Data, rep]);

  const active = dormant.filter((r) => !recentlyContacted.has(r.account) && !contactedAccounts[r.account]);
  const contacted = dormant.filter((r) => recentlyContacted.has(r.account) || contactedAccounts[r.account]);

  const noData = !rc5Data || !rep;

  function DormantRow({ r }: { r: DormantRow }) {
    return (
      <tr
        onClick={() => router.push(`/accounts/${encodeURIComponent(r.accountCode || r.account)}`)}
        style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9F9F9')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <td style={{ padding: '10px 16px', color: '#1C1917', fontWeight: 500 }}>
          {r.account}
          {r.accountType && <span style={{ marginLeft: 8, fontSize: 11, color: '#a8a29e', fontWeight: 400 }}>{r.accountType}</span>}
        </td>
        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#a8a29e' }}>{fmtMonth(r.lastActiveMonth)}</td>
        <td style={{ padding: '10px 16px', textAlign: 'right', color: r.monthsSinceLast >= 6 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
          {r.monthsSinceLast}
        </td>
        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#1C1917', fontWeight: 600 }}>{fmt$(r.ltm)}</td>
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0 }}>Dormant Accounts</h1>
          {!noData && (
            <p style={{ fontSize: 13, color: '#a8a29e', margin: '4px 0 0' }}>
              {active.length} accounts with no revenue in last 3 months · sorted by historical value
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
          <>
            {/* Active dormant */}
            {active.length > 0 && (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', overflow: 'hidden', marginBottom: 16 }}>
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
                    {active.map((r) => <DormantRow key={r.accountCode || r.account} r={r} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* Contacted section */}
            {contacted.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Contacted — Awaiting Response ({contacted.length})
                </p>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', overflow: 'hidden', opacity: 0.7 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {contacted.map((r) => (
                        <tr
                          key={r.accountCode || r.account}
                          onClick={() => router.push(`/accounts/${encodeURIComponent(r.accountCode || r.account)}`)}
                          style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9F9F9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '10px 16px', color: '#a8a29e', fontWeight: 500, textDecoration: 'line-through' }}>{r.account}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#a8a29e' }}>{fmtMonth(r.lastActiveMonth)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#a8a29e' }}>{fmt$(r.ltm)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Contacted</span>
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
