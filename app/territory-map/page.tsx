'use client';

import { useMemo, useState } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { getWineTypeStyle } from '@/lib/constants/wineColors';
import { WineType } from '@/types';

const CATEGORIES: WineType[] = ['Red', 'White', 'Sparkling', 'Orange', 'Rosé', 'Vermouth', 'Tea/NA'];

function normCode(s: string) { return s.toString().trim().toUpperCase(); }

function fmt$(n: number) { return '$' + Math.round(n).toLocaleString(); }

/**
 * Fallback: infer wine type from a wine name string.
 * Used when wine properties data is absent or returns 'Other' for a code.
 */
function inferWineType(name: string): WineType | null {
  const s = name.toLowerCase();
  // Sparkling first
  if (s.includes('sparkling') || s.includes('champagne') || s.includes('prosecco') ||
      s.includes('cava') || s.includes('crémant') || s.includes('cremant') ||
      s.includes('pét nat') || s.includes('pet nat') || s.includes('pétillant') ||
      s.includes('petillant') || s.includes('mousseux') || s.includes('frizzante') ||
      s.includes('lambrusco')) return 'Sparkling';
  // Orange / skin-contact
  if (s.includes('orange wine') || s.includes('skin contact') || s.includes('skin-contact') ||
      s.includes('amber wine') || s.includes('ramato')) return 'Orange';
  // Rosé (before red to avoid 'rosso' conflicts)
  if (s.includes('rosé') || s.includes('rose wine') || s.includes('rosato') || s.includes('rosado')) return 'Rosé';
  // Vermouth / aperitif
  if (s.includes('vermouth') || s.includes('aperitif') || s.includes('apéritif') ||
      s.includes('amaro') || s.includes('fortified')) return 'Vermouth';
  // Non-alcoholic
  if (s.includes('non-alc') || s.includes('dealc') || s.includes('non alcoholic') ||
      s.includes('kombucha') || s.includes('zero alcohol') || s.includes('alcohol free')) return 'Tea/NA';
  // Red varietals & keywords
  if (s.includes('red wine') || s.includes('rouge') || s.includes('tinto') || s.includes('rosso') ||
      s.includes('nero') || s.includes(' noir') || s.includes('cabernet') || s.includes('merlot') ||
      s.includes('shiraz') || s.includes('syrah') || s.includes('malbec') ||
      s.includes('barbera') || s.includes('nebbiolo') || s.includes('sangiovese') ||
      s.includes('tempranillo') || s.includes('grenache') || s.includes('gamay') ||
      s.includes('mourvèdre') || s.includes('mourvedre') || s.includes('zinfandel') ||
      s.includes('primitivo') || s.includes('dolcetto') || s.includes('corvina') ||
      s.includes('montepulciano') || s.includes('aglianico') || s.includes('nero d')) return 'Red';
  // White varietals & keywords
  if (s.includes('white wine') || s.includes('blanc') || s.includes('bianco') || s.includes('blanco') ||
      s.includes('weiss') || s.includes('chardonnay') || s.includes('riesling') ||
      s.includes('sauvignon') || s.includes('pinot grigio') || s.includes('pinot gris') ||
      s.includes('gewürz') || s.includes('gewurz') || s.includes('viognier') ||
      s.includes('chenin') || s.includes('grüner') || s.includes('gruner') ||
      s.includes('vermentino') || s.includes('verdicchio') || s.includes('muscadet') ||
      s.includes('albariño') || s.includes('albarino') || s.includes('torrontés') ||
      s.includes('torrontes') || s.includes('trebbiano') || s.includes('pinot bianco')) return 'White';
  return null;
}

type SortMode = 'revenue' | 'alpha' | 'gaps';

