import { WineType } from '@/types';

const TYPE_COLORS: Record<WineType, { bg: string; text: string }> = {
  Red:        { bg: '#FEE2E2', text: '#991B1B' },
  White:      { bg: '#FEF9C3', text: '#854D0E' },
  Sparkling:  { bg: '#DBEAFE', text: '#1E40AF' },
  Orange:     { bg: '#FFEDD5', text: '#9A3412' },
  Rosé:       { bg: '#FCE7F3', text: '#9D174D' },
  'Tea/NA':   { bg: '#CCFBF1', text: '#134E4A' },
  Vermouth:   { bg: '#EDE9FE', text: '#5B21B6' },
  Other:      { bg: '#F3F4F6', text: '#6B7280' },
};

export default function WineTypeBadge({ type }: { type: WineType }) {
  const colors = TYPE_COLORS[type] ?? TYPE_COLORS['Other'];
  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {type}
    </span>
  );
}
