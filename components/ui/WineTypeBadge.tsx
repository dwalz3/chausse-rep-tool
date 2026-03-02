import { getWineTypeStyle } from '@/lib/constants/wineColors';

export default function WineTypeBadge({ type }: { type: string }) {
  const { bg, text } = getWineTypeStyle(type);
  return (
    <span
      className="inline-block whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      {type}
    </span>
  );
}
