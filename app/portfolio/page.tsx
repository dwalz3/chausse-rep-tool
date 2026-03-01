'use client';

import { useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import Shell from '@/components/layout/Shell';
import SavedViewChips, { SAVED_VIEWS } from '@/components/portfolio/SavedViewChips';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
import { useStore } from '@/store';
import { buildPortfolioRows } from '@/lib/buildPortfolioRows';
import { PortfolioRow } from '@/types';
import { Search } from 'lucide-react';

function fmt$(n: number) {
  return n > 0 ? '$' + n.toFixed(2) : '—';
}

function PortfolioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);
  const allocationsData = useStore((s) => s.allocationsData);
  const openPOData = useStore((s) => s.openPOData);
  const btgThreshold = useStore((s) => s.btgThreshold);

  const [activeView, setActiveView] = useState(searchParams.get('view') ?? 'all');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  const allRows = useMemo(() => {
    if (!winePropertiesData) return [];
    return buildPortfolioRows(winePropertiesData, pricingData, allocationsData, openPOData);
  }, [winePropertiesData, pricingData, allocationsData, openPOData]);

  const fuse = useMemo(
    () =>
      new Fuse(allRows, {
        keys: ['wineName', 'name', 'producer', 'country'],
        threshold: 0.35,
        includeScore: false,
      }),
    [allRows]
  );

  const viewPredicate = useCallback(
    (row: PortfolioRow) => {
      const view = SAVED_VIEWS.find((v) => v.id === activeView);
      return view ? view.predicate(row, btgThreshold) : true;
    },
    [activeView, btgThreshold]
  );

  const viewFiltered = useMemo(() => allRows.filter(viewPredicate), [allRows, viewPredicate]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return viewFiltered;
    const fuseResults = fuse.search(search);
    const matchCodes = new Set(fuseResults.map((r) => r.item.wineCode));
    return viewFiltered.filter((r) => matchCodes.has(r.wineCode));
  }, [viewFiltered, fuse, search]);

  // Count per view
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const view of SAVED_VIEWS) {
      map[view.id] = allRows.filter((r) => view.predicate(r, btgThreshold)).length;
    }
    return map;
  }, [allRows, btgThreshold]);

  function handleViewSelect(id: string) {
    setActiveView(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', id);
    router.replace(`/portfolio?${params.toString()}`, { scroll: false });
  }

  function handleSearch(q: string) {
    setSearch(q);
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set('q', q); else params.delete('q');
    router.replace(`/portfolio?${params.toString()}`, { scroll: false });
  }

  const noData = !winePropertiesData;

  return (
    <Shell>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 20px' }}>
          Portfolio Explorer
        </h1>

        {noData ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 32, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload Wine Properties on the <a href="/upload" style={{ color: '#3FB950', fontWeight: 600 }}>Upload page</a> to explore the portfolio.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Left panel — saved views */}
            <div
              style={{
                flexShrink: 0,
                backgroundColor: '#161B22',
                borderRadius: 10,
                border: '1px solid #30363D',
                padding: '16px 12px',
                width: 210,
              }}
            >
              <SavedViewChips activeId={activeView} onSelect={handleViewSelect} counts={counts} />
            </div>

            {/* Main panel */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7D8590' }} />
                <input
                  type="text"
                  placeholder="Search by wine, producer, country…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: 32,
                    paddingRight: 12,
                    paddingTop: 9,
                    paddingBottom: 9,
                    border: '1px solid #30363D',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#E6EDF3',
                    backgroundColor: '#161B22',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Count */}
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#7D8590' }}>
                {searchFiltered.length.toLocaleString()} wines
              </p>

              {/* Table */}
              <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ backgroundColor: '#1C2128' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Producer</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Vintage</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Country</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', color: '#7D8590', fontWeight: 500 }}>PO Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchFiltered.map((row) => (
                      <tr
                        key={row.wineCode}
                        onClick={() => router.push(`/portfolio/${encodeURIComponent(row.wineCode)}`)}
                        style={{ borderTop: '1px solid #21262D', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '9px 16px' }}>
                          <WineTypeBadge type={row.wineType} />
                        </td>
                        <td style={{ padding: '9px 16px', color: '#7D8590', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.producer}
                        </td>
                        <td style={{ padding: '9px 16px', color: '#E6EDF3', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.wineName || row.name}
                        </td>
                        <td style={{ padding: '9px 16px', color: '#7D8590' }}>
                          {row.vintage || '—'}
                        </td>
                        <td style={{ padding: '9px 16px', color: '#7D8590' }}>
                          {row.country || '—'}
                        </td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#E6EDF3', fontWeight: 600 }}>
                          {fmt$(row.bottlePrice)}
                        </td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: row.openPOCases > 0 ? '#3FB950' : '#7D8590' }}>
                          {row.openPOCases > 0 ? row.openPOCases : '—'}
                        </td>
                      </tr>
                    ))}
                    {searchFiltered.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#7D8590' }}>
                          No wines match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioInner />
    </Suspense>
  );
}
