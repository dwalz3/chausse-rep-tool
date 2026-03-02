'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { Rc5Row } from '@/types';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import TrendSparkline from '@/components/ui/TrendSparkline';

type SortKey = 'account' | 'lastActiveMonth' | 'three_mo' | 'latest_mo' | 'totalRevenue';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'at-risk' | 'dormant' | 'new';

function fmt$(n: number) {
  if (n === 0) return '—';
  return '$' + Math.round(n).toLocaleString();
}

function fmtMonth(ym: string | null) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getStatus(row: Rc5Row): 'new' | 'dormant' | 'at-risk' | 'active' {
  if (row.isNew) return 'new';
  if (row.isDormant) return 'dormant';
  // At-Risk: active account where last month < 50% of 3-month average
  const lastMo = row.monthlyRevenue[12];
  const avg3mo = (row.monthlyRevenue[10] + row.monthlyRevenue[11] + row.monthlyRevenue[12]) / 3;
  if (avg3mo > 0 && lastMo < avg3mo * 0.5 && lastMo > 0) return 'at-risk';
  return 'active';
}

function StatusPill({ status }: { status: ReturnType<typeof getStatus> }) {
  const map = {
    'new': { label: 'New', textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/40' },
    'dormant': { label: 'Dormant', textClass: 'text-amber-700 dark:text-amber-300', bgClass: 'bg-amber-100 dark:bg-amber-900/40' },
    'at-risk': { label: 'At-Risk', textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/40' },
    'active': { label: 'Active', textClass: 'text-green-700 dark:text-green-300', bgClass: 'bg-green-100 dark:bg-green-900/40' },
  };
  const { label, textClass, bgClass } = map[status];
  return (
    <span className={`rounded-full text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
}

function TrendCell({ row }: { row: Rc5Row }) {
  const recent = row.monthlyRevenue[10] + row.monthlyRevenue[11] + row.monthlyRevenue[12];
  const prior = row.monthlyRevenue[7] + row.monthlyRevenue[8] + row.monthlyRevenue[9];
  const pct = prior > 0 ? ((recent - prior) / prior) * 100 : null;
  const colorClass = pct === null ? 'text-muted' : pct >= 5 ? 'text-green-600 dark:text-green-500' : pct <= -5 ? 'text-red-600 dark:text-red-500' : 'text-muted';
  const label = pct === null
    ? (recent > 0 ? '↑ New' : '—')
    : `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <TrendSparkline data={row.monthlyRevenue} width={48} height={18} />
      <span className={`text-[11px] font-semibold whitespace-nowrap min-w-[36px] text-right ${colorClass}`}>
        {label}
      </span>
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} color="#484F58" />;
  return sortDir === 'asc' ? <ChevronUp size={12} color="#3FB950" /> : <ChevronDown size={12} color="#3FB950" />;
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs whitespace-nowrap cursor-pointer transition-colors ${active
          ? 'border-primary bg-primary text-white font-semibold'
          : 'border-border bg-surface text-text hover:bg-black/5 dark:hover:bg-white/5 font-normal'
        }`}
    >
      {label}
    </button>
  );
}

// Territories: look for OR/WA in the region field
const TERRITORY_FILTERS = ['All', 'Oregon', 'Washington'];
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'at-risk', label: 'At-Risk' },
  { key: 'dormant', label: 'Dormant' },
  { key: 'new', label: 'New' },
];

export default function AccountsPage() {
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [territory, setTerritory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const rows: Rc5Row[] = useMemo(() => {
    if (!rc5Data || !rep) return [];
    return rc5Data.rows.filter((r) => r.primaryRep === rep);
  }, [rc5Data, rep]);

  const filtered = useMemo(() => {
    let result = rows;
    const q = search.toLowerCase();
    if (q) result = result.filter((r) => r.account.toLowerCase().includes(q));
    if (territory !== 'All') {
      const t = territory.toLowerCase();
      result = result.filter((r) => r.region.toLowerCase().includes(t) || (t === 'oregon' && r.region.toLowerCase().includes('or')) || (t === 'washington' && (r.region.toLowerCase().includes('wa') || r.region.toLowerCase().includes('wash'))));
    }
    if (statusFilter !== 'all') {
      result = result.filter((r) => getStatus(r) === statusFilter);
    }
    return result;
  }, [rows, search, territory, statusFilter]);

  const sorted = useMemo(() => {
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'account':
          return mult * a.account.localeCompare(b.account);
        case 'lastActiveMonth':
          return mult * ((a.lastActiveMonth ?? '').localeCompare(b.lastActiveMonth ?? ''));
        case 'three_mo': {
          const aSum = a.monthlyRevenue[10] + a.monthlyRevenue[11] + a.monthlyRevenue[12];
          const bSum = b.monthlyRevenue[10] + b.monthlyRevenue[11] + b.monthlyRevenue[12];
          return mult * (aSum - bSum);
        }
        case 'latest_mo':
          return mult * (a.monthlyRevenue[12] - b.monthlyRevenue[12]);
        case 'totalRevenue':
        default:
          return mult * (a.totalRevenue - b.totalRevenue);
      }
    });
  }, [filtered, sortKey, sortDir]);

  const noData = !rc5Data || !rep;

  return (
    <Shell>
      <div className="max-w-[1000px] mx-auto w-full pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text m-0 mb-1">Accounts</h1>
            {!noData && (
              <p className="text-[13px] text-muted m-0">
                {sorted.length} accounts · {rows.filter((r) => r.isDormant).length} dormant
              </p>
            )}
          </div>
          {!noData && (
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search accounts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[220px] pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] text-text bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted"
              />
            </div>
          )}
        </div>

        {/* Filter strip */}
        {!noData && (
          <div className="flex gap-2 flex-wrap mb-4 items-center">
            {TERRITORY_FILTERS.map((t) => (
              <FilterChip key={t} label={t} active={territory === t} onClick={() => setTerritory(t)} />
            ))}
            <div className="w-[1px] h-5 bg-border mx-1" />
            {STATUS_FILTERS.map(({ key, label }) => (
              <FilterChip key={key} label={label} active={statusFilter === key} onClick={() => setStatusFilter(key)} />
            ))}
          </div>
        )}

        {noData ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">
            Upload RC5 data on the <a href="/upload" className="text-primary font-semibold hover:underline">Upload page</a> first.
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-x-auto hide-scrollbar">
            <table className="w-full border-collapse text-[13px] min-w-[750px]">
              <thead className="bg-black/5 dark:bg-white/5">
                <tr>
                  {[
                    { key: 'account' as SortKey, label: 'Account' },
                    { key: 'lastActiveMonth' as SortKey, label: 'Last Active' },
                    { key: 'three_mo' as SortKey, label: '3-Mo Total' },
                    { key: 'latest_mo' as SortKey, label: 'Latest Mo.' },
                    { key: 'totalRevenue' as SortKey, label: 'All-Time' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className={`py-3 px-4 text-muted font-medium cursor-pointer select-none whitespace-nowrap hover:text-text transition-colors ${key === 'account' ? 'text-left' : 'text-right'
                        }`}
                    >
                      <span className={`inline-flex items-center gap-1 ${key === 'account' ? '' : 'justify-end'}`}>
                        {label}
                        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-muted font-medium text-right w-20">Trend</th>
                  <th className="py-3 px-4 text-muted font-medium text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const three_mo = row.monthlyRevenue[10] + row.monthlyRevenue[11] + row.monthlyRevenue[12];
                  const latest_mo = row.monthlyRevenue[12];
                  const status = getStatus(row);
                  return (
                    <tr
                      key={row.accountCode || row.account}
                      onClick={() => router.push(`/accounts/${encodeURIComponent(row.accountCode || row.account)}`)}
                      className="border-t border-border/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-3 px-4 text-text font-medium truncate max-w-[200px] sm:max-w-[260px]" title={row.account}>
                        {row.account}
                        {row.accountType && (
                          <span className="ml-2 text-[11px] text-muted font-normal inline-block">{row.accountType}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-muted whitespace-nowrap">
                        {fmtMonth(row.lastActiveMonth)}
                      </td>
                      <td className="py-3 px-4 text-right text-text whitespace-nowrap font-medium">{fmt$(three_mo)}</td>
                      <td className="py-3 px-4 text-right text-text whitespace-nowrap">{fmt$(latest_mo)}</td>
                      <td className="py-3 px-4 text-right text-muted whitespace-nowrap">{fmt$(row.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap w-20">
                        <TrendCell row={row} />
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap w-24">
                        <StatusPill status={status} />
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted border-t border-border/50">
                      No accounts match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
