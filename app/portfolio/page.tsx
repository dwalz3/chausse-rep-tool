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

type SortKey = typeof COL_DEFS[number]['key'];

function getSortValue(row: PortfolioRow, key: SortKey): string | number {
  switch (key) {
    case 'name': return (row.name || row.wineName).toLowerCase();
    case 'price': return row.bottlePrice;
    case 'inventory': return row.inventoryTotalBottles;
    case 'accts': return row.accountCount;
    case 'importer': return row.importer.toLowerCase();
    case 'region': return row.region.toLowerCase();
    case 'country': return row.country.toLowerCase();
    case 'type': return row.wineType.toLowerCase();
    case 'varietal': return row.varietal.toLowerCase();
    case 'farming': return [row.isNatural, row.isBiodynamic, row.isDirect].filter(Boolean).length;
  }
}

// Column definitions for resizable columns (excludes fixed row-# column)
const COL_DEFS = [
  { key: 'name', label: 'Wine', defaultWidth: 240, sticky: true },
  { key: 'price', label: 'Price', defaultWidth: 82, sticky: false },
  { key: 'inventory', label: 'Inventory', defaultWidth: 110, sticky: false },
  { key: 'accts', label: 'Accts', defaultWidth: 64, sticky: false },
  { key: 'importer', label: 'Importer', defaultWidth: 150, sticky: false },
  { key: 'region', label: 'Region', defaultWidth: 120, sticky: false },
  { key: 'country', label: 'Country', defaultWidth: 106, sticky: false },
  { key: 'type', label: 'Type', defaultWidth: 96, sticky: false },
  { key: 'varietal', label: 'Varietal', defaultWidth: 140, sticky: false },
  { key: 'farming', label: 'Farming', defaultWidth: 88, sticky: false },
] as const;

const ROW_NUM_WIDTH = 44;   // fixed, not resizable
const NAME_LEFT = ROW_NUM_WIDTH;

