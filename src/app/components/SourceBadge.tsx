import { FundingSource, MDB_COLORS } from '../data/mockData';

interface SourceBadgeProps {
  source: FundingSource | string;
  size?: 'sm' | 'md';
}

const SHORT: Record<string, string> = {
  'World Bank': 'WB',
  'ADB': 'ADB',
  'AIIB': 'AIIB',
};

export function SourceBadge({ source, size = 'md' }: SourceBadgeProps) {
  const color = MDB_COLORS[source as FundingSource] ?? '#6B7280';
  const label = SHORT[source] ?? source;

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded font-semibold ${sizeClass}`}
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}
