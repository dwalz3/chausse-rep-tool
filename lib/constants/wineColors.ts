import type { WineType } from '@/types';

export interface WineTypeStyle {
  bg: string;
  text: string;
  dot: string; // solid dot color for sparklines and spectrum indicators
}

// Dark-mode wine type palette — rich jewel tones on near-black backgrounds
export const WINE_TYPE_STYLES: Record<WineType, WineTypeStyle> = {
  Red:       { bg: '#3B1212', text: '#F47067', dot: '#F85149' },
  White:     { bg: '#2A2500', text: '#E3B341', dot: '#E3B341' },
  Sparkling: { bg: '#0D2245', text: '#79BAFF', dot: '#58A6FF' },
  Orange:    { bg: '#2D1500', text: '#FFB067', dot: '#FF8C3B' },
  'Rosé':    { bg: '#2D0A1E', text: '#FF93D1', dot: '#E879B1' },
  'Tea/NA':  { bg: '#003730', text: '#22D3A5', dot: '#14B8A6' },
  Vermouth:  { bg: '#1A0D3B', text: '#C084FC', dot: '#A855F7' },
  Other:     { bg: '#21262D', text: '#8B949E', dot: '#9CA3AF' },
};

export function getWineTypeStyle(type: WineType | string): WineTypeStyle {
  return WINE_TYPE_STYLES[type as WineType] ?? WINE_TYPE_STYLES.Other;
}
