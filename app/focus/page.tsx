'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Ra21Row } from '@/types/reports';
import { WineType as WineTypeProp } from '@/types';

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

function fmt$(n: number) {
  return '$' + Math.round(n).toLocaleString();
}

function fmtMonth(ym: string | null) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// Talking-point chips for each wine
interface TalkingPoint { label: string; color: string; bg: string }

function TalkingPointChip({ tp }: { tp: TalkingPoint }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: tp.bg, color: tp.color, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
      {tp.label}
    </span>
  );
}

export default function FocusPage() {
  const router = useRouter();
  const rc5Data      = useStore((s) => s.rc5Data);
  const ra21Data     = useStore((s) => s.ra21Data);
  const ra30Data     = useStore((s) => s.ra30Data);
  const ra3Data      = useStore((s) => s.ra3Data);
  const rb6RepData   = useStore((s) => s.rb6RepData);
  const ra27Data     = useStore((s) => s.ra27Data);
  const inventoryData = useStore((s) => s.inventoryData);
  const pricingData  = useStore((s) => s.pricingData);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const rep          = useStore((s) => s.rep);

  // ── Lookup maps ───────────────────────────────────────────────────────────────

  const winePropsMap = useMemo(() => {
    const map = new Map<string, { wineType: WineTypeProp; producer: string; country: string; wineName: string }>();
    if (winePropertiesData) {
      for (const w of winePropertiesData) {
        map.set(normCode(w.wineCode), { wineType: w.wineType, producer: w.producer, country: w.country, wineName: w.wineName || w.name });
      }
    }
    return map;
  }, [winePropertiesData]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (pricingData) {
      for (const p of pricingData) map.set(normCode(p.wineCode), p.defaultPrice);
    }
    return map;
  }, [pricingData]);

  const repAccounts = useMemo(() => {
    if (!rc5Data || !rep) return new Set<string>();
    const s = new Set<string>();
    for (const r of rc5Data.rows) if (r.primaryRep === rep) s.add(r.account.toLowerCase());
    return s;
  }, [rc5Data, rep]);

  // ── RA21-based enriched rows ──────────────────────────────────────────────────

  function enrichRa21(row: Ra21Row) {
    const key = normCode(row.wineCode);
    const props = winePropsMap.get(key);
    const price = priceMap.get(key) ?? 0;
    const rb6   = rb6RepData?.byWineCode?.[key];
    const accountCount = ra27Data?.byWineCode?.[key] ?? row.accountCount ?? 0;
    const recentPlacements = ra30Data?.byWineCode?.[key]?.filter((r) => (r.daysAgo ?? 999) <= 90).length ?? 0;

    // Build talking points: Low stock > New placements > Account count > Rank
    const tps: TalkingPoint[] = [];
    if (rb6?.isOutOfStock) tps.push({ label: 'Out of stock', color: '#F85149', bg: '#3D0000' });
    else if (rb6?.isCritical) tps.push({ label: 'Critical stock', color: '#F85149', bg: '#3D0000' });
    else if (rb6?.isLowStock) tps.push({ label: 'Low stock', color: '#E3B341', bg: '#2D2000' });
    if (recentPlacements > 0) tps.push({ label: `+${recentPlacements} new placement${recentPlacements > 1 ? 's' : ''}`, color: '#79BAFF', bg: '#031D41' });
    if (accountCount > 0) tps.push({ label: `${accountCount} accts`, color: '#8B949E', bg: '#21262D' });
    tps.push({ label: `#${row.rank}`, color: '#3FB950', bg: '#0D2918' });

    return { ...row, props, price, accountCount, tps };
  }

  const pushThese = useMemo(() => {
    if (!ra21Data) return [];
    return ra21Data.rows.slice(0, 15).map(enrichRa21);
  }, [ra21Data, winePropsMap, priceMap, rb6RepData, ra27Data, ra30Data]); // eslint-disable-line react-hooks/exhaustive-deps

  const expandThese = useMemo(() => {
    if (!ra21Data) return [];
    return ra21Data.rows
      .filter((r) => {
        const count = ra27Data?.byWineCode?.[normCode(r.wineCode)] ?? r.accountCount ?? 0;
        return count < 10 && r.revenue > 5000;
      })
      .sort((a, b) => {
        const aCount = ra27Data?.byWineCode?.[normCode(a.wineCode)] ?? a.accountCount ?? 1;
        const bCount = ra27Data?.byWineCode?.[normCode(b.wineCode)] ?? b.accountCount ?? 1;
        return (b.revenue / Math.max(bCount, 1)) - (a.revenue / Math.max(aCount, 1));
      })
      .slice(0, 10)
      .map(enrichRa21);
  }, [ra21Data, winePropsMap, priceMap, rb6RepData, ra27Data, ra30Data]); // eslint-disable-line react-hooks/exhaustive-deps

  const newPlacements = useMemo(() => {
    if (!ra30Data) return [];
    return ra30Data.recentPlacements
      .sort((a, b) => (a.daysAgo ?? 999) - (b.daysAgo ?? 999))
      .slice(0, 10);
  }, [ra30Data]);

  const watchList = useMemo(() => {
    if (!ra3Data) return [];
    return ra3Data.rows
      .filter((r) => r.trend === 'Declining')
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 5);
  }, [ra3Data]);

  // ── RB1 velocity fallback ────────────────────────────────────────────────────

  const rb1Wines = useMemo(() => {
    if (!inventoryData) return [];
    return inventoryData
      .filter((inv) => (inv.qtySoldLast30Days ?? 0) > 0)
      .map((inv) => {
        const key = normCode(inv.wineCode);
        const props = winePropsMap.get(key);
        const price = priceMap.get(key) ?? inv.defaultPrice ?? 0;
        return { ...inv, props, price, qtySold: inv.qtySoldLast30Days ?? 0 };
      })
      .sort((a, b) => b.qtySold - a.qtySold);
  }, [inventoryData, winePropsMap, priceMap]);

  // ── Dormant reactivate list ──────────────────────────────────────────────────

  const reactivateList = useMemo(() => {
    if (!rc5Data || !rep) return [];
    return rc5Data.rows
      .filter((r) => r.primaryRep === rep && r.isDormant && r.totalRevenue > 0)
      .map((r) => ({ account: r.account, lastActive: r.lastActiveMonth, totalRevenue: r.totalRevenue, threeMo: r.monthlyRevenue.slice(9, 12).reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8);
  }, [rc5Data, rep]);

  // ── Layout logic ─────────────────────────────────────────────────────────────

  const hasRa21 = (ra21Data?.rows.length ?? 0) > 0;
  const hasRb1  = rb1Wines.length > 0;
  const noData  = !hasRa21 && !hasRb1 && !rep;

  // ── Shared RA21 wine row ─────────────────────────────────────────────────────

  function Ra21WineRow({ item, idx, showRev = true }: {
    item: ReturnType<typeof enrichRa21>;
    idx: number;
    showRev?: boolean;
  }) {
    return (
      <tr
        style={{ borderTop: '1px solid #21262D', cursor: 'pointer' }}
        onClick={() => item.wineCode && router.push(`/portfolio/${encodeURIComponent(item.wineCode)}`)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <td style={{ padding: '9px 16px', color: '#7D8590', fontSize: 12, width: 32 }}>{idx + 1}</td>
        <td style={{ padding: '9px 16px', width: 80 }}>
          {item.props ? (
            <WineTypeBadge type={item.props.wineType} />
          ) : (
            <span style={{ fontSize: 11, backgroundColor: '#21262D', color: '#7D8590', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>—</span>
          )}
        </td>
        <td style={{ padding: '9px 16px', maxWidth: 260 }}>
          <div style={{ color: '#E6EDF3', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.props?.wineName || item.wineName || item.wineCode}
          </div>
          {item.props && <div style={{ color: '#7D8590', fontSize: 11, marginTop: 1 }}>{item.props.producer}{item.props.country ? ` · ${item.props.country}` : ''}</div>}
        </td>
        <td style={{ padding: '9px 8px' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {item.tps.map((tp, ti) => <TalkingPointChip key={ti} tp={tp} />)}
          </div>
        </td>
        {showRev && (
          <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums', width: 90 }}>
            {item.revenue > 0 ? fmt$(item.revenue) : '—'}
          </td>
        )}
        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontSize: 12, width: 60, fontVariantNumeric: 'tabular-nums' }}>
          {item.price > 0 ? `$${item.price.toFixed(2)}` : '—'}
        </td>
      </tr>
    );
  }

  function Section({ title, subtitle, icon, iconColor, count, children }: {
    title: string; subtitle?: string; icon: React.ReactNode; iconColor: string; count: number; children: React.ReactNode;
  }) {
    return (
      <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: iconColor }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E6EDF3' }}>{title}</h3>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7D8590' }}>{subtitle}</p>}
          </div>
          <span style={{ fontSize: 12, color: '#7D8590' }}>({count})</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 960 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 4px' }}>Focus List</h1>
        <p style={{ fontSize: 13, color: '#7D8590', margin: '0 0 20px' }}>
          Top performing wines and accounts to prioritize.
        </p>

        {/* Banner if RA23 missing */}
        {!useStore((s) => s.ra23Data) && (
          <div style={{ backgroundColor: '#1C1610', border: '1px solid #3D2B00', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={15} color="#E3B341" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#E3B341' }}>Upload RA23 to unlock full Focus detail</span>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7D8590' }}>
                Account × Wine detail required for per-account drilling.{' '}
                <Link href="/integrations" style={{ color: '#3FB950', textDecoration: 'none', fontWeight: 600 }}>Sync via Integrations →</Link>
              </p>
            </div>
          </div>
        )}

        {noData ? (
          <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: 40, textAlign: 'center', color: '#7D8590', fontSize: 14 }}>
            Upload RA21 (Top Wines) or RB1 inventory on the{' '}
            <a href="/upload" style={{ color: '#3FB950', fontWeight: 600 }}>Upload page</a> to populate Focus List.
          </div>
        ) : (
          <>
            {hasRa21 ? (
              <>
                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Ranked SKUs', value: ra21Data!.rows.length.toLocaleString() },
                    { label: 'Top Wine Revenue', value: ra21Data!.rows[0]?.revenue ? fmt$(ra21Data!.rows[0].revenue) : '—' },
                    { label: 'New Placements (90d)', value: (ra30Data?.recentPlacements.length ?? 0).toLocaleString() },
                    { label: 'Declining SKUs', value: watchList.length.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, color: '#7D8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Push These */}
                {pushThese.length > 0 && (
                  <Section title="Push These — Top Performers" subtitle="Ranked by revenue from RA21" icon={<TrendingUp size={16} />} iconColor="#3FB950" count={pushThese.length}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ backgroundColor: '#1C2128' }}>
                        <tr>
                          <th style={{ width: 32, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>#</th>
                          <th style={{ width: 80, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Type</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Talking Points</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Revenue</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Price/btl</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pushThese.map((w, i) => <Ra21WineRow key={w.wineCode || i} item={w} idx={i} />)}
                      </tbody>
                    </table>
                  </Section>
                )}

                {/* Expand These */}
                {expandThese.length > 0 && (
                  <Section title="Expand These — High Revenue, Low Distribution" subtitle="High revenue but fewer than 10 accounts — opportunity to grow" icon={<Info size={16} />} iconColor="#79BAFF" count={expandThese.length}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ backgroundColor: '#1C2128' }}>
                        <tr>
                          <th style={{ width: 32, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>#</th>
                          <th style={{ width: 80, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Type</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Talking Points</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Revenue</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Price/btl</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expandThese.map((w, i) => <Ra21WineRow key={w.wineCode || i} item={w} idx={i} />)}
                      </tbody>
                    </table>
                  </Section>
                )}

                {/* New Placements */}
                {newPlacements.length > 0 && (
                  <Section title="New Placements — Last 90 Days" subtitle="First-time wine placements at accounts" icon={<TrendingUp size={16} />} iconColor="#58A6FF" count={newPlacements.length}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ backgroundColor: '#1C2128' }}>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Account</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Days Ago</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Importer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPlacements.map((p, i) => {
                          const key = normCode(p.wineCode);
                          const props = winePropsMap.get(key);
                          return (
                            <tr key={i} style={{ borderTop: '1px solid #21262D' }}>
                              <td style={{ padding: '9px 16px', maxWidth: 240 }}>
                                <div style={{ color: '#E6EDF3', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {props?.wineName || p.wineName || p.wineCode}
                                </div>
                                {props?.producer && <div style={{ fontSize: 11, color: '#7D8590', marginTop: 1 }}>{props.producer}</div>}
                              </td>
                              <td style={{ padding: '9px 16px', color: '#7D8590' }}>{p.account}</td>
                              <td style={{ padding: '9px 16px', textAlign: 'right', color: '#58A6FF', fontWeight: 600 }}>
                                {p.daysAgo !== null ? `${p.daysAgo}d ago` : '—'}
                              </td>
                              <td style={{ padding: '9px 16px', textAlign: 'right', color: '#484F58', fontSize: 12 }}>{p.importer || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Section>
                )}

                {/* Watch List — Declines */}
                {watchList.length > 0 && (
                  <Section title="Watch List — Recent Declines" subtitle={`From RA3 period comparison · ${ra3Data?.currentPeriodLabel ?? 'current'} vs ${ra3Data?.priorPeriodLabel ?? 'prior'}`} icon={<TrendingDown size={16} />} iconColor="#F85149" count={watchList.length}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ backgroundColor: '#1C2128' }}>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Current Rev</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Prior Rev</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {watchList.map((w, i) => {
                          const props = winePropsMap.get(normCode(w.wineCode));
                          const changePct = isFinite(w.changePct) ? w.changePct : 0;
                          return (
                            <tr
                              key={i}
                              style={{ borderTop: '1px solid #21262D', cursor: 'pointer' }}
                              onClick={() => w.wineCode && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <td style={{ padding: '9px 16px', maxWidth: 260 }}>
                                <div style={{ color: '#E6EDF3', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {props?.wineName || w.wineName || w.wineCode}
                                </div>
                                {props?.producer && <div style={{ fontSize: 11, color: '#7D8590', marginTop: 1 }}>{props.producer}</div>}
                              </td>
                              <td style={{ padding: '9px 16px', textAlign: 'right', color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>{fmt$(w.currentPeriodRevenue)}</td>
                              <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontVariantNumeric: 'tabular-nums' }}>{fmt$(w.priorPeriodRevenue)}</td>
                              <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: '#F85149', fontVariantNumeric: 'tabular-nums' }}>
                                {changePct.toFixed(0)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Section>
                )}
              </>
            ) : hasRb1 ? (
              <>
                {/* KPI cards (RB1 fallback) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Active SKUs', value: rb1Wines.length.toLocaleString() },
                    { label: 'Btl Sold (30d)', value: rb1Wines.reduce((s, w) => s + w.qtySold, 0).toLocaleString() },
                    { label: 'Active Accounts', value: repAccounts.size > 0 ? repAccounts.size.toLocaleString() : '—' },
                    { label: 'In Stock', value: rb1Wines.filter(w => w.bottlesOnHand > 0).length.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, color: '#7D8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ backgroundColor: '#161B22', borderRadius: 10, border: '1px solid #30363D', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#3FB950' }}><TrendingUp size={16} /></span>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E6EDF3' }}>Top Movers — Last 30 Days</h3>
                    <span style={{ fontSize: 12, color: '#7D8590' }}>({rb1Wines.length})</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#484F58' }}>from RB1 · <Link href="/integrations" style={{ color: '#7D8590', textDecoration: 'none' }}>upload RA21 for full ranking →</Link></span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ backgroundColor: '#1C2128' }}>
                      <tr>
                        <th style={{ width: 32, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>#</th>
                        <th style={{ width: 80, padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
                        <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Sold (30d)</th>
                        <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rb1Wines.map((w, i) => {
                        const key = normCode(w.wineCode);
                        const props = winePropsMap.get(key);
                        return (
                          <tr
                            key={w.wineCode}
                            style={{ borderTop: '1px solid #21262D', cursor: props ? 'pointer' : 'default' }}
                            onClick={() => props && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                            onMouseEnter={(e) => props && (e.currentTarget.style.backgroundColor = '#1C2128')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '9px 16px', color: '#7D8590', fontSize: 12 }}>{i + 1}</td>
                            <td style={{ padding: '9px 16px' }}>
                              {props ? <WineTypeBadge type={props.wineType} /> : <span style={{ fontSize: 11, backgroundColor: '#21262D', color: '#7D8590', borderRadius: 4, padding: '2px 7px' }}>—</span>}
                            </td>
                            <td style={{ padding: '9px 16px', maxWidth: 300 }}>
                              <div style={{ color: '#E6EDF3', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{props?.wineName || w.wineName}</div>
                              {props && <div style={{ fontSize: 11, color: '#7D8590', marginTop: 1 }}>{props.producer}{props.country ? ` · ${props.country}` : ''}</div>}
                            </td>
                            <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: '#3FB950', fontVariantNumeric: 'tabular-nums' }}>{w.qtySold} btl</td>
                            <td style={{ padding: '9px 16px', textAlign: 'right', color: w.bottlesOnHand > 0 ? '#E6EDF3' : '#484F58', fontVariantNumeric: 'tabular-nums' }}>
                              {w.bottlesOnHand > 0 ? `${w.bottlesOnHand} btl` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {/* Reactivate section */}
            {reactivateList.length > 0 && (
              <Section title="Reactivate — Dormant Accounts" icon={<RefreshCw size={16} />} iconColor="#F85149" count={reactivateList.length}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ backgroundColor: '#1C2128' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Account</th>
                      <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Last Active</th>
                      <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Peak 3-Mo</th>
                      <th style={{ textAlign: 'right', padding: '8px 16px', color: '#7D8590', fontWeight: 500 }}>Lifetime Rev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reactivateList.map((acct) => (
                      <tr
                        key={acct.account}
                        style={{ borderTop: '1px solid #21262D', cursor: 'pointer' }}
                        onClick={() => router.push(`/accounts/${encodeURIComponent(acct.account)}`)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1C2128')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '9px 16px', color: '#E6EDF3', fontWeight: 500 }}>{acct.account}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590' }}>{fmtMonth(acct.lastActive)}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#7D8590', fontVariantNumeric: 'tabular-nums' }}>{acct.threeMo > 0 ? fmt$(acct.threeMo) : '—'}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: '#E6EDF3', fontVariantNumeric: 'tabular-nums' }}>{fmt$(acct.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