function FarmingBadges({ row }: { row: PortfolioRow }) {
  if (!row.isNatural && !row.isBiodynamic && !row.isDirect) {
    return <span className="text-muted">—</span>;
  }
  return (
    <div className="flex gap-1">
      {row.isNatural && (
        <span title="Natural" className="text-[10px] bg-green-100 text-green-700 dark:bg-[#0D2918] dark:text-[#3FB950] rounded px-[5px] py-[1px] font-bold">N</span>
      )}
      {row.isBiodynamic && (
        <span title="Biodynamic" className="text-[10px] bg-teal-100 text-teal-700 dark:bg-[#003730] dark:text-[#22D3A5] rounded px-[5px] py-[1px] font-bold">B</span>
      )}
      {row.isDirect && (
        <span title="Direct Import" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-[#2A2500] dark:text-[#E3B341] rounded px-[5px] py-[1px] font-bold">D</span>
      )}
    </div>
  );
}

function WineTypePill({ type }: { type: PortfolioRow['wineType'] }) {
  const s = getWineTypeStyle(type);
  return (
    <span className="text-[11px] rounded px-2 py-0.5 font-semibold whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.text }}>
      {type}
    </span>
  );
}

function PortfolioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);
  const inventoryData = useStore((s) => s.inventoryData);
  const allocationsData = useStore((s) => s.allocationsData);
  const openPOData = useStore((s) => s.openPOData);
  const ra25Data = useStore((s) => s.ra25Data);
  const ra27Data = useStore((s) => s.ra27Data);
  const rb6RepData = useStore((s) => s.rb6RepData);
  const btgThreshold = useStore((s) => s.btgThreshold);

  const [activeView, setActiveView] = useState(searchParams.get('view') ?? 'all');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [selectedWine, setSelectedWine] = useState<PortfolioRow | null>(null);
  const [viewsCollapsed, setViewsCollapsed] = useState(false);
  const [showAllInventory, setShowAllInventory] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
    return buildPortfolioRows(winePropertiesData, pricingData, allocationsData, openPOData, ra25Data?.wineTotals, inventoryData);
  }, [winePropertiesData, pricingData, inventoryData, allocationsData, openPOData, ra25Data]);

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
    // When inventory data is loaded, hide zero-inventory wines unless user toggled "show all"
    let base = (!showAllInventory && inventoryData)
      ? viewFiltered.filter((r) => r.inventoryTotalBottles > 0)
      : viewFiltered;
    if (!search.trim()) return base;
    const fuseResults = fuse.search(search);
    const matchCodes = new Set(fuseResults.map((r) => r.item.wineCode));
    return base.filter((r) => matchCodes.has(r.wineCode));
  }, [viewFiltered, fuse, search, showAllInventory, inventoryData]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const displayRows = useMemo(() => {
    if (!sortKey) return searchFiltered;
    return [...searchFiltered].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const cmp = typeof va === 'string' && typeof vb === 'string'
        ? va.localeCompare(vb)
        : (va as number) - (vb as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [searchFiltered, sortKey, sortDir]);

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
        <div className="pb-8">
          <h1 className="text-2xl font-bold text-text m-0 mb-5">
            Portfolio Explorer
          </h1>

          {noData ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">
              Upload Wine Properties on the <a href="/upload" className="text-primary font-semibold hover:underline">Upload page</a> to explore the portfolio.
            </div>
          ) : (
            <div className="flex gap-4 items-start">

              {/* Left panel — saved views (collapsible) */}
              <div
                className={`shrink-0 bg-surface rounded-xl border border-border overflow-hidden transition-[width] duration-200 ease-in-out ${viewsCollapsed ? 'w-8' : 'w-[210px]'}`}
              >
                {viewsCollapsed ? (
                  <div className="flex flex-col items-center py-3 gap-2">
                    <button
                      onClick={() => setViewsCollapsed(false)}
                      title="Expand saved views"
                      className="bg-transparent border-none text-muted cursor-pointer p-1 leading-none hover:text-text transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      title={SAVED_VIEWS.find((v) => v.id === activeView)?.label}
                    />
                  </div>
                ) : (
                  <div className="px-3 pt-3 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
                        Saved Views
                      </span>
                      <button
                        onClick={() => setViewsCollapsed(true)}
                        title="Collapse saved views"
                        className="bg-transparent border-none text-muted cursor-pointer p-0.5 leading-none hover:text-text transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                    </div>
                    {/* Fixed to hide the extra SavedView header */}
                    <SavedViewChips activeId={activeView} onSelect={handleViewSelect} counts={counts} />
                  </div>
                )}
              </div>

              {/* Main panel */}
              <div className="flex-1 min-w-0">
                {/* Search */}
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search by wine, producer, country…"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-[13px] text-text bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted box-border"
                  />
                </div>

                {/* Count + inventory toggle */}
                <div className="flex items-center gap-2 mb-2">
                  <p className="m-0 text-[13px] text-muted">
                    {displayRows.length.toLocaleString()} wines
                    {inventoryData && !showAllInventory && <span className="text-muted/60"> · in stock</span>}
                  </p>
                  {inventoryData && (
                    <button
                      onClick={() => setShowAllInventory((x) => !x)}
                      className="bg-transparent border border-border rounded text-muted text-[11px] px-2 py-0.5 cursor-pointer shrink-0 hover:border-text/30 hover:text-text transition-colors"
                    >
                      {showAllInventory
                        ? 'In-stock only'
                        : `Show all ${viewFiltered.length.toLocaleString()} wines`}
                    </button>
                  )}
                </div>

                {/* Spreadsheet table */}
                <div className="bg-surface rounded-xl border border-border overflow-auto max-h-[calc(100vh-230px)] hide-scrollbar shadow-sm">
                  <table
                    ref={tableRef}
                    className="table-fixed border-collapse text-[13px] min-w-full"
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
                        <th className="sticky left-0 top-0 z-10 bg-black/5 dark:bg-white/5 w-[44px] border-b-2 border-border/50 border-r border-border/50 py-2 text-center text-muted font-medium text-[11px] select-none">
                          #
                        </th>
                        {/* Resizable column headers */}
                        {COL_DEFS.map((col, i) => {
                          const isActive = sortKey === col.key;
                          return (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              style={{
                                position: 'sticky',
                                top: 0,
                                ...(col.key === 'name' ? {
                                  left: NAME_LEFT,
                                  zIndex: 10,
                                } : {
                                  zIndex: 8,
                                  borderRight: '1px solid var(--border)',
                                }),
                              }}
                              className={`bg-black/5 dark:bg-white/5 border-b-2 py-2 px-3 font-medium text-[11px] select-none whitespace-nowrap overflow-hidden cursor-pointer transition-colors ${isActive ? 'border-primary text-text' : 'border-border/50 text-muted'} ${col.key === 'name' ? 'border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.3)]' : ''} ${col.key === 'price' || col.key === 'accts' ? 'text-right' : 'text-left'}`}
                            >
                              <span>{col.label}</span>
                              {isActive && (
                                <span className="ml-1 text-[10px] text-primary">
                                  {sortDir === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                              {/* Resize handle */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-[1] hover:bg-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  dragRef.current = { colIdx: i, startX: e.clientX, startWidth: colWidthsRef.current[i] };
                                }}
                              />
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {displayRows.map((row, idx) => {
                        const typeStyle = getWineTypeStyle(row.wineType);
                        const normKey = row.wineCode.toUpperCase();
                        const rb6Row = rb6RepData?.byWineCode?.[normKey];
                        const ra27Count = ra27Data?.byWineCode?.[normKey] ?? null;
                        return (
                          <tr
                            key={row.wineCode}
                            onClick={() => setSelectedWine(row)}
                            className="cursor-pointer border-t border-border/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                          >
                            {/* Row # */}
                            <td
                              data-sticky="true"
                              className="sticky left-0 z-[2] bg-surface group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors border-r border-border/50 py-2 text-center text-muted text-[11px] tabular-nums select-none"
                            >
                              {idx + 1}
                            </td>

                            {/* Name (sticky) */}
                            <td
                              data-sticky="true"
                              style={{ borderLeftColor: typeStyle.dot }}
                              className="sticky z-[2] bg-surface group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors border-l-4 border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.25)] py-2 px-3 text-text font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              {row.name || row.wineName}
                            </td>

                            {/* Price */}
                            <td className={`py-2 px-3 text-right tabular-nums whitespace-nowrap ${row.bottlePrice > 0 ? 'text-text font-semibold' : 'text-muted font-normal'}`}>
                              {fmt$(row.bottlePrice)}
                            </td>

                            {/* Inventory — color-coded via RB6 */}
                            <td className="py-1.5 px-3 text-[11px] tabular-nums">
                              {(() => {
                                const btl = rb6Row ? rb6Row.onHandBottles : row.inventoryTotalBottles;
                                if (rb6Row?.isOutOfStock) return <span className="bg-red-100 dark:bg-[#3D0000] text-red-700 dark:text-[#F85149] rounded px-1.5 py-[1px] font-bold text-[10px]">Out</span>;
                                if (btl > 0 || row.openPOCases > 0) {
                                  const invColorClass = rb6Row?.isCritical ? 'text-red-600 dark:text-red-500' : rb6Row?.isLowStock ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500';
                                  return (
                                    <div className="flex flex-col gap-[1px]">
                                      {btl > 0 && <span className={`font-semibold ${invColorClass}`}>{btl} btl</span>}
                                      {row.openPOCases > 0 && <span className="text-blue-600 dark:text-blue-400">+{row.openPOCases} on order</span>}
                                    </div>
                                  );
                                }
                                return <span className="text-muted">—</span>;
                              })()}
                            </td>

                            {/* Accts — prefer RA27 over RA25 accountCount */}
                            <td className={`py-2 px-3 text-right tabular-nums ${(ra27Count ?? row.accountCount) > 0 ? 'text-text' : 'text-muted'}`}>
                              {(ra27Count ?? row.accountCount) > 0 ? (ra27Count ?? row.accountCount) : '—'}
                            </td>

                            {/* Importer */}
                            <td className="py-2 px-3 text-muted overflow-hidden text-ellipsis whitespace-nowrap">
                              {row.importer || '—'}
                            </td>

                            {/* Region */}
                            <td className="py-2 px-3 text-muted overflow-hidden text-ellipsis whitespace-nowrap">
                              {row.region || '—'}
                            </td>

                            {/* Country */}
                            <td className="py-2 px-3 text-muted overflow-hidden text-ellipsis whitespace-nowrap">
                              {row.country || '—'}
                            </td>

                            {/* Type */}
                            <td className="py-[7px] px-3">
                              <WineTypePill type={row.wineType} />
                            </td>

                            {/* Varietal */}
                            <td className="py-2 px-3 text-muted overflow-hidden text-ellipsis whitespace-nowrap">
                              {row.varietal || '—'}
                            </td>

                            {/* Farming */}
                            <td className="py-[7px] px-3">
                              <FarmingBadges row={row} />
                            </td>
                          </tr>
                        );
                      })}

                      {displayRows.length === 0 && (
                        <tr>
                          <td colSpan={COL_DEFS.length + 1} className="p-8 text-center text-muted border-t border-border/50">
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
