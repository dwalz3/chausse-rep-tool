import type { WineType } from '@/types';

export interface WineTypeStyle {
  bg: string;
  text: string;
  dot: string; // solid dot color for sparklines and spectrum indicators
}

export const WINE_TYPE_STYLES: Record<WineType, WineTypeStyle> = {
  Red:       { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  White:     { bg: '#FEF9C3', text: '#854D0E', dot: '#CA8A04' },
  Sparkling: { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB' },
  Orange:    { bg: '#FFEDD5', text: '#9A3412', dot: '#EA580C' },
  'Rosé':    { bg: '#FCE7F3', text: '#9D174D', dot: '#DB2777' },
  'Tea/NA':  { bg: '#CCFBF1', text: '#134E4A', dot: '#0D9488' },
  Vermouth:  { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
  Other:     { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};

export function getWineTypeStyle(type: WineType | string): WineTypeStyle {
  return WINE_TYPE_STYLES[type as WineType] ?? WINE_TYPE_STYLES.Other;
}
