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
  biodynamic:        { label: 'Biodynamic',        bg: '#003730', color: '#22D3A5' },
  biodynamique:      { label: 'Biodynamic',        bg: '#003730', color: '#22D3A5' },
  demeter:           { label: 'Demeter',            bg: '#003730', color: '#22D3A5' },
  natural:           { label: 'Natural',            bg: '#0D2918', color: '#3FB950' },
  organic:           { label: 'Organic',            bg: '#0D2918', color: '#3FB950' },
  sustainable:       { label: 'Sustainable',        bg: '#1C2640', color: '#79BAFF' },
  'lutte raisonnée': { label: 'Lutte Raisonnée',   bg: '#1C2640', color: '#79BAFF' },
  lutte:             { label: 'Lutte Raisonnée',   bg: '#1C2640', color: '#79BAFF' },
};

function FarmingBadge({ practice }: { practice: string }) {
  const key = practice.toLowerCase();
  // Try exact match, then prefix match
  const style = FARMING_LABELS[key] ??
    Object.entries(FARMING_LABELS).find(([k]) => key.includes(k))?.[1] ??
    { label: practice, bg: '#21262D', color: '#7D8590' };
  return (
    <span style={{ fontSize: 11, backgroundColor: style.bg, color: style.color, borderRadius: 4, padding: '2px 7px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {style.label}
    </span>
  );
}

function BioSection({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 160;
  const short = text.length > LIMIT;
  return (
    <div style={{ fontSize: 12, color: '#7D8590', marginTop: 6, lineHeight: 1.55 }}>
      {expanded || !short ? text : text.slice(0, LIMIT) + '…'}
      {short && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          style={{ marginLeft: 6, background: 'none', border: 'none', color: '#3FB950', fontSize: 12, cursor: 'pointer', padding: 0 }}
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
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>Producers</h1>
            {!noData && (
              <p style={{ fontSize: 13, color: '#7D8590', margin: '4px 0 0' }}>
                {filtered.length} producers
              </p>
            )}
          </div>
          {!noData && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7D8590' }} />
              <input
                type="text"
                placeholder="Search producers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #30363D', borderRadius: 8, fontSize: 13, color: '#E6EDF3', backgroundColor: '#161B22', outline: 'none', width: 220 }}
              />
            </div>
          )}
        </div>

        {noData ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 32, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload Producers data on the <a href="/upload" style={{ color: '#3FB950', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden' }}>
            {filtered.map((p, i) => {
              const isExpanded = expanded.has(p.name);
              const wines = winesByProducer.get(p.name.toLowerCase()) ?? [];
              const wineCount = wineCountMap.get(p.name.toLowerCase()) ?? 0;
              return (
                <div key={p.recordId} style={{ borderTop: i === 0 ? 'none' : '1px solid #21262D' }}>
                  {/* Producer row */}
                  <div
                    onClick={() => wines.length > 0 && toggleExpand(p.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '14px 16px',
                      cursor: wines.length > 0 ? 'pointer' : 'default',
                      gap: 12,
                    }}
                    onMouseEnter={(e) => wines.length > 0 && (e.currentTarget.style.backgroundColor = '#1C2128')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ color: '#7D8590', width: 16, flexShrink: 0, marginTop: 2 }}>
                      {wines.length > 0 ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>{p.name}</span>
                        {p.region && <span style={{ fontSize: 12, color: '#7D8590' }}>{p.region}</span>}
                      </div>
                      {/* Farming badges */}
                      {p.farmingPractices && p.farmingPractices.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {p.farmingPractices.map((f) => (
                            <FarmingBadge key={f} practice={f} />
                          ))}
                        </div>
                      )}
                      {/* Bio */}
                      {p.about && <BioSection text={p.about} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, color: '#7D8590' }}>{p.country}</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {p.isDirectImport && (
                          <span style={{ fontSize: 11, backgroundColor: '#2A2500', color: '#E3B341', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                            Direct
                          </span>
                        )}
                        {wineCount > 0 && (
                          <span style={{ fontSize: 12, backgroundColor: '#21262D', color: '#7D8590', borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>
                            {wineCount} {wineCount === 1 ? 'wine' : 'wines'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded wines */}
                  {isExpanded && wines.length > 0 && (
                    <div style={{ backgroundColor: '#1C2128', paddingLeft: 44, paddingRight: 16, paddingBottom: 8 }}>
                      {wines.map((w) => {
                        const portfolioRow = portfolioMap.get(normCode(w.wineCode));
                        return (
                          <div
                            key={w.wineCode}
                            onClick={(e) => { e.stopPropagation(); if (portfolioRow) setSelectedWine(portfolioRow); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid #21262D', fontSize: 13, cursor: portfolioRow ? 'pointer' : 'default' }}
                            onMouseEnter={(e) => portfolioRow && (e.currentTarget.style.backgroundColor = '#21262D')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span style={{ color: '#E6EDF3' }}>{w.wineName || w.name}</span>
                            {w.vintage && <span style={{ color: '#7D8590' }}>{w.vintage}</span>}
                            {portfolioRow && portfolioRow.bottlePrice > 0 && (
                              <span style={{ color: '#7D8590', fontSize: 12 }}>${portfolioRow.bottlePrice.toFixed(2)}</span>
                            )}
                            <span style={{ marginLeft: 'auto', color: '#484F58', fontSize: 11 }}>{w.wineCode}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#7D8590' }}>
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
