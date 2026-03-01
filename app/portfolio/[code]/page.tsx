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
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #21262D' }}>
      <span style={{ width: 140, fontSize: 13, color: '#7D8590', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#E6EDF3', fontWeight: 500 }}>{String(value)}</span>
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
        <div style={{ textAlign: 'center', color: '#7D8590', fontSize: 14, padding: 48 }}>
          Upload Wine Properties data first.
        </div>
      </Shell>
    );
  }

  if (!wine) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', color: '#7D8590', fontSize: 14, padding: 48 }}>
          Wine not found: <strong>{code}</strong>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 700 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#7D8590',
            fontSize: 13,
            marginBottom: 20,
            padding: 0,
          }}
        >
          <ArrowLeft size={14} />
          Back to Portfolio
        </button>

        {/* Header */}
        <div
          style={{
            backgroundColor: '#161B22',
            borderRadius: 12,
            border: '1px solid #30363D',
            padding: '24px 28px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div>
              <WineTypeBadge type={wine.wineType} />
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '8px 0 4px' }}>
                {wine.wineName || wine.name}
              </h1>
              <p style={{ margin: 0, fontSize: 15, color: '#7D8590' }}>{wine.producer}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#3FB950' }}>{fmt$(wine.bottlePrice)}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7D8590' }}>per bottle</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #21262D', paddingTop: 16 }}>
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
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {wine.isNatural && (
                <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px' }}>Natural</span>
              )}
              {wine.isBiodynamic && (
                <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px' }}>Biodynamic</span>
              )}
              {wine.isDirect && (
                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px' }}>Direct Import</span>
              )}
            </div>
          )}
        </div>

        {/* Open PO */}
        {wine.openPOCases > 0 && (
          <div
            style={{
              backgroundColor: '#161B22',
              borderRadius: 10,
              border: '1px solid #30363D',
              padding: '16px 20px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Package size={18} color="#3FB950" />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>
                {wine.openPOCases} cases on order
              </p>
              {wine.expectedArrival && (
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7D8590' }}>
                  Expected: {fmtDate(wine.expectedArrival)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Allocations */}
        {wineAllocs.length > 0 && (
          <div
            style={{
              backgroundColor: '#161B22',
              borderRadius: 10,
              border: '1px solid #30363D',
              padding: '16px 20px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calendar size={16} color="#7D8590" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#E6EDF3' }}>Allocations</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363D' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: '#7D8590', fontWeight: 500 }}>Account</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#7D8590', fontWeight: 500 }}>Cases</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#7D8590', fontWeight: 500 }}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {wineAllocs.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #21262D' }}>
                    <td style={{ padding: '8px 0', color: '#E6EDF3' }}>{a.account || '—'}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#3FB950' }}>{a.allocatedCases}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#7D8590' }}>{a.deadline || '—'}</td>
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
