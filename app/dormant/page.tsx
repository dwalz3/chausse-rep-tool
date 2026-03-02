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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-5 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-xl border border-border w-full max-w-[480px] p-6 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="m-0 mb-1 text-lg font-bold text-text">Re-engage</h2>
            <p className="m-0 text-sm text-muted">{row.account}</p>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1 text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Account summary */}
        <div className="bg-black/5 dark:bg-[#1C2128] rounded-lg p-3 sm:p-4 mb-5">
          <div className="flex gap-6 text-[13px]">
            <div>
              <span className="text-muted">Last active</span>
              <p className="m-0 mt-0.5 font-semibold text-text">{fmtMonth(row.lastActiveMonth)}</p>
            </div>
            <div>
              <span className="text-muted">LTM revenue</span>
              <p className="m-0 mt-0.5 font-semibold text-text">{fmt$(row.ltm)}</p>
            </div>
            <div>
              <span className="text-muted">Months since order</span>
              <p className={`m-0 mt-0.5 font-semibold ${row.monthsSinceLast >= 6 ? 'text-red-500' : 'text-amber-500'}`}>
                {row.monthsSinceLast}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-[13px] font-medium text-text mb-1.5">
            What will you say?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your pitch notes for this account..."
            rows={3}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] text-text bg-black/5 dark:bg-[#1C2128] resize-y outline-none font-sans box-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleMarkContacted}
            className="flex-1 bg-primary text-white border-none rounded-lg py-2.5 px-4 text-[13px] font-semibold cursor-pointer hover:bg-primary/90 transition-colors"
          >
            Mark as Contacted
          </button>
          <button
            onClick={() => { onClose(); router.push(`/accounts/${encodeURIComponent(row.accountCode || row.account)}`); }}
            className="flex items-center justify-center gap-1.5 bg-surface text-text border border-border rounded-lg py-2.5 px-4 text-[13px] font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
        className="border-t border-border/50 cursor-pointer hover:bg-black/5 dark:hover:bg-[#1C2128] transition-colors group"
      >
        <td className="px-4 py-2.5 text-text font-medium">
          <div className="flex items-center gap-1.5 flex-wrap">
            {r.account}
            {r.accountType && <span className="text-[11px] text-muted font-normal">{r.accountType}</span>}
            {r.rc3Priority === 'High' && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 dark:bg-[#3D0000] dark:text-[#F85149] rounded px-1.5 py-[1px]">
                VS High
              </span>
            )}
            {r.rc3Priority === 'Medium' && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-[#2D2000] dark:text-[#E3B341] rounded px-1.5 py-[1px]">
                VS Med
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-right text-muted">{fmtMonth(r.lastActiveMonth)}</td>
        <td className={`px-4 py-2.5 text-right font-semibold ${r.monthsSinceLast >= 6 ? 'text-red-500' : 'text-amber-500'}`}>
          {r.monthsSinceLast}
        </td>
        <td className="px-4 py-2.5 text-right text-text font-semibold">{fmt$(r.ltm)}</td>
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <span
            onClick={() => setModalRow(r)}
            className="bg-amber-100 text-amber-700 dark:bg-[#FEF3C7] dark:text-[#92400E] rounded-md text-[11px] font-bold px-2.5 py-1 inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
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

      <div className="max-w-[1000px] mx-auto w-full pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text m-0">Dormant Accounts</h1>
          {!noData && (
            <p className="text-[13px] text-muted m-0 mt-1">
              {active.length} accounts with no revenue in last 3 months · sorted by priority
            </p>
          )}
        </div>

        {noData ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">
            Upload RC5 data on the <a href="/upload" className="text-primary font-semibold hover:underline">Upload page</a> first.
          </div>
        ) : dormant.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-primary text-sm font-semibold">
            No dormant accounts — great work!
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Active dormant */}
            {active.length > 0 && (
              <div className="bg-surface rounded-xl border border-border overflow-x-auto shadow-sm">
                <table className="w-full border-collapse min-w-[600px] text-[13px]">
                  <thead className="bg-black/5 dark:bg-[#1C2128]">
                    <tr>
                      <th className="text-left font-medium text-muted px-4 py-2.5">Account</th>
                      <th className="text-right font-medium text-muted px-4 py-2.5">Last Active</th>
                      <th className="text-right font-medium text-muted px-4 py-2.5">Months Ago</th>
                      <th className="text-right font-medium text-muted px-4 py-2.5">LTM Revenue</th>
                      <th className="px-4 py-2.5"></th>
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
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider m-0 mb-3">
                  Other Unloved Accounts — from Vinosmith RC3 ({rc3OnlyAccounts.length})
                </p>
                <div className="bg-surface rounded-xl border border-border overflow-x-auto shadow-sm opacity-90">
                  <table className="w-full border-collapse min-w-[600px] text-[13px]">
                    <thead className="bg-black/5 dark:bg-[#1C2128]">
                      <tr>
                        <th className="text-left font-medium text-muted px-4 py-2">Account</th>
                        <th className="text-right font-medium text-muted px-4 py-2">Priority</th>
                        <th className="text-right font-medium text-muted px-4 py-2">LTM Revenue</th>
                        <th className="text-right font-medium text-muted px-4 py-2">Days Inactive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rc3OnlyAccounts.slice(0, 10).map((r) => (
                        <tr key={r.account} className="border-t border-border/50">
                          <td className="px-4 py-2 text-text">{r.account}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`text-[10px] font-bold rounded px-1.5 py-[1px] inline-block ${r.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-[#3D0000] dark:text-[#F85149]' : r.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-[#2D2000] dark:text-[#E3B341]' : 'bg-black/5 dark:bg-[#21262D] text-muted'}`}>
                              {r.priority}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-muted tabular-nums">{fmt$(r.ltmRevenue)}</td>
                          <td className="px-4 py-2 text-right text-amber-500 tabular-nums">{r.daysSinceOrder ?? '—'}</td>
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
                <p className="text-xs font-semibold text-muted uppercase tracking-wider m-0 mb-3">
                  Contacted — Awaiting Response ({contacted.length})
                </p>
                <div className="bg-surface rounded-xl border border-border overflow-x-auto shadow-sm opacity-70">
                  <table className="w-full border-collapse min-w-[600px] text-[13px]">
                    <tbody>
                      {contacted.map((r) => (
                        <tr
                          key={r.accountCode || r.account}
                          onClick={() => router.push(`/accounts/${encodeURIComponent(r.accountCode || r.account)}`)}
                          className="border-t border-border/50 cursor-pointer hover:bg-black/5 dark:hover:bg-[#1C2128] transition-colors"
                        >
                          <td className="px-4 py-2.5 text-muted font-medium line-through decoration-muted/50">{r.account}</td>
                          <td className="px-4 py-2.5 text-right text-muted">{fmtMonth(r.lastActiveMonth)}</td>
                          <td className="px-4 py-2.5 text-right text-muted">{fmt$(r.ltm)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-[11px] text-primary font-semibold">✓ Contacted</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
