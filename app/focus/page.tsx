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
    <span className="text-[10px] font-bold rounded px-1.5 py-0.5 whitespace-nowrap" style={{ backgroundColor: tp.bg, color: tp.color }}>
      {tp.label}
    </span>
  );
}

export default function FocusPage() {
  const router = useRouter();
  const rc5Data = useStore((s) => s.rc5Data);
  const ra21Data = useStore((s) => s.ra21Data);
  const ra30Data = useStore((s) => s.ra30Data);
  const ra3Data = useStore((s) => s.ra3Data);
  const rb6RepData = useStore((s) => s.rb6RepData);
  const ra27Data = useStore((s) => s.ra27Data);
  const inventoryData = useStore((s) => s.inventoryData);
  const pricingData = useStore((s) => s.pricingData);
  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const rep = useStore((s) => s.rep);

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
    const rb6 = rb6RepData?.byWineCode?.[key];
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
  const hasRb1 = rb1Wines.length > 0;
  const noData = !hasRa21 && !hasRb1 && !rep;

  // ── Shared RA21 wine row ─────────────────────────────────────────────────────

  function Ra21WineRow({ item, idx, showRev = true }: {
    item: ReturnType<typeof enrichRa21>;
    idx: number;
    showRev?: boolean;
  }) {
    return (
      <tr
        className="border-t border-border/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
        onClick={() => item.wineCode && router.push(`/portfolio/${encodeURIComponent(item.wineCode)}`)}
      >
        <td className="py-2.5 px-4 text-muted text-xs w-8 tabular-nums">{idx + 1}</td>
        <td className="py-2.5 px-4 w-20">
          {item.props ? (
            <WineTypeBadge type={item.props.wineType} />
          ) : (
            <span className="text-[11px] bg-black/5 dark:bg-white/10 text-muted rounded px-2 py-0.5 font-semibold">—</span>
          )}
        </td>
        <td className="py-2.5 px-4 max-w-[260px] truncate">
          <div className="text-text font-medium text-[13px] truncate">
            {item.props?.wineName || item.wineName || item.wineCode}
          </div>
          {item.props && <div className="text-muted text-[11px] mt-0.5 truncate">{item.props.producer}{item.props.country ? ` · ${item.props.country}` : ''}</div>}
        </td>
        <td className="py-2.5 px-2">
          <div className="flex gap-1 flex-wrap justify-end">
            {item.tps.map((tp, ti) => <TalkingPointChip key={ti} tp={tp} />)}
          </div>
        </td>
        {showRev && (
          <td className="py-2.5 px-4 text-right font-semibold text-text tabular-nums w-[90px] whitespace-nowrap">
            {item.revenue > 0 ? fmt$(item.revenue) : '—'}
          </td>
        )}
        <td className="py-2.5 px-4 text-right text-muted text-xs w-[60px] tabular-nums whitespace-nowrap">
          {item.price > 0 ? `$${item.price.toFixed(2)}` : '—'}
        </td>
      </tr>
    );
  }

  function Section({ title, subtitle, icon, iconColor, count, children }: {
    title: string; subtitle?: string; icon: React.ReactNode; iconColor: string; count: number; children: React.ReactNode;
  }) {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4 shadow-sm">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-start gap-2.5">
          <span className="mt-[3px]" style={{ color: iconColor }}>{icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="m-0 text-[15px] font-bold text-text truncate">{title}</h3>
            {subtitle && <p className="m-0 mt-0.5 text-xs text-muted truncate">{subtitle}</p>}
          </div>
          <span className="text-xs text-muted mt-[3px]">({count})</span>
        </div>
        <div className="overflow-x-auto hide-scrollbar">
          {children}
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <div className="max-w-[1000px] mx-auto w-full pb-8">
        <h1 className="text-2xl font-bold text-text m-0 mb-1">Focus List</h1>
        <p className="text-[13px] text-muted m-0 mb-5">
          Top performing wines and accounts to prioritize.
        </p>

        {/* Banner if RA23 missing */}
        {!useStore((s) => s.ra23Data) && (
          <div className="bg-amber-100/50 dark:bg-[#1C1610] border border-amber-500/30 dark:border-[#3D2B00] rounded-xl p-3 sm:p-4 mb-5 flex gap-3 items-start">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-[#E3B341]" />
            <div>
              <span className="text-[13px] font-semibold text-amber-800 dark:text-[#E3B341] block">Upload RA23 to unlock full Focus detail</span>
              <p className="m-0 mt-0.5 text-xs text-amber-700/80 dark:text-muted">
                Account × Wine detail required for per-account drilling.{' '}
                <Link href="/integrations" className="text-primary font-semibold hover:underline">Sync via Integrations →</Link>
              </p>
            </div>
          </div>
        )}

        {noData ? (
          <div className="bg-surface rounded-xl border border-border p-8 sm:p-10 text-center text-muted text-sm">
            Upload RA21 (Top Wines) or RB1 inventory on the{' '}
            <a href="/upload" className="text-primary font-semibold hover:underline">Upload page</a> to populate Focus List.
          </div>
        ) : (
          <>
            {hasRa21 ? (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                  {[
                    { label: 'Ranked SKUs', value: ra21Data!.rows.length.toLocaleString() },
                    { label: 'Top Wine Revenue', value: ra21Data!.rows[0]?.revenue ? fmt$(ra21Data!.rows[0].revenue) : '—' },
                    { label: 'New Placements (90d)', value: (ra30Data?.recentPlacements.length ?? 0).toLocaleString() },
                    { label: 'Declining SKUs', value: watchList.length.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-4 sm:p-5 shadow-sm">
                      <div className="text-[11px] text-muted font-semibold uppercase tracking-widest mb-1.5">{label}</div>
                      <div className="text-[22px] font-bold text-text tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Push These */}
                {pushThese.length > 0 && (
                  <Section title="Push These — Top Performers" subtitle="Ranked by revenue from RA21" icon={<TrendingUp size={16} />} iconColor="#3FB950" count={pushThese.length}>
                    <table className="w-full border-collapse text-[13px] min-w-[700px]">
                      <thead className="bg-black/5 dark:bg-white/5 border-b border-border/50">
                        <tr>
                          <th className="w-8 py-2 px-4 text-left text-muted font-medium">#</th>
                          <th className="w-20 py-2 px-4 text-left text-muted font-medium">Type</th>
                          <th className="py-2 px-4 text-left text-muted font-medium">Wine</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Talking Points</th>
                          <th className="py-2 px-4 text-right text-muted font-medium">Revenue</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Price/btl</th>
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
                    <table className="w-full border-collapse text-[13px] min-w-[700px]">
                      <thead className="bg-black/5 dark:bg-white/5 border-b border-border/50">
                        <tr>
                          <th className="w-8 py-2 px-4 text-left text-muted font-medium">#</th>
                          <th className="w-20 py-2 px-4 text-left text-muted font-medium">Type</th>
                          <th className="py-2 px-4 text-left text-muted font-medium">Wine</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Talking Points</th>
                          <th className="py-2 px-4 text-right text-muted font-medium">Revenue</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Price/btl</th>
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
                    <table className="w-full border-collapse text-[13px] min-w-[600px]">
                      <thead className="bg-black/5 dark:bg-white/5 border-b border-border/50">
                        <tr>
                          <th className="py-2 px-4 text-left text-muted font-medium">Wine</th>
                          <th className="py-2 px-4 text-left text-muted font-medium">Account</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Days Ago</th>
                          <th className="py-2 px-4 text-right text-muted font-medium">Importer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPlacements.map((p, i) => {
                          const key = normCode(p.wineCode);
                          const props = winePropsMap.get(key);
                          return (
                            <tr key={i} className="border-t border-border/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-4 max-w-[240px] truncate">
                                <div className="text-text font-medium text-[13px] truncate">
                                  {props?.wineName || p.wineName || p.wineCode}
                                </div>
                                {props?.producer && <div className="text-muted text-[11px] mt-0.5 truncate">{props.producer}</div>}
                              </td>
                              <td className="py-2.5 px-4 text-muted truncate max-w-[200px]">{p.account}</td>
                              <td className="py-2.5 px-4 text-right text-blue-500 font-semibold whitespace-nowrap">
                                {p.daysAgo !== null ? `${p.daysAgo}d ago` : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right text-muted text-xs truncate max-w-[150px]">{p.importer || '—'}</td>
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
                    <table className="w-full border-collapse text-[13px] min-w-[600px]">
                      <thead className="bg-black/5 dark:bg-white/5 border-b border-border/50">
                        <tr>
                          <th className="py-2 px-4 text-left text-muted font-medium">Wine</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Current Rev</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Prior Rev</th>
                          <th className="py-2 px-4 text-right text-muted font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {watchList.map((w, i) => {
                          const props = winePropsMap.get(normCode(w.wineCode));
                          const changePct = isFinite(w.changePct) ? w.changePct : 0;
                          return (
                            <tr
                              key={i}
                              className="border-t border-border/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                              onClick={() => w.wineCode && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                            >
                              <td className="py-2.5 px-4 max-w-[260px] truncate">
                                <div className="text-text font-medium text-[13px] truncate">
                                  {props?.wineName || w.wineName || w.wineCode}
                                </div>
                                {props?.producer && <div className="text-muted text-[11px] mt-0.5 truncate">{props.producer}</div>}
                              </td>
                              <td className="py-2.5 px-4 text-right text-text font-medium tabular-nums whitespace-nowrap">{fmt$(w.currentPeriodRevenue)}</td>
                              <td className="py-2.5 px-4 text-right text-muted tabular-nums whitespace-nowrap">{fmt$(w.priorPeriodRevenue)}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-red-500 tabular-nums whitespace-nowrap">
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                  {[
                    { label: 'Active SKUs', value: rb1Wines.length.toLocaleString() },
                    { label: 'Btl Sold (30d)', value: rb1Wines.reduce((s, w) => s + w.qtySold, 0).toLocaleString() },
                    { label: 'Active Accounts', value: repAccounts.size > 0 ? repAccounts.size.toLocaleString() : '—' },
                    { label: 'In Stock', value: rb1Wines.filter(w => w.bottlesOnHand > 0).length.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-4 sm:p-5 shadow-sm">
                      <div className="text-[11px] text-muted font-semibold uppercase tracking-widest mb-1.5">{label}</div>
                      <div className="text-[22px] font-bold text-text tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4 shadow-sm">
                  <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                    <span className="text-green-500"><TrendingUp size={16} /></span>
                    <h3 className="m-0 text-[15px] font-bold text-text">Top Movers — Last 30 Days</h3>
                    <span className="text-xs text-muted">({rb1Wines.length})</span>
                    <span className="ml-auto text-[11px] text-muted/80">from RB1 · <Link href="/integrations" className="text-muted hover:text-text hover:underline transition-colors">upload RA21 for full ranking →</Link></span>
                  </div>
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full border-collapse text-[13px] min-w-[600px]">
                      <thead className="bg-black/5 dark:bg-white/5 border-b border-border/50">
                        <tr>
                          <th className="w-8 py-2 px-4 text-left text-muted font-medium">#</th>
                          <th className="w-20 py-2 px-4 text-left text-muted font-medium">Type</th>
                          <th className="py-2 px-4 text-left text-muted font-medium">Wine</th>
                          <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Sold (30d)</th>
                          <th className="py-2 px-4 text-right text-muted font-medium">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rb1Wines.map((w, i) => {
                          const key = normCode(w.wineCode);
                          const props = winePropsMap.get(key);
                          return (
                            <tr
                              key={w.wineCode}
                              className={`border-t border-border/50 transition-colors ${props ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 group' : ''}`}
                              onClick={() => props && router.push(`/portfolio/${encodeURIComponent(w.wineCode)}`)}
                            >
                              <td className="py-2.5 px-4 text-muted text-xs">{i + 1}</td>
                              <td className="py-2.5 px-4">
                                {props ? <WineTypeBadge type={props.wineType} /> : <span className="text-[11px] bg-black/5 dark:bg-white/10 text-muted rounded px-2 py-0.5">—</span>}
                              </td>
                              <td className="py-2.5 px-4 max-w-[300px] truncate">
                                <div className="text-text font-medium text-[13px] truncate">{props?.wineName || w.wineName}</div>
                                {props && <div className="text-muted text-[11px] mt-0.5 truncate">{props.producer}{props.country ? ` · ${props.country}` : ''}</div>}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold text-green-500 tabular-nums whitespace-nowrap">{w.qtySold} btl</td>
                              <td className={`py-2.5 px-4 text-right tabular-nums whitespace-nowrap ${w.bottlesOnHand > 0 ? 'text-text' : 'text-muted'}`}>
                                {w.bottlesOnHand > 0 ? `${w.bottlesOnHand} btl` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {/* Reactivate section */}
            {reactivateList.length > 0 && (
              <Section title="Reactivate — Dormant Accounts" icon={<RefreshCw size={16} />} iconColor="#F85149" count={reactivateList.length}>
                <table className="w-full border-collapse text-[13px] min-w-[500px]">
                  <thead className="bg-black/5 dark:bg-white/5 border-b border-border/50">
                    <tr>
                      <th className="py-2 px-4 text-left text-muted font-medium">Account</th>
                      <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Last Active</th>
                      <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Peak 3-Mo</th>
                      <th className="py-2 px-4 text-right text-muted font-medium whitespace-nowrap">Lifetime Rev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reactivateList.map((acct) => (
                      <tr
                        key={acct.account}
                        className="border-t border-border/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                        onClick={() => router.push(`/accounts/${encodeURIComponent(acct.account)}`)}
                      >
                        <td className="py-2.5 px-4 text-text font-medium">{acct.account}</td>
                        <td className="py-2.5 px-4 text-right text-muted whitespace-nowrap">{fmtMonth(acct.lastActive)}</td>
                        <td className="py-2.5 px-4 text-right text-muted tabular-nums whitespace-nowrap">{acct.threeMo > 0 ? fmt$(acct.threeMo) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-text tabular-nums whitespace-nowrap">{fmt$(acct.totalRevenue)}</td>
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
