'use client';

import { useMemo, useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import Shell from '@/components/layout/Shell';
import SavedViewChips, { SAVED_VIEWS } from '@/components/portfolio/SavedViewChips';
import WineDrawer from '@/components/ui/WineDrawer';
import { useStore } from '@/store';
import { buildPortfolioRows } from '@/lib/buildPortfolioRows';
import { PortfolioRow } from '@/types';
import { getWineTypeStyle } from '@/lib/constants/wineColors';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

function fmt$(n: number) {
  return n > 0 ? '$' + n.toFixed(2) : '—';
}

// Column definitions for resizable columns (excludes fixed row-# column)
const COL_DEFS = [
  { key: 'name',     label: 'Wine',     defaultWidth: 240, sticky: true  },
  { key: 'price',    label: 'Price',    defaultWidth: 82,  sticky: false },
  { key: 'accts',    label: 'Accts',    defaultWidth: 64,  sticky: false },
  { key: 'importer', label: 'Importer', defaultWidth: 150, sticky: false },
  { key: 'region',   label: 'Region',   defaultWidth: 120, sticky: false },
  { key: 'country',  label: 'Country',  defaultWidth: 106, sticky: false },
  { key: 'type',     label: 'Type',     defaultWidth: 96,  sticky: false },
  { key: 'varietal', label: 'Varietal', defaultWidth: 140, sticky: false },
  { key: 'farming',  label: 'Farming',  defaultWidth: 88,  sticky: false },
] as const;

const ROW_NUM_WIDTH = 44;   // fixed, not resizable
const NAME_LEFT = ROW_NUM_WIDTH;

function FarmingBadges({ row }: { row: PortfolioRow }) {
  if (!row.isNatural && !row.isBiodynamic && !row.isDirect) {
    return <span style={{ color: '#484F58' }}>—</span>;
  }
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {row.isNatural && (
        <span title="Natural" style={{ fontSize: 10, backgroundColor: '#0D2918', color: '#3FB950', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>N</span>
      )}
      {row.isBiodynamic && (
        <span title="Biodynamic" style={{ fontSize: 10, backgroundColor: '#003730', color: '#22D3A5', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>B</span>
      )}
      {row.isDirect && (
        <span title="Direct Import" style={{ fontSize: 10, backgroundColor: '#2A2500', color: '#E3B341', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>D</span>
      )}
    </div>
  );
}

function WineTypePill({ type }: { type: PortfolioRow['wineType'] }) {
  const s = getWineTypeStyle(type);
  return (
    <span style={{ fontSize: 11, backgroundColor: s.bg, color: s.text, borderRadius: 4, padding: '2px 7px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {type}
    </span>
  );
}

function PortfolioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);
  const allocationsData = useStore((s) => s.allocationsData);
  const openPOData = useStore((s) => s.openPOData);
  const ra25Data = useStore((s) => s.ra25Data);
  const btgThreshold = useStore((s) => s.btgThreshold);

  const [activeView, setActiveView] = useState(searchParams.get('view') ?? 'all');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [selectedWine, setSelectedWine] = useState<PortfolioRow | null>(null);
  const [viewsCollapsed, setViewsCollapsed] = useState(false);

  // ── Resizable columns ──────────────────────────────────────────────────────
  const colWidthsRef = useRef<number[]>(COL_DEFS.map((c) => c.defaultWidth));
  const [, setColVer] = useState(0);
  const dragRef = useRef<{ colIdx: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current || !tableRef.current) return;
      const { colIdx, startX, startWidth } = dragRef.current;
      const newWidth = Math.max(40, startWidth + (e.clientX - startX));
      colWidthsRef.current[colIdx] = newWidth;
      // Direct DOM mutation: col[0] = row-#, col[1+] = COL_DEFS
      const cols = tableRef.current.querySelectorAll('col');
      if (cols[colIdx + 1]) {
        (cols[colIdx + 1] as HTMLElement).style.width = newWidth + 'px';
      }
    }
    function onUp() {
      if (dragRef.current) {
        dragRef.current = null;
        setColVer((v) => v + 1); // single re-render to commit
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const allRows = useMemo(() => {
    if (!winePropertiesData) return [];
    return buildPortfolioRows(winePropertiesData, pricingData, allocationsData, openPOData, ra25Data?.wineTotals);
  }, [winePropertiesData, pricingData, allocationsData, openPOData, ra25Data]);

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
    <>
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
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* Left panel — saved views (collapsible) */}
              <div style={{
                flexShrink: 0,
                backgroundColor: '#161B22',
                borderRadius: 10,
                border: '1px solid #30363D',
                width: viewsCollapsed ? 32 : 210,
                overflow: 'hidden',
                transition: 'width 0.2s ease',
              }}>
                {viewsCollapsed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 8 }}>
                    <button
                      onClick={() => setViewsCollapsed(false)}
                      title="Expand saved views"
                      style={{ background: 'none', border: 'none', color: '#7D8590', cursor: 'pointer', padding: 4, lineHeight: 0 }}
                    >
                      <ChevronRight size={14} />
                    </button>
                    <div
                      style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3FB950' }}
                      title={SAVED_VIEWS.find((v) => v.id === activeView)?.label}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '12px 12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Saved Views
                      </span>
                      <button
                        onClick={() => setViewsCollapsed(true)}
                        title="Collapse saved views"
                        style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', padding: 2, lineHeight: 0 }}
                      >
                        <ChevronLeft size={13} />
                      </button>
                    </div>
                    <SavedViewChips activeId={activeView} onSelect={handleViewSelect} counts={counts} hideHeader />
                  </div>
                )}
              </div>

              {/* Main panel */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
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
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#7D8590' }}>
                  {searchFiltered.length.toLocaleString()} wines
                </p>

                {/* Spreadsheet table */}
                <div style={{
                  backgroundColor: '#161B22',
                  borderRadius: 10,
                  border: '1px solid #30363D',
                  overflow: 'auto',
                  maxHeight: 'calc(100vh - 230px)',
                }}>
                  <table
                    ref={tableRef}
                    style={{ tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13, minWidth: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: ROW_NUM_WIDTH }} />
                      {COL_DEFS.map((col, i) => (
                        <col key={col.key} style={{ width: colWidthsRef.current[i] }} />
                      ))}
                    </colgroup>

                    <thead>
                      <tr>
                        {/* Row # header */}
                        <th style={{
                          position: 'sticky',
                          left: 0,
                          top: 0,
                          zIndex: 5,
                          backgroundColor: '#1C2128',
                          width: ROW_NUM_WIDTH,
                          borderBottom: '2px solid #30363D',
                          borderRight: '1px solid #21262D',
                          padding: '8px 0',
                          textAlign: 'center',
                          color: '#484F58',
                          fontWeight: 500,
                          fontSize: 11,
                          userSelect: 'none',
                        }}>
                          #
                        </th>
                        {/* Resizable column headers */}
                        {COL_DEFS.map((col, i) => (
                          <th
                            key={col.key}
                            style={{
                              position: 'sticky',
                              top: 0,
                              ...(col.key === 'name' ? {
                                left: NAME_LEFT,
                                zIndex: 5,
                                boxShadow: '2px 0 4px rgba(0,0,0,0.3)',
                                borderRight: '1px solid #30363D',
                              } : {
                                zIndex: 4,
                                borderRight: '1px solid #21262D',
                              }),
                              backgroundColor: '#1C2128',
                              borderBottom: '2px solid #30363D',
                              padding: '8px 12px',
                              textAlign: col.key === 'price' || col.key === 'accts' ? 'right' : 'left',
                              color: '#7D8590',
                              fontWeight: 500,
                              fontSize: 11,
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                            }}
                          >
                            {col.label}
                            {/* Resize handle */}
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 4,
                                cursor: 'col-resize',
                                zIndex: 1,
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                dragRef.current = { colIdx: i, startX: e.clientX, startWidth: colWidthsRef.current[i] };
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#3FB950'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {searchFiltered.map((row, idx) => {
                        const typeStyle = getWineTypeStyle(row.wineType);
                        return (
                          <tr
                            key={row.wineCode}
                            onClick={() => setSelectedWine(row)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#1C2128';
                              e.currentTarget.querySelectorAll<HTMLElement>('[data-sticky]').forEach((el) => {
                                el.style.backgroundColor = '#1C2128';
                              });
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.querySelectorAll<HTMLElement>('[data-sticky]').forEach((el) => {
                                el.style.backgroundColor = '#161B22';
                              });
                            }}
                          >
                            {/* Row # */}
                            <td
                              data-sticky="true"
                              style={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 2,
                                backgroundColor: '#161B22',
                                borderTop: '1px solid #21262D',
                                borderRight: '1px solid #21262D',
                                padding: '8px 0',
                                textAlign: 'center',
                                color: '#484F58',
                                fontSize: 11,
                                fontVariantNumeric: 'tabular-nums',
                                userSelect: 'none',
                              }}
                            >
                              {idx + 1}
                            </td>

                            {/* Name (sticky) */}
                            <td
                              data-sticky="true"
                              style={{
                                position: 'sticky',
                                left: NAME_LEFT,
                                zIndex: 2,
                                backgroundColor: '#161B22',
                                borderTop: '1px solid #21262D',
                                borderLeft: `3px solid ${typeStyle.dot}`,
                                borderRight: '1px solid #30363D',
                                boxShadow: '2px 0 4px rgba(0,0,0,0.25)',
                                padding: '8px 12px',
                                color: '#E6EDF3',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.name || row.wineName}
                            </td>

                            {/* Price */}
                            <td style={{
                              borderTop: '1px solid #21262D',
                              padding: '8px 12px',
                              textAlign: 'right',
                              color: row.bottlePrice > 0 ? '#E6EDF3' : '#484F58',
                              fontWeight: row.bottlePrice > 0 ? 600 : 400,
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}>
                              {fmt$(row.bottlePrice)}
                            </td>

                            {/* Accts */}
                            <td style={{
                              borderTop: '1px solid #21262D',
                              padding: '8px 12px',
                              textAlign: 'right',
                              color: row.accountCount > 0 ? '#E6EDF3' : '#484F58',
                              fontVariantNumeric: 'tabular-nums',
                            }}>
                              {row.accountCount > 0 ? row.accountCount : '—'}
                            </td>

                            {/* Importer */}
                            <td style={{
                              borderTop: '1px solid #21262D',
                              padding: '8px 12px',
                              color: '#7D8590',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {row.importer || '—'}
                            </td>

                            {/* Region */}
                            <td style={{
                              borderTop: '1px solid #21262D',
                              padding: '8px 12px',
                              color: '#7D8590',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {row.region || '—'}
                            </td>

                            {/* Country */}
                            <td style={{
                              borderTop: '1px solid #21262D',
                              padding: '8px 12px',
                              color: '#7D8590',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {row.country || '—'}
                            </td>

                            {/* Type */}
                            <td style={{ borderTop: '1px solid #21262D', padding: '7px 12px' }}>
                              <WineTypePill type={row.wineType} />
                            </td>

                            {/* Varietal */}
                            <td style={{
                              borderTop: '1px solid #21262D',
                              padding: '8px 12px',
                              color: '#7D8590',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {row.varietal || '—'}
                            </td>

                            {/* Farming */}
                            <td style={{ borderTop: '1px solid #21262D', padding: '7px 12px' }}>
                              <FarmingBadges row={row} />
                            </td>
                          </tr>
                        );
                      })}

                      {searchFiltered.length === 0 && (
                        <tr>
                          <td colSpan={COL_DEFS.length + 1} style={{ padding: 32, textAlign: 'center', color: '#7D8590' }}>
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
      <WineDrawer wine={selectedWine} onClose={() => setSelectedWine(null)} />
    </>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioInner />
    </Suspense>
  );
}
