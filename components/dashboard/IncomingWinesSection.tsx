'use client';

import { useStore } from '@/store';
import { OpenPORow, AllocationRow, WinePropertyRow } from '@/types';

function normCode(s: string) {
  return s.toString().trim().toUpperCase();
}

function buildNameMap(wineProps: WinePropertyRow[] | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!wineProps) return map;
  for (const w of wineProps) {
    map.set(normCode(w.wineCode), w.wineName || w.name);
  }
  return map;
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function POs({ openPOData, nameMap }: { openPOData: OpenPORow[]; nameMap: Map<string, string> }) {
  if (openPOData.length === 0) {
    return <p className="text-muted text-[13px] m-0">No open purchase orders</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-2 py-1.5 text-muted font-medium whitespace-nowrap">Wine</th>
            <th className="text-right px-2 py-1.5 text-muted font-medium whitespace-nowrap">Cases</th>
            <th className="text-right px-2 py-1.5 text-muted font-medium whitespace-nowrap">ETA</th>
          </tr>
        </thead>
        <tbody>
          {openPOData.slice(0, 8).map((po, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
              <td className="px-2 py-2 text-text truncate max-w-[140px] md:max-w-[200px]" title={nameMap.get(normCode(po.wineCode)) ?? po.wineCode}>
                {nameMap.get(normCode(po.wineCode)) ?? po.wineCode}
              </td>
              <td className="px-2 py-2 text-right font-semibold text-primary whitespace-nowrap">
                {po.openCases}
              </td>
              <td className="px-2 py-2 text-right text-muted whitespace-nowrap">
                {fmtDate(po.expectedArrival)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Allocations({ allocationsData, nameMap }: { allocationsData: AllocationRow[]; nameMap: Map<string, string> }) {
  if (allocationsData.length === 0) {
    return <p className="text-muted text-[13px] m-0">No active allocations</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-2 py-1.5 text-muted font-medium whitespace-nowrap">Wine</th>
            <th className="text-right px-2 py-1.5 text-muted font-medium whitespace-nowrap">Allocated</th>
            <th className="text-right px-2 py-1.5 text-muted font-medium whitespace-nowrap">Account</th>
          </tr>
        </thead>
        <tbody>
          {allocationsData.slice(0, 8).map((a, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
              <td className="px-2 py-2 text-text truncate max-w-[120px] md:max-w-[160px]" title={nameMap.get(normCode(a.wineCode)) ?? a.wineCode}>
                {nameMap.get(normCode(a.wineCode)) ?? a.wineCode}
              </td>
              <td className="px-2 py-2 text-right font-semibold text-primary whitespace-nowrap">
                {a.allocatedCases} cs
              </td>
              <td className="px-2 py-2 text-right text-muted truncate max-w-[120px] md:max-w-[160px]" title={a.account || '—'}>
                {a.account || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IncomingWinesSection() {
  const openPOData = useStore((s) => s.openPOData) ?? [];
  const allocationsData = useStore((s) => s.allocationsData) ?? [];
  const winePropertiesData = useStore((s) => s.winePropertiesData);

  const nameMap = buildNameMap(winePropertiesData);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Open POs */}
      <div className="bg-surface rounded-xl border border-border p-4 sm:p-5">
        <h3 className="text-sm font-bold text-text m-0 mb-3 tracking-tight">
          Open Purchase Orders
        </h3>
        <POs openPOData={openPOData} nameMap={nameMap} />
      </div>

      {/* Allocations */}
      <div className="bg-surface rounded-xl border border-border p-4 sm:p-5">
        <h3 className="text-sm font-bold text-text m-0 mb-3 tracking-tight">
          Allocations
        </h3>
        <Allocations allocationsData={allocationsData} nameMap={nameMap} />
      </div>
    </div>
  );
}
