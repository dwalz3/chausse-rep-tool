'use client';

import { useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
import { TrendingUp, TrendingDown } from 'lucide-react';

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

function fmt$(n: number) {
  return '$' + Math.round(n).toLocaleString();
}

export default function FocusPage() {
  const rc5Data = useStore((s) => s.rc5Data);
  const ra25Data = useStore((s) => s.ra25Data);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const rep = useStore((s) => s.rep);

  // Build a wine type lookup
  const wineTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        map.set(normCode(w.wineCode), w.wineType);
      }
    }
    return map;
  }, [winePropertiesData]);

  // From RA25, find wines associated with this rep's accounts
  const repAccounts = useMemo(() => {
    if (!rc5Data || !rep) return new Set<string>();
    const s = new Set<string>();
    for (const r of rc5Data.rows) {
      if (r.primaryRep === rep) s.add(r.account.toLowerCase());
    }
    return s;
  }, [rc5Data, rep]);

  // Aggregate revenue by wine for this rep's accounts via RA25
  const wineRevMap = useMemo(() => {
    const map = new Map<string, { importer: string; totalRevenue: number; totalQty: number }>();
    if (!ra25Data) return map;
    for (const row of ra25Data.rows) {
      if (!repAccounts.has(row.account.toLowerCase())) continue;
      const key = row.importer || 'Unknown';
      const ex = map.get(key);
      if (ex) {
        ex.totalRevenue += row.totalRevenue;
        ex.totalQty += row.totalQty;
      } else {
        map.set(key, { importer: key, totalRevenue: row.totalRevenue, totalQty: row.totalQty });
      }
    }
    return map;
  }, [ra25Data, repAccounts]);

  const wines = useMemo(() => Array.from(wineRevMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue), [wineRevMap]);

  // Top 10 = "push these", bottom 10 = "watch these" (if they have any revenue)
  const pushList = wines.slice(0, 10);
  const watchList = wines.slice(10, 20);

  const noData = !ra25Data || !rep;

  function WineRow({ item, idx }: { item: typeof wines[0]; idx: number }) {
    const code = normCode(item.importer);
    const wineType = wineTypeMap.get(code);
    return (
      <tr style={{ borderTop: '1px solid #F3F4F6' }}>
        <td style={{ padding: '9px 16px', color: '#a8a29e', fontSize: 12 }}>{idx + 1}</td>
        <td style={{ padding: '9px 16px', color: '#1C1917', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.importer}
        </td>
        <td style={{ padding: '9px 16px' }}>
          {wineType && <WineTypeBadge type={wineType as Parameters<typeof WineTypeBadge>[0]['type']} />}
        </td>
        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: '#1C1917' }}>
          {fmt$(item.totalRevenue)}
        </td>
        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#a8a29e' }}>
          {Math.round(item.totalQty / 12)} cs
        </td>
      </tr>
    );
  }

  function Section({ title, items, icon, color }: { title: string; items: typeof wines; icon: React.ReactNode; color: string }) {
    if (items.length === 0) return null;
    return (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E1DC', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1C1917' }}>{title}</h3>
          <span style={{ fontSize: 12, color: '#a8a29e' }}>({items.length})</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ backgroundColor: '#F9F9F9' }}>
            <tr>
              <th style={{ width: 32, padding: '8px 16px', color: '#a8a29e', fontWeight: 500 }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 16px', color: '#a8a29e', fontWeight: 500 }}>Wine / Producer</th>
              <th style={{ textAlign: 'left', padding: '8px 16px', color: '#a8a29e', fontWeight: 500 }}>Type</th>
              <th style={{ textAlign: 'right', padding: '8px 16px', color: '#a8a29e', fontWeight: 500 }}>Revenue</th>
              <th style={{ textAlign: 'right', padding: '8px 16px', color: '#a8a29e', fontWeight: 500 }}>Cases</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w, i) => <WineRow key={w.importer} item={w} idx={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 800 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>Focus List</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', margin: '0 0 24px' }}>
          Top performing wines across your accounts — based on RA25 data.
        </p>

        {noData ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>
            Upload RA25 data on the <a href="/upload" style={{ color: '#2D5A3D', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : (
          <>
            <Section
              title="Push These — Top Performers"
              items={pushList}
              icon={<TrendingUp size={16} />}
              color="#16a34a"
            />
            <Section
              title="Watch These — Next Tier"
              items={watchList}
              icon={<TrendingDown size={16} />}
              color="#d97706"
            />
          </>
        )}
      </div>
    </Shell>
  );
}