export default function TerritoryMapPage() {
  const ra23Data = useStore((s) => s.ra23Data);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const ra21Data = useStore((s) => s.ra21Data);
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);

  const [sortMode, setSortMode] = useState<SortMode>('revenue');
  const [enabledCategories, setEnabledCategories] = useState<Set<WineType>>(new Set(CATEGORIES));
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  function toggleCategory(cat: WineType) {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Build wine code → category map from wine properties
  const wineTypeMap = useMemo(() => {
    const map = new Map<string, WineType>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) map.set(normCode(w.wineCode), w.wineType);
    }
    return map;
  }, [winePropertiesData]);

  // Build wine code → best name map (prefer ra21 for name, fall back to ra23, then wineProperties)
  const wineNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) map.set(normCode(w.wineCode), w.wineName || w.name);
    }
    if (ra21Data) {
      for (const r of ra21Data.rows) if (r.wineCode) map.set(normCode(r.wineCode), r.wineName || map.get(normCode(r.wineCode)) || r.wineCode);
    }
    return map;
  }, [winePropertiesData, ra21Data]);

  // Build account revenue from RC5 (for ordering accounts)
  const accountRevenueMap = useMemo(() => {
    const map = new Map<string, number>();
    if (rc5Data && rep) {
      for (const r of rc5Data.rows) {
        if (r.primaryRep === rep) map.set(r.account, r.totalRevenue);
      }
    }
    return map;
  }, [rc5Data, rep]);

  // Build: account → Set of wine types purchased (from ra23)
  // Also build: account → { category → { revenue, topWine } }
  type CellData = { revenue: number; topWineCode: string; topWineName: string };
  const { accountRows, topAccounts } = useMemo(() => {
    if (!ra23Data) return { accountRows: [], topAccounts: [] };

    // account → category → { revenue, topWineCode, topWineName }
    const acctCatMap = new Map<string, Map<WineType, CellData>>();

    for (const row of ra23Data.rows) {
      // Try wine properties map first; fall back to name-based inference
      let wineType = wineTypeMap.get(normCode(row.wineCode));
      if (!wineType || !CATEGORIES.includes(wineType)) {
        const inferred = inferWineType(row.wineName || row.wineCode || '');
        if (inferred) wineType = inferred;
        else continue;
      }

      if (!acctCatMap.has(row.account)) acctCatMap.set(row.account, new Map());
      const catMap = acctCatMap.get(row.account)!;
      const existing = catMap.get(wineType);
      if (!existing || row.revenue > existing.revenue) {
        catMap.set(wineType, {
          revenue: (existing?.revenue ?? 0) + row.revenue,
          topWineCode: row.wineCode,
          topWineName: wineNameMap.get(normCode(row.wineCode)) || row.wineName || row.wineCode,
        });
      } else {
        catMap.set(wineType, { ...existing, revenue: existing.revenue + row.revenue });
      }
    }

    const accounts = Array.from(acctCatMap.entries()).map(([account, catMap]) => ({
      account,
      catMap,
      totalRevenue: Array.from(catMap.values()).reduce((s, v) => s + v.revenue, 0),
      gapCount: CATEGORIES.filter((c) => !catMap.has(c)).length,
    }));

    // Top 40 accounts
    let sorted = accounts;
    if (sortMode === 'revenue') sorted = accounts.sort((a, b) => b.totalRevenue - a.totalRevenue);
    else if (sortMode === 'alpha') sorted = accounts.sort((a, b) => a.account.localeCompare(b.account));
    else sorted = accounts.sort((a, b) => b.gapCount - a.gapCount);

    return { accountRows: sorted.slice(0, 40), topAccounts: accounts };
  }, [ra23Data, wineTypeMap, wineNameMap, sortMode, accountRevenueMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCategories = CATEGORIES.filter((c) => enabledCategories.has(c));

  const noData = !ra23Data;
  const noWineProps = !winePropertiesData;

  return (
    <Shell>
      <div style={{ maxWidth: 1200 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 4px' }}>Territory Map</h1>
        <p style={{ fontSize: 13, color: '#7D8590', margin: '0 0 20px' }}>
          Category heatmap: top 40 accounts × wine types. Filled = ordered. Empty = opportunity.
        </p>

        {noData ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 40, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload <strong style={{ color: '#E6EDF3' }}>RA23</strong> (Account + Wine Detail) to populate the Territory Map.{' '}
            <a href="/integrations" style={{ color: '#3FB950', fontWeight: 600 }}>Sync via Integrations →</a>
          </div>
        ) : noWineProps ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #E3B341', padding: 20, color: '#E3B341', fontSize: 13, marginBottom: 20 }}>
            Upload <strong>Wine Properties</strong> to see wine type categories.
          </div>
        ) : (
          <>
            {/* Controls */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              {/* Sort */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['revenue', 'alpha', 'gaps'] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                      backgroundColor: sortMode === mode ? '#2D5A3D' : '#21262D',
                      color: sortMode === mode ? '#3FB950' : '#7D8590',
                      border: `1px solid ${sortMode === mode ? '#3FB950' : '#30363D'}`,
                    }}
                  >
                    {mode === 'revenue' ? 'By Revenue' : mode === 'alpha' ? 'A → Z' : 'Most Gaps'}
                  </button>
                ))}
              </div>

              {/* Category toggles */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map((cat) => {
                  const s = getWineTypeStyle(cat);
                  const on = enabledCategories.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                        backgroundColor: on ? s.bg : '#21262D',
                        color: on ? s.text : '#484F58',
                        border: `1px solid ${on ? s.text + '60' : '#30363D'}`,
                        opacity: on ? 1 : 0.5,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Heatmap */}
            <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1C2128', position: 'sticky', top: 0, zIndex: 3 }}>
                    <th style={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: '#1C2128', padding: '10px 16px', textAlign: 'left', color: '#7D8590', fontWeight: 500, fontSize: 11, borderRight: '1px solid #30363D', minWidth: 200 }}>
                      Account
                    </th>
                    {visibleCategories.map((cat) => {
                      const s = getWineTypeStyle(cat);
                      return (
                        <th key={cat} style={{ padding: '10px 8px', minWidth: 80, textAlign: 'center', borderRight: '1px solid #21262D' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: s.bg, color: s.text, borderRadius: 4, padding: '2px 6px' }}>
                            {cat}
                          </span>
                        </th>
                      );
                    })}
                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#7D8590', fontWeight: 500, fontSize: 11 }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {accountRows.map((acctRow) => (
                    <tr
                      key={acctRow.account}
                      style={{ borderTop: '1px solid #21262D' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ position: 'sticky', left: 0, backgroundColor: '#161B22', zIndex: 1, padding: '8px 16px', color: '#E6EDF3', fontWeight: 500, borderRight: '1px solid #30363D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {acctRow.account}
                      </td>
                      {visibleCategories.map((cat) => {
                        const cell = acctRow.catMap.get(cat);
                        const s = getWineTypeStyle(cat);
                        return (
                          <td
                            key={cat}
                            title={cell ? `${cat} at ${acctRow.account}\n${cell.topWineName}\n${fmt$(cell.revenue)}` : `No ${cat} ordered — suggest from RA21`}
                            style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              borderRight: '1px solid #21262D',
                              cursor: 'pointer',
                              backgroundColor: cell ? s.bg + '40' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                x: rect.left,
                                y: rect.bottom + 4,
                                content: cell
                                  ? `${cell.topWineName}\n${fmt$(cell.revenue)}`
                                  : `No ${cat} — opportunity!`,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {cell ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: s.text }}>✓</span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#21262D' }}>·</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#E6EDF3', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {fmt$(acctRow.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 10, fontSize: 12, color: '#484F58' }}>
              Showing top {accountRows.length} of {topAccounts.length} accounts with RA23 data.
            </p>
            {topAccounts.length === 0 && ra23Data && ra23Data.rows.length > 0 && (
              <div style={{ backgroundColor: '#161B22', border: '1px solid #E3B341', borderRadius: 8, padding: '12px 16px', marginTop: 8, fontSize: 12, color: '#E3B341' }}>
                RA23 has {ra23Data.rows.length.toLocaleString()} rows but none could be categorized by wine type.
                Check that Wine Names in RA23 include type keywords (Red, White, Sparkling, etc.) or upload Wine Properties with a type/category column.
              </div>
            )}
          </>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: '#1C2128',
            border: '1px solid #30363D',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: '#E6EDF3',
            zIndex: 1000,
            pointerEvents: 'none',
            whiteSpace: 'pre',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </Shell>
  );
}
