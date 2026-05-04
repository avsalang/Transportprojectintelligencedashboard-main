const FLOW_TYPE_ORDER = [
  'ODA Grants',
  'ODA Loans',
  'Other Official Flows',
  'Export Credits',
  'Equity Investment',
  'Private Development Finance',
  'Other Flow Types',
];

const FLOW_TYPE_COLORS: Record<string, string> = {
  'ODA Grants': '#0EA5E9',
  'ODA Loans': '#2563EB',
  'Other Official Flows': '#F59E0B',
  'Export Credits': '#EF4444',
  'Equity Investment': '#10B981',
  'Private Development Finance': '#8B5CF6',
  'Other Flow Types': '#64748B',
};

export function normalizeFlowType(flow: string | undefined): string {
  const text = (flow || '').trim();
  const lower = text.toLowerCase();
  if (!text) return 'Other Flow Types';
  if (lower.includes('grant')) return 'ODA Grants';
  if (lower.includes('loan')) return 'ODA Loans';
  if (lower.includes('other official')) return 'Other Official Flows';
  if (lower.includes('export')) return 'Export Credits';
  if (lower.includes('equity')) return 'Equity Investment';
  if (lower.includes('private')) return 'Private Development Finance';
  if (lower.includes('official')) return 'Other Official Flows';
  return text.length > 32 ? 'Other Flow Types' : text;
}

export function getFlowTypeColor(flow: string | undefined): string {
  return FLOW_TYPE_COLORS[normalizeFlowType(flow)] ?? FLOW_TYPE_COLORS['Other Flow Types'];
}

export function getFlowLegendItems(flows: Array<string | undefined>) {
  const labels = new Set(flows.map(normalizeFlowType).filter(Boolean));
  return [...labels]
    .sort((a, b) => {
      const aIndex = FLOW_TYPE_ORDER.indexOf(a);
      const bIndex = FLOW_TYPE_ORDER.indexOf(b);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      return a.localeCompare(b);
    })
    .map((label) => ({ label, color: FLOW_TYPE_COLORS[label] ?? FLOW_TYPE_COLORS['Other Flow Types'] }));
}
