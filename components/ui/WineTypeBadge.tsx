import { getWineTypeStyle } from '@/lib/constants/wineColors';

export default function WineTypeBadge({ type }: { type: string }) {
  const { bg, text } = getWineTypeStyle(type);
  return (
    <span
      style={{
        backgroundColor: bg,
        color: text,
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
