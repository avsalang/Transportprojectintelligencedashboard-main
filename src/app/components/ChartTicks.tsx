type WrappedTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string };
  maxChars?: number;
  fill?: string;
  fontSize?: number;
  anchor?: 'start' | 'middle' | 'end';
  lineHeight?: number;
};

export function wrapTickLabel(value: string, maxChars = 16) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const pieces = word.length > maxChars
      ? word.match(new RegExp(`.{1,${Math.max(1, maxChars)}}`, 'g')) ?? [word]
      : [word];

    pieces.forEach((piece) => {
      const next = current ? `${current} ${piece}` : piece;
      if (next.length <= maxChars || !current) {
        current = next;
      } else {
        lines.push(current);
        current = piece;
      }
    });
  });

  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export function truncateTickLabel(value: string, maxChars = 22) {
  if (!value) return '';
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function estimateCategoryAxisWidth(
  labels: Array<string | null | undefined>,
  {
    maxChars = 16,
    minWidth = 150,
    maxWidth = 260,
    charWidth = 6.6,
    padding = 24,
  }: {
    maxChars?: number;
    minWidth?: number;
    maxWidth?: number;
    charWidth?: number;
    padding?: number;
  } = {}
) {
  const longest = labels.reduce((widest, label) => {
    const lines = wrapTickLabel(label ?? '', maxChars);
    const lineLength = Math.max(...lines.map((line) => line.length), 0);
    return Math.max(widest, lineLength);
  }, 0);

  return Math.max(minWidth, Math.min(maxWidth, Math.ceil(longest * charWidth + padding)));
}

export function WrappedCategoryTick({
  x = 0,
  y = 0,
  payload,
  maxChars = 16,
  fill = '#64748B',
  fontSize = 10,
  anchor = 'end',
  lineHeight = 11,
}: WrappedTickProps) {
  const lines = wrapTickLabel(payload?.value ?? '', maxChars);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} textAnchor={anchor} dominantBaseline="middle" fill={fill} fontSize={fontSize}>
        {lines.map((line, index) => (
          <tspan
            key={`${payload?.value}-${index}`}
            x={0}
            dy={index === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function TruncatedCategoryTick({
  x = 0,
  y = 0,
  payload,
  maxChars = 22,
  fill = '#64748B',
  fontSize = 10,
  anchor = 'end',
}: WrappedTickProps) {
  const fullLabel = payload?.value ?? '';
  const label = truncateTickLabel(fullLabel, maxChars);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} textAnchor={anchor} dominantBaseline="middle" fill={fill} fontSize={fontSize}>
        <title>{fullLabel}</title>
        {label}
      </text>
    </g>
  );
}

export function WrappedAxisTick({
  x = 0,
  y = 0,
  payload,
  maxChars = 14,
  fill = '#64748B',
  fontSize = 10,
  anchor = 'end',
  lineHeight = 11,
}: WrappedTickProps) {
  const lines = wrapTickLabel(payload?.value ?? '', maxChars);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} textAnchor={anchor} fill={fill} fontSize={fontSize}>
        {lines.map((line, index) => (
          <tspan key={`${payload?.value}-${index}`} x={0} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
