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
  { id: 'all', label: 'All Wines', predicate: () => true },
  { id: 'red', label: 'Red', predicate: (w) => w.wineType === 'Red' },
  { id: 'white', label: 'White', predicate: (w) => w.wineType === 'White' },
  { id: 'sparkling', label: 'Sparkling', predicate: (w) => w.wineType === 'Sparkling' },
  { id: 'rose', label: 'Rosé', predicate: (w) => w.wineType === 'Rosé' },
  { id: 'orange', label: 'Orange', predicate: (w) => w.wineType === 'Orange' },
  { id: 'vermouth', label: 'Vermouth & Other', predicate: (w) => w.wineType === 'Vermouth' || w.wineType === 'Tea/NA' },
  { id: 'btg', label: 'BTG-Eligible', predicate: (w, t) => w.bottlePrice > 0 && w.bottlePrice <= t },
  { id: 'direct', label: 'Direct Import', predicate: (w) => w.isDirect },
  { id: 'france', label: 'France', predicate: (w) => w.country === 'France' },
  { id: 'italy', label: 'Italy', predicate: (w) => w.country === 'Italy' },
  { id: 'spain-pt', label: 'Spain & Portugal', predicate: (w) => w.country === 'Spain' || w.country === 'Portugal' },
  { id: 'new-world', label: 'New World', predicate: (w) => isNewWorld(w.country) },
  { id: 'natural', label: 'Natural/Biodynamic', predicate: (w) => w.isNatural || w.isBiodynamic },
  { id: 'under20', label: 'Under $20', predicate: (w) => w.bottlePrice > 0 && w.bottlePrice < 20 },
  { id: '20to40', label: '$20–$40', predicate: (w) => w.bottlePrice >= 20 && w.bottlePrice <= 40 },
  { id: 'in-stock', label: 'In Stock Now', predicate: (w) => w.stockCases > 0 },
];

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  counts: Record<string, number>;
}

export default function SavedViewChips({ activeId, onSelect, counts }: Props) {
  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <p className="m-0 mb-2 text-[11px] font-semibold text-muted uppercase tracking-widest">
        Saved Views
      </p>
      {SAVED_VIEWS.map((view) => {
        const isActive = view.id === activeId;
        return (
          <button
            key={view.id}
            onClick={() => onSelect(view.id)}
            className={`flex justify-between items-center py-[7px] px-3 rounded-lg border-none text-[13px] text-left w-full cursor-pointer transition-colors ${isActive
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'bg-transparent text-text font-normal hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            <span className="truncate pr-2">{view.label}</span>
            {counts[view.id] != null && (
              <span
                className={`text-[11px] rounded-full px-[7px] py-[1px] font-semibold min-w-[24px] text-center shrink-0 ${isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-black/5 dark:bg-white/10 text-muted'
                  }`}
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
