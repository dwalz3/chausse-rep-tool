'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { Rc5Row } from '@/types';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import TrendSparkline from '@/components/ui/TrendSparkline';

type SortKey = 'account' | 'lastActiveMonth' | 'three_mo' | 'ytd' | 'totalRevenue';
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
    'new':     { label: 'New',     color: '#2563eb', bg: '#dbeafe' },
    'dormant': { label: 'Dormant', color: '#d97706', bg: '#fef3c7' },
    'at-risk': { label: 'At-Risk', color: '#b45309', bg: '#fef9c3' },
    'active':  { label: 'Active',  color: '#16a34a', bg: '#dcfce7' },
  };
  const { label, color, bg } = map[status];
  return (
    <span style={{ backgroundColor: bg, color, borderRadius: 20, fontSize: 11, fontWeight: 600, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function TrendCell({ row }: { row: Rc5Row }) {
  const recent = row.monthlyRevenue[10] + row.monthlyRevenue[11] + row.monthlyRevenue[12];
  const prior = row.monthlyRevenue[7] + row.monthlyRevenue[8] + row.monthlyRevenue[9];
  const pct = prior > 0 ? ((recent - prior) / prior) * 100 : null;
  const color = pct === null ? '#a8a29e' : pct >= 5 ? '#16a34a' : pct <= -5 ? '#dc2626' : '#a8a29e';
  const label = pct === null
    ? (recent > 0 ? '↑ New' : '—')
    : `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
      <TrendSparkline data={row.monthlyRevenue} width={48} height={18} />
      <span style={{ color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right' }}>
        {label}
      </span>
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} color="#d4d4d4" />;
  return sortDir === 'asc' ? <ChevronUp size={12} color="#2D5A3D" /> : <ChevronDown size={12} color="#2D5A3D" />;
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: active ? '#2D5A3D' : '#E5E1DC',
        backgroundColor: active ? '#2D5A3D' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#1C1917',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
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
        case 'ytd':
          return mult * (a.monthlyRevenue.slice(1).reduce((s, v) => s + v, 0) - b.monthlyRevenue.slice(1).reduce((s, v) => s + v, 0));
        case 'totalRevenue':
        default:
          return mult * (a.totalRevenue - b.totalRevenue);
      }
    });
  }, [filtered, sortKey, sortDir]);

  const noData = !rc5Data || !rep;

  return (
    <Shell>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0 }}>Accounts</h1>
            {!noData && (
              <p style={{ fontSize: 13, color: '#a8a29e', margin: '4px 0 0' }}>
                {sorted.length} accounts · {rows.filter((r) => r.isDormant).length} dormant
              </p>
            )}
          </div>
          {!noData && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
              <input
                type="text"
                placeholder="Search accounts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #E5E1DC', borderRadius: 8, fontSize: 13, color: '#1C1917', backgroundColor: '#FFFFFF', outline: 'none', width: 220 }}
              />
            </div>
          )}
        </div>

        {/* Filter strip */}
        {!noData && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {TERRITORY_FILTERS.map((t) => (
              <FilterChip key={t} label={t} active={territory === t} onClick={() => setTerritory(t)} />
            ))}
            <div style={{ width: 1, backgroundColor: '#E5E1DC', margin: '0 4px' }} />
            {STATUS_FILTERS.map(({ key, label }) => (
              <FilterChip key={key} label={label} active={statusFilter === key} onClick={() => setStatusFilter(key)} />
            ))}
          </div>
        )}

        {noData ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>
            Upload RC5 data on the <a href="/upload" style={{ color: '#2D5A3D', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ backgroundColor: '#F9F9F9' }}>
                <tr>
                  {[
                    { key: 'account' as SortKey, label: 'Account' },
                    { key: 'lastActiveMonth' as SortKey, label: 'Last Active' },
                    { key: 'three_mo' as SortKey, label: '3-Mo Total' },
                    { key: 'ytd' as SortKey, label: 'YTD' },
                    { key: 'totalRevenue' as SortKey, label: 'All-Time' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      style={{ textAlign: key === 'account' ? 'left' : 'right', padding: '10px 16px', color: '#a8a29e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {label}
                        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th style={{ padding: '10px 16px', color: '#a8a29e', fontWeight: 500, textAlign: 'right', width: 80 }}>Trend</th>
                  <th style={{ padding: '10px 16px', color: '#a8a29e', fontWeight: 500, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const three_mo = row.monthlyRevenue[10] + row.monthlyRevenue[11] + row.monthlyRevenue[12];
                  const ytd = row.monthlyRevenue.slice(1).reduce((s, v) => s + v, 0);
                  const status = getStatus(row);
                  return (
                    <tr
                      key={row.accountCode || row.account}
                      onClick={() => router.push(`/accounts/${encodeURIComponent(row.accountCode || row.account)}`)}
                      style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9F9F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '10px 16px', color: '#1C1917', fontWeight: 500 }}>
                        {row.account}
                        {row.accountType && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: '#a8a29e', fontWeight: 400 }}>{row.accountType}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#a8a29e' }}>
                        {fmtMonth(row.lastActiveMonth)}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#1C1917' }}>{fmt$(three_mo)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#1C1917' }}>{fmt$(ytd)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#1C1917' }}>{fmt$(row.totalRevenue)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <TrendCell row={row} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <StatusPill status={status} />
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#a8a29e' }}>
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
