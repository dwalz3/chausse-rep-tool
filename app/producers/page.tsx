'use client';

import { useState, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import WineDrawer from '@/components/ui/WineDrawer';
import { useStore } from '@/store';
import { buildPortfolioRows } from '@/lib/buildPortfolioRows';
import { PortfolioRow } from '@/types';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

const FARMING_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  biodynamic: { label: 'Biodynamic', bg: '#003730', color: '#22D3A5' },
  biodynamique: { label: 'Biodynamic', bg: '#003730', color: '#22D3A5' },
  demeter: { label: 'Demeter', bg: '#003730', color: '#22D3A5' },
  natural: { label: 'Natural', bg: '#0D2918', color: '#3FB950' },
  organic: { label: 'Organic', bg: '#0D2918', color: '#3FB950' },
  sustainable: { label: 'Sustainable', bg: '#1C2640', color: '#79BAFF' },
  'lutte raisonnée': { label: 'Lutte Raisonnée', bg: '#1C2640', color: '#79BAFF' },
  lutte: { label: 'Lutte Raisonnée', bg: '#1C2640', color: '#79BAFF' },
};

function FarmingBadge({ practice }: { practice: string }) {
  const key = practice.toLowerCase();
  // Try exact match, then prefix match
  const style = FARMING_LABELS[key] ??
    Object.entries(FARMING_LABELS).find(([k]) => key.includes(k))?.[1] ??
    { label: practice, bg: '#21262D', color: '#7D8590' };
  return (
    <span className="text-[11px] rounded px-2 py-0.5 font-semibold whitespace-nowrap inline-block" style={{ backgroundColor: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}

function BioSection({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 160;
  const short = text.length > LIMIT;
  return (
    <div className="text-xs text-muted mt-1.5 leading-relaxed">
      {expanded || !short ? text : text.slice(0, LIMIT) + '…'}
      {short && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          className="ml-1.5 bg-transparent border-none text-primary text-xs cursor-pointer p-0 hover:underline inline-block font-semibold"
        >
          {expanded ? 'Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

export default function ProducersPage() {
  const producersData = useStore((s) => s.producersData);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);
  const allocationsData = useStore((s) => s.allocationsData);
  const openPOData = useStore((s) => s.openPOData);
  const ra25Data = useStore((s) => s.ra25Data);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedWine, setSelectedWine] = useState<PortfolioRow | null>(null);

  // Build portfolio map: normCode → PortfolioRow
  const portfolioMap = useMemo(() => {
    const map = new Map<string, PortfolioRow>();
    if (winePropertiesData) {
      const rows = buildPortfolioRows(winePropertiesData, pricingData, allocationsData, openPOData, ra25Data?.wineTotals);
      for (const row of rows) {
        map.set(normCode(row.wineCode), row);
      }
    }
    return map;
  }, [winePropertiesData, pricingData, allocationsData, openPOData, ra25Data]);

  // Count wines per producer
  const wineCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        const key = w.producer.toLowerCase();
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [winePropertiesData]);

  const producers = producersData?.producers ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? producers.filter((p) => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)) : producers;
  }, [producers, search]);

  const winesByProducer = useMemo(() => {
    const map = new Map<string, typeof winePropertiesData>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        const key = w.producer.toLowerCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(w);
      }
    }
    return map;
  }, [winePropertiesData]);

  function toggleExpand(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const noData = !producersData;

  return (
    <>
      <Shell>
        <div className="max-w-[800px] mx-auto w-full pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text m-0">Producers</h1>
              {!noData && (
                <p className="text-[13px] text-muted m-0 mt-1">
                  {filtered.length} producers
                </p>
              )}
            </div>
            {!noData && (
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search producers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-[220px] pl-8 pr-3 py-2 border border-border rounded-lg text-[13px] text-text bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            )}
          </div>

          {noData ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">
              Upload Producers data on the <a href="/upload" className="text-primary font-semibold hover:underline">Upload page</a> first.
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              {filtered.map((p, i) => {
                const isExpanded = expanded.has(p.name);
                const wines = winesByProducer.get(p.name.toLowerCase()) ?? [];
                const wineCount = wineCountMap.get(p.name.toLowerCase()) ?? 0;
                return (
                  <div key={p.recordId} className={i === 0 ? '' : 'border-t border-border/50'}>
                    {/* Producer row */}
                    <div
                      onClick={() => wines.length > 0 && toggleExpand(p.name)}
                      className={`flex items-start p-3.5 sm:p-4 gap-3 transition-colors ${wines.length > 0 ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 group' : 'cursor-default'}`}
                    >
                      <span className="text-muted w-4 shrink-0 mt-[3px]">
                        {wines.length > 0 ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-text">{p.name}</span>
                          {p.region && <span className="text-xs text-muted">{p.region}</span>}
                        </div>
                        {/* Farming badges */}
                        {p.farmingPractices && p.farmingPractices.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mt-1.5">
                            {p.farmingPractices.map((f) => (
                              <FarmingBadge key={f} practice={f} />
                            ))}
                          </div>
                        )}
                        {/* Bio */}
                        {p.about && <BioSection text={p.about} />}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                        <span className="text-[13px] text-muted">{p.country}</span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {p.isDirectImport && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 dark:bg-[#2A2500] dark:text-[#E3B341] rounded px-[7px] py-[2px] font-semibold">
                              Direct
                            </span>
                          )}
                          {wineCount > 0 && (
                            <span className="text-xs bg-black/5 dark:bg-white/5 text-muted rounded-full px-2 py-[1px] font-semibold border border-border/50">
                              {wineCount} {wineCount === 1 ? 'wine' : 'wines'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded wines */}
                    {isExpanded && wines.length > 0 && (
                      <div className="bg-black/5 dark:bg-[#1C2128]/50 pl-11 pr-4 pb-2">
                        {wines.map((w) => {
                          const portfolioRow = portfolioMap.get(normCode(w.wineCode));
                          return (
                            <div
                              key={w.wineCode}
                              onClick={(e) => { e.stopPropagation(); if (portfolioRow) setSelectedWine(portfolioRow); }}
                              className={`flex items-center gap-3 py-2 border-b border-border/50 text-[13px] transition-colors last:border-0 ${portfolioRow ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default'}`}
                            >
                              <span className="text-text font-medium">{w.wineName || w.name}</span>
                              {w.vintage && <span className="text-muted">{w.vintage}</span>}
                              {portfolioRow && portfolioRow.bottlePrice > 0 && (
                                <span className="text-muted text-xs">${portfolioRow.bottlePrice.toFixed(2)}</span>
                              )}
                              <span className="ml-auto text-muted/60 text-[11px] font-mono">{w.wineCode}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted">
                  No producers match your search.
                </div>
              )}
            </div>
          )}
        </div>
      </Shell>
      <WineDrawer wine={selectedWine} onClose={() => setSelectedWine(null)} />
    </>
  );
}
