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
    return <p style={{ color: '#7D8590', fontSize: 13, margin: 0 }}>No open purchase orders</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #30363D' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#7D8590', fontWeight: 500 }}>Cases</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#7D8590', fontWeight: 500 }}>ETA</th>
        </tr>
      </thead>
      <tbody>
        {openPOData.slice(0, 8).map((po, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #21262D' }}>
            <td style={{ padding: '7px 8px', color: '#E6EDF3' }}>
              {nameMap.get(normCode(po.wineCode)) ?? po.wineCode}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#3FB950' }}>
              {po.openCases}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#7D8590' }}>
              {fmtDate(po.expectedArrival)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Allocations({ allocationsData, nameMap }: { allocationsData: AllocationRow[]; nameMap: Map<string, string> }) {
  if (allocationsData.length === 0) {
    return <p style={{ color: '#7D8590', fontSize: 13, margin: 0 }}>No active allocations</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #30363D' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#7D8590', fontWeight: 500 }}>Wine</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#7D8590', fontWeight: 500 }}>Allocated</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#7D8590', fontWeight: 500 }}>Account</th>
        </tr>
      </thead>
      <tbody>
        {allocationsData.slice(0, 8).map((a, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #21262D' }}>
            <td style={{ padding: '7px 8px', color: '#E6EDF3' }}>
              {nameMap.get(normCode(a.wineCode)) ?? a.wineCode}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#3FB950' }}>
              {a.allocatedCases} cs
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#7D8590', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.account || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function IncomingWinesSection() {
  const openPOData = useStore((s) => s.openPOData) ?? [];
  const allocationsData = useStore((s) => s.allocationsData) ?? [];
  const winePropertiesData = useStore((s) => s.winePropertiesData);

  const nameMap = buildNameMap(winePropertiesData);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Open POs */}
      <div
        style={{
          backgroundColor: '#161B22',
          borderRadius: 10,
          border: '1px solid #30363D',
          padding: '16px 20px',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E6EDF3', margin: '0 0 12px' }}>
          Open Purchase Orders
        </h3>
        <POs openPOData={openPOData} nameMap={nameMap} />
      </div>

      {/* Allocations */}
      <div
        style={{
          backgroundColor: '#161B22',
          borderRadius: 10,
          border: '1px solid #30363D',
          padding: '16px 20px',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E6EDF3', margin: '0 0 12px' }}>
          Allocations
        </h3>
        <Allocations allocationsData={allocationsData} nameMap={nameMap} />
      </div>
    </div>
  );
}
