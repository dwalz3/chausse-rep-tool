'use client';

import { useState, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

export default function ProducersPage() {
  const producersData = useStore((s) => s.producersData);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    <Shell>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0 }}>Producers</h1>
            {!noData && (
              <p style={{ fontSize: 13, color: '#a8a29e', margin: '4px 0 0' }}>
                {filtered.length} producers
              </p>
            )}
          </div>
          {!noData && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
              <input
                type="text"
                placeholder="Search producers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #E5E1DC', borderRadius: 8, fontSize: 13, color: '#1C1917', backgroundColor: '#FFFFFF', outline: 'none', width: 220 }}
              />
            </div>
          )}
        </div>

        {noData ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>
            Upload Producers data on the <a href="/upload" style={{ color: '#2D5A3D', fontWeight: 600 }}>Upload page</a> first.
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', overflow: 'hidden' }}>
            {filtered.map((p, i) => {
              const isExpanded = expanded.has(p.name);
              const wines = winesByProducer.get(p.name.toLowerCase()) ?? [];
              const wineCount = wineCountMap.get(p.name.toLowerCase()) ?? 0;
              return (
                <div key={p.recordId} style={{ borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
                  {/* Producer row */}
                  <div
                    onClick={() => wines.length > 0 && toggleExpand(p.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: wines.length > 0 ? 'pointer' : 'default',
                      gap: 12,
                    }}
                    onMouseEnter={(e) => wines.length > 0 && (e.currentTarget.style.backgroundColor = '#F9F9F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ color: '#a8a29e', width: 16, flexShrink: 0 }}>
                      {wines.length > 0 ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1917' }}>{p.name}</span>
                      {p.region && <span style={{ fontSize: 12, color: '#a8a29e', marginLeft: 8 }}>{p.region}</span>}
                    </div>
                    <span style={{ fontSize: 13, color: '#a8a29e', flexShrink: 0 }}>{p.country}</span>
                    {p.isDirectImport && (
                      <span style={{ fontSize: 11, backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '2px 7px', fontWeight: 600, flexShrink: 0 }}>
                        Direct
                      </span>
                    )}
                    {wineCount > 0 && (
                      <span style={{ fontSize: 12, backgroundColor: '#F3F4F6', color: '#a8a29e', borderRadius: 10, padding: '1px 8px', fontWeight: 600, flexShrink: 0 }}>
                        {wineCount} wines
                      </span>
                    )}
                  </div>

                  {/* Expanded wines */}
                  {isExpanded && wines.length > 0 && (
                    <div style={{ backgroundColor: '#F9F9F9', paddingLeft: 44, paddingRight: 16, paddingBottom: 8 }}>
                      {wines.map((w) => (
                        <div key={w.wineCode} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
                          <span style={{ color: '#1C1917' }}>{w.wineName || w.name}</span>
                          {w.vintage && <span style={{ color: '#a8a29e' }}>{w.vintage}</span>}
                          <span style={{ marginLeft: 'auto', color: '#a8a29e', fontSize: 11 }}>{w.wineCode}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#a8a29e' }}>
                No producers match your search.
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
