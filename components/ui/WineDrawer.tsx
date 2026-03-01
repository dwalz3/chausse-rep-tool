'use client';

import { PortfolioRow } from '@/types';
import WineTypeBadge from '@/components/portfolio/WineTypeBadge';
import { X } from 'lucide-react';

interface Props {
  wine: PortfolioRow | null;
  onClose: () => void;
}

function fmt$(n: number) {
  return n > 0 ? `$${n.toFixed(2)}` : '—';
}

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: '#1C2128', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, color: '#7D8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#E6EDF3', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function WineDrawer({ wine, onClose }: Props) {
  if (!wine) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 40 }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          backgroundColor: '#161B22',
          borderLeft: '1px solid #30363D',
          zIndex: 50,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <WineTypeBadge type={wine.wineType} />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#7D8590', cursor: 'pointer', padding: 4, lineHeight: 0 }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wine identity */}
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#E6EDF3', lineHeight: 1.3 }}>
            {wine.wineName || wine.name}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#7D8590' }}>
            {wine.producer}
            {wine.vintage ? ` · ${wine.vintage}` : ''}
          </p>
        </div>

        {/* Farming / attributes */}
        {(wine.isNatural || wine.isBiodynamic || wine.isDirect) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {wine.isNatural && (
              <span style={{ fontSize: 12, backgroundColor: '#0D2918', color: '#3FB950', borderRadius: 4, padding: '3px 10px', fontWeight: 600 }}>
                Natural
              </span>
            )}
            {wine.isBiodynamic && (
              <span style={{ fontSize: 12, backgroundColor: '#003730', color: '#22D3A5', borderRadius: 4, padding: '3px 10px', fontWeight: 600 }}>
                Biodynamic
              </span>
            )}
            {wine.isDirect && (
              <span style={{ fontSize: 12, backgroundColor: '#2A2500', color: '#E3B341', borderRadius: 4, padding: '3px 10px', fontWeight: 600 }}>
                Direct Import
              </span>
            )}
          </div>
        )}

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DetailCell label="Country" value={wine.country || '—'} />
          <DetailCell label="Region" value={wine.region || '—'} />
          <DetailCell label="Price / Bottle" value={fmt$(wine.bottlePrice)} />
          <DetailCell label="FOB Price" value={fmt$(wine.fobPrice)} />
          <DetailCell label="Case Size" value={wine.caseSize || '—'} />
          <DetailCell label="Bottle Size" value={wine.bottleSize || '—'} />
          <DetailCell label="Allocated Cases" value={wine.allocatedCases > 0 ? `${wine.allocatedCases}` : '—'} />
          <DetailCell label="Open PO Cases" value={wine.openPOCases > 0 ? `${wine.openPOCases}` : '—'} />
          <DetailCell label="Expected Arrival" value={fmtDate(wine.expectedArrival)} />
          <DetailCell label="Accounts Buying" value={wine.accountCount > 0 ? `${wine.accountCount}` : '—'} />
        </div>

        {/* Code + portfolio link */}
        <div style={{ borderTop: '1px solid #21262D', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#484F58', fontFamily: 'monospace' }}>{wine.wineCode}</span>
          <a
            href={`/portfolio/${encodeURIComponent(wine.wineCode)}`}
            style={{ fontSize: 12, color: '#3FB950', textDecoration: 'none', fontWeight: 600 }}
          >
            Full Detail →
          </a>
        </div>
      </div>
    </>
  );
}
