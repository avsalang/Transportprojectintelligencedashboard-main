import { MODE_COLORS } from '../data/mockData';

interface ModePillProps {
  mode: string;
}

export function ModePill({ mode }: ModePillProps) {
  const color = MODE_COLORS[mode] ?? '#94A3B8';
  return (
    <span
      className="inline-flex items-center text-[11px] px-2 py-0.5 rounded font-medium"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {mode || 'Unknown'}
    </span>
  );
}
