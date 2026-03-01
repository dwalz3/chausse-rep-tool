'use client';

import { PortfolioRow } from '@/types';

export interface SavedView {
  id: string;
  label: string;
  predicate: (w: PortfolioRow, btgThreshold: number) => boolean;
}

const NEW_WORLD = new Set(['USA', 'United States', 'Argentina', 'Chile', 'Australia', 'New Zealand', 'South Africa', 'Uruguay', 'Canada']);

function isNewWorld(country: string): boolean {
  return NEW_WORLD.has(country);
}

export const SAVED_VIEWS: SavedView[] = [
  { id: 'all',        label: 'All Wines',           predicate: () => true },
  { id: 'red',        label: 'Red',                 predicate: (w) => w.wineType === 'Red' },
  { id: 'white',      label: 'White',               predicate: (w) => w.wineType === 'White' },
  { id: 'sparkling',  label: 'Sparkling',           predicate: (w) => w.wineType === 'Sparkling' },
  { id: 'champagne',  label: 'Champagne',           predicate: (w) => w.wineType === 'Sparkling' && w.country === 'France' && (w.region.toLowerCase().includes('champagne') || w.producer.toLowerCase().includes('champagne')) },
  { id: 'rose',       label: 'Rosé',                predicate: (w) => w.wineType === 'Rosé' },
  { id: 'orange',     label: 'Orange',              predicate: (w) => w.wineType === 'Orange' },
  { id: 'vermouth',   label: 'Vermouth & Other',    predicate: (w) => w.wineType === 'Vermouth' || w.wineType === 'Tea/NA' },
  { id: 'btg',        label: 'BTG-Eligible',        predicate: (w, t) => w.bottlePrice > 0 && w.bottlePrice <= t },
  { id: 'direct',     label: 'Direct Import',       predicate: (w) => w.isDirect },
  { id: 'france',     label: 'France',              predicate: (w) => w.country === 'France' },
  { id: 'burgundy',   label: 'Burgundy',            predicate: (w) => w.country === 'France' && (w.region.toLowerCase().includes('burgundy') || w.region.toLowerCase().includes('bourgogne')) },
  { id: 'italy',      label: 'Italy',               predicate: (w) => w.country === 'Italy' },
  { id: 'spain-pt',   label: 'Spain & Portugal',    predicate: (w) => w.country === 'Spain' || w.country === 'Portugal' },
  { id: 'new-world',  label: 'New World',           predicate: (w) => isNewWorld(w.country) },
  { id: 'natural',    label: 'Natural/Biodynamic',  predicate: (w) => w.isNatural || w.isBiodynamic },
  { id: 'under20',    label: 'Under $20',           predicate: (w) => w.bottlePrice > 0 && w.bottlePrice < 20 },
  { id: '20to40',     label: '$20–$40',             predicate: (w) => w.bottlePrice >= 20 && w.bottlePrice <= 40 },
  { id: 'in-stock',   label: 'In Stock Now',        predicate: (w) => w.stockCases > 0 },
];

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  counts: Record<string, number>;
  hideHeader?: boolean;
}

export default function SavedViewChips({ activeId, onSelect, counts, hideHeader }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
      {!hideHeader && (
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Saved Views
        </p>
      )}
      {SAVED_VIEWS.map((view) => {
        const isActive = view.id === activeId;
        return (
          <button
            key={view.id}
            onClick={() => onSelect(view.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '7px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: isActive ? '#3FB950' : 'transparent',
              color: isActive ? '#FFFFFF' : '#E6EDF3',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span>{view.label}</span>
            {counts[view.id] != null && (
              <span
                style={{
                  fontSize: 11,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#21262D',
                  color: isActive ? '#FFFFFF' : '#7D8590',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontWeight: 600,
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {counts[view.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
