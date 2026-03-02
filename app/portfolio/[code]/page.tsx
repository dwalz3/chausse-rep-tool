'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
import { useStore } from '@/store';
import { buildPortfolioRows } from '@/lib/buildPortfolioRows';
import { ArrowLeft, Calendar, Package } from 'lucide-react';

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

function fmt$(n: number) {
  return n > 0 ? '$' + n.toFixed(2) : '—';
}

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="w-32 sm:w-[140px] text-[13px] text-muted shrink-0">{label}</span>
      <span className="text-[13px] text-text font-medium">{String(value)}</span>
    </div>
  );
}

export default function WineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = decodeURIComponent(String(params.code ?? ''));

  const winePropertiesData = useStore((s) => s.winePropertiesData);
  const pricingData = useStore((s) => s.pricingData);
  const allocationsData = useStore((s) => s.allocationsData);
  const openPOData = useStore((s) => s.openPOData);

  const wine = useMemo(() => {
    if (!winePropertiesData) return null;
    const rows = buildPortfolioRows(winePropertiesData, pricingData, allocationsData, openPOData);
    return rows.find((r) => normCode(r.wineCode) === normCode(code)) ?? null;
  }, [winePropertiesData, pricingData, allocationsData, openPOData, code]);

  // Allocations for this wine
  const wineAllocs = useMemo(() => {
    if (!allocationsData) return [];
    return allocationsData.filter((a) => normCode(a.wineCode) === normCode(code));
  }, [allocationsData, code]);

  if (!winePropertiesData) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', color: '#a8a29e', fontSize: 14, padding: 48 }}>
          Upload Wine Properties data first.
        </div>
      </Shell>
    );
  }

  if (!wine) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', color: '#a8a29e', fontSize: 14, padding: 48 }}>
          Wine not found: <strong>{code}</strong>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-[700px] mx-auto w-full pb-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-muted text-[13px] mb-5 p-0 hover:text-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Portfolio
        </button>

        {/* Header */}
        <div className="bg-surface rounded-xl border border-border p-6 sm:p-7 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <WineTypeBadge type={wine.wineType} />
              <h1 className="text-2xl font-bold text-text m-0 mt-2 mb-1">
                {wine.wineName || wine.name}
              </h1>
              <p className="m-0 text-[15px] text-muted">{wine.producer}</p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="m-0 text-[26px] font-bold text-primary">{fmt$(wine.bottlePrice)}</p>
              <p className="m-0 mt-0.5 text-xs text-muted">per bottle</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-2">
            <InfoRow label="Wine Code" value={wine.wineCode} />
            <InfoRow label="Vintage" value={wine.vintage} />
            <InfoRow label="Country" value={wine.country} />
            <InfoRow label="Region" value={wine.region} />
            <InfoRow label="Importer" value={wine.importer} />
            <InfoRow label="Case Size" value={wine.caseSize ? `${wine.caseSize} bottles` : undefined} />
            <InfoRow label="Bottle Size" value={wine.bottleSize} />
            <InfoRow label="FOB Price" value={wine.fobPrice > 0 ? fmt$(wine.fobPrice) : undefined} />
          </div>

          {(wine.isNatural || wine.isBiodynamic || wine.isDirect) && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {wine.isNatural && (
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded px-2 py-0.5 text-[11px] font-semibold">Natural</span>
              )}
              {wine.isBiodynamic && (
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded px-2 py-0.5 text-[11px] font-semibold">Biodynamic</span>
              )}
              {wine.isDirect && (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded px-2 py-0.5 text-[11px] font-semibold">Direct Import</span>
              )}
            </div>
          )}
        </div>

        {/* Open PO */}
        {wine.openPOCases > 0 && (
          <div className="flex items-center gap-3 bg-surface rounded-xl border border-border p-4 sm:p-5 mb-4">
            <Package size={18} className="text-primary shrink-0" />
            <div>
              <p className="m-0 text-sm font-semibold text-text">
                {wine.openPOCases} cases on order
              </p>
              {wine.expectedArrival && (
                <p className="m-0 mt-0.5 text-[13px] text-muted">
                  Expected: {fmtDate(wine.expectedArrival)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Allocations */}
        {wineAllocs.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 mb-4 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-muted" />
              <h3 className="m-0 text-sm font-bold text-text">Allocations</h3>
            </div>
            <table className="w-full border-collapse text-[13px] min-w-[300px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 px-2 text-muted font-medium whitespace-nowrap">Account</th>
                  <th className="text-right py-1.5 px-2 text-muted font-medium whitespace-nowrap">Cases</th>
                  <th className="text-right py-1.5 px-2 text-muted font-medium whitespace-nowrap">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {wineAllocs.map((a, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="py-2 px-2 text-text">{a.account || '—'}</td>
                    <td className="py-2 px-2 text-right font-semibold text-primary">{a.allocatedCases}</td>
                    <td className="py-2 px-2 text-right text-muted whitespace-nowrap">{a.deadline || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
