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
    return <p style={{ color: '#a8a29e', fontSize: 13, margin: 0 }}>No open purchase orders</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #E5E1DC' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>Wine</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>Cases</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>ETA</th>
        </tr>
      </thead>
      <tbody>
        {openPOData.slice(0, 8).map((po, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '7px 8px', color: '#1C1917' }}>
              {nameMap.get(normCode(po.wineCode)) ?? po.wineCode}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#2D5A3D' }}>
              {po.openCases}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#a8a29e' }}>
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
    return <p style={{ color: '#a8a29e', fontSize: 13, margin: 0 }}>No active allocations</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #E5E1DC' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>Wine</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>Allocated</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: '#a8a29e', fontWeight: 500 }}>Account</th>
        </tr>
      </thead>
      <tbody>
        {allocationsData.slice(0, 8).map((a, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
            <td style={{ padding: '7px 8px', color: '#1C1917' }}>
              {nameMap.get(normCode(a.wineCode)) ?? a.wineCode}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#2D5A3D' }}>
              {a.allocatedCases} cs
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#a8a29e', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          border: '1px solid #E5E1DC',
          padding: '16px 20px',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
          Open Purchase Orders
        </h3>
        <POs openPOData={openPOData} nameMap={nameMap} />
      </div>

      {/* Allocations */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          border: '1px solid #E5E1DC',
          padding: '16px 20px',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
          Allocations
        </h3>
        <Allocations allocationsData={allocationsData} nameMap={nameMap} />
      </div>
    </div>
  );
}
