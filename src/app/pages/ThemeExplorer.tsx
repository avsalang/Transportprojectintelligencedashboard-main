import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { BasisDropdown, type BasisMeasure } from '../components/BasisDropdown';
import { KPICard } from '../components/KPICard';
import { wrapTickLabel, WrappedCategoryTick } from '../components/ChartTicks';
import { YearRangeSelector } from '../components/YearRangeSelector';
import { CRSPageIntro } from '../components/CRSPageIntro';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { getFlowLegendItems, getFlowTypeColor, normalizeFlowType } from '../utils/flowTypeColors';
import {
  THEME_RECORDS_URL,
  THEME_SUMMARIES,
  type ThemeId,
  type ThemeRankingRow,
  type ThemeRecord,
  type ThemeRecordsByTheme,
  type ThemeSankeyData,
} from '../data/themeData';

const CURRENCY_AXIS_WIDTH = 76;
const MODE_COLORS: Record<string, string> = {
  Rail: '#10B981',
  Road: '#2563EB',
  Water: '#8B5CF6',
  Aviation: '#F59E0B',
  Other: '#EC4899',
};
const DONOR_COLORS = ['#0F766E', '#0EA5E9', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#65A30D', '#0891B2', '#475569'];
const SUBTAG_COLOR = '#38BDF8';
const RECIPIENT_COLOR = '#10B981';
const THEME_SANKEY_NODE_PADDING = 32;
const GLOBAL_THEME_YEAR_MIN = Math.min(...THEME_SUMMARIES.map((theme) => theme.yearMin ?? 1973));
const GLOBAL_THEME_YEAR_MAX = Math.max(...THEME_SUMMARIES.map((theme) => theme.yearMax ?? 2024));

type ThemeSummary = (typeof THEME_SUMMARIES)[number];
type ThemeFilters = { yearMin: number; yearMax: number; donor: string; recipient: string; subtag: string };
type ThemeFilterState = Record<ThemeId, ThemeFilters>;
type FilterOption = { value: string; label: string; amount: number; count: number };
type ThemeRecordListItem = ThemeRecord & { rowKey: string; themeLabels: string[]; themeColors: string[]; allTags: string[] };
type ThemeRecordSortKey = 'year' | 'record' | 'donor' | 'recipient' | 'mode' | 'flow' | 'themes' | 'subtags' | 'amount';
type SortDirection = 'asc' | 'desc';
type ThemeRecordColumnFilters = Record<ThemeRecordSortKey, string>;
type ThemeRecordDropdownFilterKey = 'year' | 'donor' | 'recipient' | 'mode' | 'flow' | 'themes';

const THEME_IDS = THEME_SUMMARIES.map((theme) => theme.id as ThemeId);
const THEME_RECORD_DROPDOWN_FILTER_KEYS: ThemeRecordDropdownFilterKey[] = ['year', 'donor', 'recipient', 'mode', 'flow', 'themes'];
const THEME_RECORD_COLUMNS: Array<{ key: ThemeRecordSortKey; label: string; align?: 'right' }> = [
  { key: 'year', label: 'Year' },
  { key: 'record', label: 'Record' },
  { key: 'donor', label: 'Donor' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'mode', label: 'Mode' },
  { key: 'flow', label: 'Flow' },
  { key: 'themes', label: 'Themes' },
  { key: 'subtags', label: 'Subtags' },
  { key: 'amount', label: 'Amount', align: 'right' },
];
const EMPTY_THEME_RECORD_COLUMN_FILTERS: ThemeRecordColumnFilters = {
  year: '',
  record: '',
  donor: '',
  recipient: '',
  mode: '',
  flow: '',
  themes: '',
  subtags: '',
  amount: '',
};

function themeSectionId(themeId: ThemeId) {
  return `theme-section-${themeId}`;
}

function createInitialFilters(): ThemeFilterState {
  return THEME_SUMMARIES.reduce((filters, theme) => {
    const themeId = theme.id as ThemeId;
    filters[themeId] = {
      yearMin: theme.yearMin ?? GLOBAL_THEME_YEAR_MIN,
      yearMax: theme.yearMax ?? GLOBAL_THEME_YEAR_MAX,
      donor: '',
      recipient: '',
      subtag: '',
    };
    return filters;
  }, {} as ThemeFilterState);
}

function createEmptyThemeRecords(): ThemeRecordsByTheme {
  return THEME_IDS.reduce((records, themeId) => {
    records[themeId] = [];
    return records;
  }, {} as ThemeRecordsByTheme);
}

function amountFor(record: ThemeRecord, measure: BasisMeasure) {
  return measure === 'disbursement_defl' ? record.disbursement_defl : record.commitment_defl;
}

function measureCopy(measure: BasisMeasure) {
  return measure === 'disbursement_defl'
    ? { title: 'Disbursements', lower: 'disbursements', singular: 'disbursement' }
    : { title: 'Commitments', lower: 'commitments', singular: 'commitment' };
}

function isThemeRecordDropdownFilter(key: ThemeRecordSortKey): key is ThemeRecordDropdownFilterKey {
  return THEME_RECORD_DROPDOWN_FILTER_KEYS.includes(key as ThemeRecordDropdownFilterKey);
}

function buildFilterOptions(records: ThemeRecord[], valuesForRecord: (record: ThemeRecord) => string[], measure: BasisMeasure): FilterOption[] {
  const buckets = new Map<string, Omit<FilterOption, 'value' | 'label'>>();
  records.forEach((record) => {
    const values = valuesForRecord(record).filter(Boolean);
    values.forEach((value) => {
      const bucket = buckets.get(value) ?? { amount: 0, count: 0 };
      bucket.amount += amountFor(record, measure);
      bucket.count += 1;
      buckets.set(value, bucket);
    });
  });

  return [...buckets.entries()]
    .map(([value, bucket]) => ({ value, label: value, ...bucket }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function filterThemeRecords(records: ThemeRecord[], filters: ThemeFilters) {
  return records.filter((record) => {
    if (record.year == null || record.year < filters.yearMin || record.year > filters.yearMax) return false;
    if (filters.donor && record.donor !== filters.donor) return false;
    if (filters.recipient && record.recipient !== filters.recipient) return false;
    if (filters.subtag && !record.tags.includes(filters.subtag)) return false;
    return true;
  });
}

function usdM(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}B`;
  return `$${value.toFixed(0)}M`;
}

function num(value: number): string {
  return value.toLocaleString();
}

function TooltipBox({ active, payload, label, measureLabel = 'Constant 2024 USD' }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[12px] font-medium text-slate-700">{usdM(Number(row.value))}</p>
      {row.payload?.count != null && <p className="mt-1 text-[11px] text-slate-400">{num(row.payload.count)} records</p>}
      <p className="mt-1 border-t border-slate-100 pt-1 text-[11px] text-slate-400">{measureLabel}</p>
    </div>
  );
}

function emptyRankingRow(): Omit<ThemeRankingRow, 'label'> {
  return { commitment: 0, disbursement: 0, commitment_defl: 0, disbursement_defl: 0, count: 0 };
}

function addRecord(values: Omit<ThemeRankingRow, 'label'>, record: ThemeRecord) {
  values.commitment_defl += record.commitment_defl;
  values.disbursement_defl += record.disbursement_defl;
  values.count += 1;
}

function rankingRows(records: ThemeRecord[], key: 'donor' | 'recipient' | 'mode', measure: BasisMeasure, top = 10): ThemeRankingRow[] {
  const buckets = new Map<string, Omit<ThemeRankingRow, 'label'>>();
  records.forEach((record) => {
    const label = record[key] || 'Unknown';
    const bucket = buckets.get(label) ?? emptyRankingRow();
    addRecord(bucket, record);
    buckets.set(label, bucket);
  });
  return [...buckets.entries()]
    .map(([label, values]) => ({ label, ...values }))
    .sort((a, b) => b[measure] - a[measure] || a.label.localeCompare(b.label))
    .slice(0, top);
}

function summarizeThemeRows(records: ThemeRecord[]) {
  const donors = new Set(records.map((record) => record.donor).filter(Boolean));
  const recipients = new Set(records.map((record) => record.recipient).filter(Boolean));
  return records.reduce(
    (summary, record) => {
      summary.recordCount += 1;
      summary.commitment_defl += record.commitment_defl;
      summary.disbursement_defl += record.disbursement_defl;
      summary.donorCount = donors.size;
      summary.recipientCount = recipients.size;
      return summary;
    },
    { recordCount: 0, commitment_defl: 0, disbursement_defl: 0, donorCount: 0, recipientCount: 0 },
  );
}

function yearSeriesFor(records: ThemeRecord[], yearMin: number, yearMax: number, measure: BasisMeasure) {
  const byYear = new Map<number, { year: number; amount: number; count: number }>();
  for (let year = yearMin; year <= yearMax; year += 1) {
    byYear.set(year, { year, amount: 0, count: 0 });
  }
  records.forEach((record) => {
    if (record.year == null) return;
    const row = byYear.get(record.year);
    if (!row) return;
    row.amount += amountFor(record, measure);
    row.count += 1;
  });
  return [...byYear.values()];
}

function buildTechnologyEnablerSankey(records: ThemeRecord[], measure: BasisMeasure, topDonorCount = 8, topRecipientCount = 10): ThemeSankeyData {
  const MIN_VISIBLE_FLOW_VALUE = 0.05;
  const donorTotals = new Map<string, number>();
  const recipientTotals = new Map<string, number>();
  records.forEach((record) => {
    const amount = amountFor(record, measure);
    if (!record.tags.length || amount <= 0) return;
    const value = amount / record.tags.length;
    donorTotals.set(record.donor || 'Unknown donor', (donorTotals.get(record.donor || 'Unknown donor') ?? 0) + value);
    recipientTotals.set(record.recipient || 'Unknown recipient', (recipientTotals.get(record.recipient || 'Unknown recipient') ?? 0) + value);
  });
  const topDonors = new Set([...donorTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topDonorCount).map(([label]) => label));
  const topRecipients = new Set([...recipientTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topRecipientCount).map(([label]) => label));
  const donorTag = new Map<string, number>();
  const tagRecipient = new Map<string, number>();

  records.forEach((record) => {
    const amount = amountFor(record, measure);
    if (!record.tags.length || amount <= 0) return;
    const donor = topDonors.has(record.donor) ? record.donor : 'Other donors';
    const recipient = topRecipients.has(record.recipient) ? record.recipient : 'Other recipients';
    const flowType = record.flow || 'Other Flow Types';
    const value = amount / record.tags.length;
    record.tags.forEach((tag) => {
      donorTag.set(`${donor}|||${tag}`, (donorTag.get(`${donor}|||${tag}`) ?? 0) + value);
      tagRecipient.set(`${tag}|||${recipient}|||${flowType}`, (tagRecipient.get(`${tag}|||${recipient}|||${flowType}`) ?? 0) + value);
    });
  });

  const totalFor = (role: 'donor' | 'subtag' | 'recipient', name: string) => {
    if (role === 'donor') return [...donorTag.entries()].filter(([key]) => key.startsWith(`${name}|||`)).reduce((sum, [, value]) => sum + value, 0);
    if (role === 'recipient') return [...tagRecipient.entries()].filter(([key]) => key.split('|||')[1] === name).reduce((sum, [, value]) => sum + value, 0);
    const incoming = [...donorTag.entries()].filter(([key]) => key.endsWith(`|||${name}`)).reduce((sum, [, value]) => sum + value, 0);
    const outgoing = [...tagRecipient.entries()].filter(([key]) => key.startsWith(`${name}|||`)).reduce((sum, [, value]) => sum + value, 0);
    return Math.max(incoming, outgoing);
  };

  const visibleDonorTagEntries = [...donorTag.entries()].filter(([, value]) => value >= MIN_VISIBLE_FLOW_VALUE);
  const visibleTagRecipientEntries = [...tagRecipient.entries()].filter(([, value]) => value >= MIN_VISIBLE_FLOW_VALUE);
  const visibleIncomingTags = new Set(visibleDonorTagEntries.map(([key]) => key.split('|||')[1]));
  const visibleOutgoingTags = new Set(visibleTagRecipientEntries.map(([key]) => key.split('|||')[0]));
  const activeTags = new Set([...visibleIncomingTags].filter((tag) => visibleOutgoingTags.has(tag)));
  const activeDonors = new Set(
    visibleDonorTagEntries
      .filter(([key]) => activeTags.has(key.split('|||')[1]))
      .map(([key]) => key.split('|||')[0]),
  );
  const activeRecipients = new Set(
    visibleTagRecipientEntries
      .filter(([key]) => activeTags.has(key.split('|||')[0]))
      .map(([key]) => key.split('|||')[1]),
  );
  const orderNodes = (items: string[], role: 'donor' | 'subtag' | 'recipient', otherLabel?: string) => [
    ...items.filter((item) => item !== otherLabel).sort((a, b) => totalFor(role, b) - totalFor(role, a) || a.localeCompare(b)),
    ...(otherLabel && items.includes(otherLabel) ? [otherLabel] : []),
  ];
  const nodes = [
    ...orderNodes([...activeDonors], 'donor', 'Other donors').map((name) => ({ id: `donor::${name}`, name, role: 'donor' as const, totalValue: totalFor('donor', name) })),
    ...orderNodes([...activeTags], 'subtag').map((name) => ({ id: `subtag::${name}`, name, role: 'subtag' as const, totalValue: totalFor('subtag', name) })),
    ...orderNodes([...activeRecipients], 'recipient', 'Other recipients').map((name) => ({ id: `recipient::${name}`, name, role: 'recipient' as const, totalValue: totalFor('recipient', name) })),
  ];
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const links = [
    ...visibleDonorTagEntries.map(([key, value]) => {
      const [donor, tag] = key.split('|||');
      return { source: nodeIndex.get(`donor::${donor}`) ?? -1, target: nodeIndex.get(`subtag::${tag}`) ?? -1, sourceName: donor, targetName: tag, value };
    }),
    ...visibleTagRecipientEntries.map(([key, value]) => {
      const [tag, recipient, flowType] = key.split('|||');
      return { source: nodeIndex.get(`subtag::${tag}`) ?? -1, target: nodeIndex.get(`recipient::${recipient}`) ?? -1, sourceName: tag, targetName: recipient, flowType, value };
    }),
  ].filter((link) => link.source >= 0 && link.target >= 0);

  return { nodes, links };
}

function getHoverCoordinate(entry: any, type: 'node' | 'link') {
  if (type === 'node') {
    return { x: entry.x + entry.width / 2, y: entry.y + entry.height / 2 };
  }
  return { x: (entry.sourceX + entry.targetX) / 2, y: (entry.sourceY + entry.targetY) / 2 };
}

function buildSankeyHoverState(entry: any, type: 'node' | 'link', measureLabel: string) {
  const coordinate = getHoverCoordinate(entry, type);
  if (type === 'link') {
    if (!entry.sourceName || !entry.targetName || !(entry.value >= 0.05)) return null;
    return {
      x: coordinate.x,
      y: coordinate.y,
      title: `${entry.sourceName} -> ${entry.targetName}`,
      value: usdM(entry.value),
      subtitle: entry.flowType
        ? `${normalizeFlowType(entry.flowType)} · allocated ${measureLabel}, constant 2024 USD`
        : `Allocated ${measureLabel}, constant 2024 USD`,
    };
  }

  const node = entry.payload;
  if (!node?.name || !(node.totalValue >= 0.05)) return null;
  return {
    x: coordinate.x,
    y: coordinate.y,
    title: node.name,
    value: usdM(node.totalValue),
    subtitle: node.role === 'subtag' ? 'Subtheme total' : `${node.role} total`,
  };
}

function SankeyNode(props: any) {
  const { x, y, width, height, payload, ...rest } = props;
  const role = payload?.role;
  const isDonor = role === 'donor';
  const isSubtag = role === 'subtag';
  const labelX = isDonor ? x - 12 : x + width + 12;
  const anchor = isDonor ? 'end' : 'start';
  const labelWidth = isSubtag ? 23 : 21;
  const lines = wrapTickLabel(payload?.name ?? '', labelWidth);

  return (
    <g {...rest}>
      <rect x={x} y={y} width={width} height={height} fill={payload?.color ?? SUBTAG_COLOR} fillOpacity={0.9} rx={3} />
      <text
        x={labelX}
        y={y + height / 2}
        textAnchor={anchor}
        dominantBaseline="middle"
        fontSize={11}
        fill="#334155"
        stroke="#FFFFFF"
        strokeWidth={4}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {lines.map((line: string, lineIndex: number) => (
          <tspan key={`${payload?.id}-${lineIndex}`} x={labelX} dy={lineIndex === 0 ? -((lines.length - 1) * 12) / 2 : 12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function SankeyLink(props: any) {
  const {
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    payload,
    className,
    onClick,
    onMouseEnter,
    onMouseLeave,
  } = props;
  const width = Math.max(linkWidth ?? 0, 1);
  const y0Top = sourceY - width / 2;
  const y0Bottom = sourceY + width / 2;
  const y1Top = targetY - width / 2;
  const y1Bottom = targetY + width / 2;
  const path = [
    `M${sourceX},${y0Top}`,
    `C${sourceControlX},${y0Top} ${targetControlX},${y1Top} ${targetX},${y1Top}`,
    `L${targetX},${y1Bottom}`,
    `C${targetControlX},${y1Bottom} ${sourceControlX},${y0Bottom} ${sourceX},${y0Bottom}`,
    'Z',
  ].join(' ');

  return (
    <path
      className={className}
      d={path}
      fill={payload?.color ?? '#7DD3FC'}
      fillOpacity={0.42}
      stroke="none"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}

function estimateThemeSankeyHeight(nodes: ThemeSankeyData['nodes']) {
  const columnHeight = (role: 'donor' | 'subtag' | 'recipient') => {
    const roleNodes = nodes.filter((node) => node.role === role);
    if (!roleNodes.length) return 0;
    return roleNodes.reduce((sum, node) => {
      const labelWidth = role === 'subtag' ? 23 : 21;
      return sum + Math.max(38, wrapTickLabel(node.name, labelWidth).length * 12 + 12);
    }, 0) + (roleNodes.length - 1) * THEME_SANKEY_NODE_PADDING + 60;
  };
  return Math.max(700, columnHeight('donor'), columnHeight('subtag'), columnHeight('recipient'));
}

function TechnologyEnablerSankey({ data, theme, measure }: { data: ThemeSankeyData; theme: ThemeSummary; measure: BasisMeasure }) {
  const [hoveredItem, setHoveredItem] = useState<{ x: number; y: number; title: string; value: string; subtitle: string } | null>(null);
  const activeMeasure = measureCopy(measure);
  const nodes = data.nodes.map((node, index) => ({
    ...node,
    color:
      node.role === 'donor'
        ? DONOR_COLORS[index % DONOR_COLORS.length]
        : node.role === 'subtag'
          ? SUBTAG_COLOR
          : RECIPIENT_COLOR,
  }));
  const coloredData = {
    nodes,
    links: data.links.map((link) => ({
      ...link,
      flowType: link.flowType ? normalizeFlowType(link.flowType) : undefined,
      color: link.flowType ? getFlowTypeColor(link.flowType) : nodes[link.source]?.color ?? SUBTAG_COLOR,
    })),
  };
  const sankeyHeight = estimateThemeSankeyHeight(nodes);
  const flowLegendItems = useMemo(
    () => getFlowLegendItems(coloredData.links.map((link) => link.flowType)),
    [coloredData.links],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-lg font-semibold text-slate-900">Subtheme Flow</p>
      <p className="mb-4 text-sm text-slate-500">
        Donor to {theme.shortLabel.toLowerCase()} subtheme to recipient. If a project has multiple subthemes under this theme, its {activeMeasure.singular} value is allocated evenly across those subthemes to avoid double counting.
      </p>
      {flowLegendItems.length ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <div className="mb-1 text-[10px] font-medium text-slate-400">Recipient-link colors: flow type</div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] leading-4 text-slate-500">
            {flowLegendItems.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {coloredData.links.length ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={sankeyHeight}>
            <Sankey
              data={coloredData}
              nodePadding={THEME_SANKEY_NODE_PADDING}
              nodeWidth={14}
              sort={false}
              margin={{ top: 28, right: 260, left: 250, bottom: 28 }}
              node={<SankeyNode />}
              link={<SankeyLink />}
              onMouseEnter={(entry: any, type: 'node' | 'link') => setHoveredItem(buildSankeyHoverState(entry, type, activeMeasure.lower))}
              onMouseLeave={() => setHoveredItem(null)}
            />
          </ResponsiveContainer>
          {hoveredItem ? (
            <div
              className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"
              style={{ left: Math.min(hoveredItem.x + 12, 1030), top: hoveredItem.y }}
            >
              <div className="font-medium text-slate-700">{hoveredItem.title}</div>
              <div className="mt-1 text-slate-900">{hoveredItem.value}</div>
              <div className="mt-0.5 text-slate-500">{hoveredItem.subtitle}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[880px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
          No technology/enabler flow data is available.
        </div>
      )}
    </div>
  );
}

function RankingChart({
  title,
  subtitle,
  data,
  color,
  measure,
  measureLabel,
  axisWidth = 250,
}: {
  title: string;
  subtitle: string;
  data: ThemeRankingRow[];
  color: string;
  measure: BasisMeasure;
  measureLabel: string;
  axisWidth?: number;
}) {
  const chartHeight = Math.max(330, data.length * 38 + 58);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-base font-semibold text-slate-900">{title}</p>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {data.length ? (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 12, bottom: 0 }} barCategoryGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#64748B' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => usdM(value)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={axisWidth}
              tick={<WrappedCategoryTick maxChars={22} fontSize={12} fill="#334155" lineHeight={13} />}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip content={<TooltipBox measureLabel={measureLabel} />} />
            <Bar dataKey={measure} fill={color} fillOpacity={0.86} radius={[0, 3, 3, 0]} maxBarSize={15} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[330px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          No records match the current filters.
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 ml-1 block text-[13px] font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeSection({ theme, records, filters, measure }: { theme: ThemeSummary; records: ThemeRecord[]; filters: ThemeFilters; measure: BasisMeasure }) {
  const themeId = theme.id as ThemeId;
  const activeMeasure = measureCopy(measure);
  const themeRecords = useMemo(
    () => filterThemeRecords(records, filters),
    [filters, records],
  );
  const summary = useMemo(() => summarizeThemeRows(themeRecords), [themeRecords]);
  const series = useMemo(() => yearSeriesFor(themeRecords, filters.yearMin, filters.yearMax, measure), [filters.yearMax, filters.yearMin, measure, themeRecords]);
  const topRecipients = useMemo(() => rankingRows(themeRecords, 'recipient', measure), [measure, themeRecords]);
  const topDonors = useMemo(() => rankingRows(themeRecords, 'donor', measure), [measure, themeRecords]);
  const modeBreakdown = useMemo(() => rankingRows(themeRecords, 'mode', measure, 8), [measure, themeRecords]);
  const sankeyData = useMemo(() => buildTechnologyEnablerSankey(themeRecords, measure), [measure, themeRecords]);

  return (
    <section id={themeSectionId(themeId)} className="scroll-mt-48 space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.color }} />
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{theme.label}</h2>
          </div>
          <p className="mt-2 max-w-[900px] text-sm leading-6 text-slate-500">{theme.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Records" value={num(summary.recordCount)} />
        <KPICard label={activeMeasure.title} value={usdM(summary[measure])} />
        <KPICard label="Recipients" value={num(summary.recipientCount)} sub="Recipient economies" />
        <KPICard label="Donors" value={num(summary.donorCount)} sub="Finance sources" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-base font-semibold text-slate-900">Development Finance over Time</p>
        <p className="mb-4 text-sm text-slate-500">{activeMeasure.title} by year, constant 2024 USD.</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={series} margin={{ top: 10, right: 24, left: 8, bottom: 10 }} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
            <YAxis
              width={CURRENCY_AXIS_WIDTH}
              tickMargin={8}
              tick={{ fontSize: 11, fill: '#64748B' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => usdM(value)}
            />
            <Tooltip content={<TooltipBox measureLabel={activeMeasure.title} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="amount"
              name={`${theme.shortLabel} ${activeMeasure.lower}`}
              fill={theme.color}
              fillOpacity={0.84}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingChart
          title="Top Recipients"
          subtitle={`Largest ${theme.shortLabel.toLowerCase()} recipients by constant 2024 USD ${activeMeasure.lower}.`}
          data={topRecipients}
          color={theme.color}
          measure={measure}
          measureLabel={activeMeasure.title}
        />
        <RankingChart
          title="Top Donors"
          subtitle={`Largest ${theme.shortLabel.toLowerCase()} finance sources by constant 2024 USD ${activeMeasure.lower}.`}
          data={topDonors}
          color={theme.color}
          measure={measure}
          measureLabel={activeMeasure.title}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingChart
          title="Transport Mode Mix"
          subtitle="Theme finance grouped by CRS transport mode."
          data={modeBreakdown}
          color={theme.color}
          measure={measure}
          measureLabel={activeMeasure.title}
          axisWidth={210}
        />
      </div>

      {sankeyData.links.length > 0 && <TechnologyEnablerSankey data={sankeyData} theme={theme} measure={measure} />}
    </section>
  );
}

function mergeFilteredThemeRecords(recordsByTheme: ThemeRecordsByTheme, filtersByTheme: ThemeFilterState): ThemeRecordListItem[] {
  const merged = new Map<string, ThemeRecordListItem>();

  THEME_SUMMARIES.forEach((theme) => {
    const themeId = theme.id as ThemeId;
    const filteredRecords = filterThemeRecords(recordsByTheme[themeId] ?? [], filtersByTheme[themeId]);
    filteredRecords.forEach((record) => {
      const rowKey = record.rowNumber || `${themeId}-${record.year ?? 'unknown'}-${record.donor}-${record.recipient}-${record.title}`;
      const existing = merged.get(rowKey);

      if (!existing) {
        merged.set(rowKey, {
          ...record,
          rowKey,
          themeLabels: [theme.label],
          themeColors: [theme.color],
          allTags: [...new Set(record.tags.filter(Boolean))],
        });
        return;
      }

      if (!existing.themeLabels.includes(theme.label)) {
        existing.themeLabels.push(theme.label);
        existing.themeColors.push(theme.color);
      }
      record.tags.forEach((tag) => {
        if (tag && !existing.allTags.includes(tag)) existing.allTags.push(tag);
      });
    });
  });

  return [...merged.values()];
}

function themeRecordColumnText(record: ThemeRecordListItem, key: ThemeRecordSortKey, measure: BasisMeasure) {
  switch (key) {
    case 'year':
      return String(record.year ?? '');
    case 'record':
      return [record.title, record.description].filter(Boolean).join(' ');
    case 'donor':
      return record.donor;
    case 'recipient':
      return record.recipient;
    case 'mode':
      return record.mode;
    case 'flow':
      return record.flow;
    case 'themes':
      return record.themeLabels.join(' ');
    case 'subtags':
      return record.allTags.join(' ');
    case 'amount':
      return String(amountFor(record, measure));
  }
}

function themeRecordSortValue(record: ThemeRecordListItem, key: ThemeRecordSortKey, measure: BasisMeasure) {
  if (key === 'year') return record.year ?? 0;
  if (key === 'amount') return amountFor(record, measure);
  return themeRecordColumnText(record, key, measure).toLowerCase();
}

function ThemeRecordTable({ records, measure }: { records: ThemeRecordListItem[]; measure: BasisMeasure }) {
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<ThemeRecordListItem | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [recordSortKey, setRecordSortKey] = useState<ThemeRecordSortKey>('amount');
  const [recordSortDirection, setRecordSortDirection] = useState<SortDirection>('desc');
  const [recordColumnFilters, setRecordColumnFilters] = useState<ThemeRecordColumnFilters>(EMPTY_THEME_RECORD_COLUMN_FILTERS);
  const activeMeasure = measureCopy(measure);

  const recordFilterOptions = useMemo<Record<ThemeRecordDropdownFilterKey, string[]>>(() => {
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const years = [...new Set(records.map((record) => String(record.year ?? '')).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a));

    return {
      year: years,
      donor: unique(records.map((record) => record.donor)),
      recipient: unique(records.map((record) => record.recipient)),
      mode: unique(records.map((record) => record.mode)),
      flow: unique(records.map((record) => record.flow)),
      themes: unique(records.flatMap((record) => record.themeLabels)),
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const activeColumnFilters = Object.entries(recordColumnFilters)
      .map(([key, value]) => [key as ThemeRecordSortKey, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value.length > 0);

    return [...records]
      .filter((record) => {
        const searchableText = [
          record.title,
          record.description,
          record.donor,
          record.recipient,
          record.mode,
          record.flow,
          record.themeLabels.join(' '),
          record.allTags.join(' '),
          String(record.year ?? ''),
        ].join(' ').toLowerCase();

        if (query && !searchableText.includes(query)) return false;
        return activeColumnFilters.every(([key, value]) => themeRecordColumnText(record, key, measure).toLowerCase().includes(value));
      })
      .sort((a, b) => {
        const aValue = themeRecordSortValue(a, recordSortKey, measure);
        const bValue = themeRecordSortValue(b, recordSortKey, measure);
        const direction = recordSortDirection === 'asc' ? 1 : -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [measure, recordColumnFilters, recordSearch, recordSortDirection, recordSortKey, records]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const pagedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [measure, recordColumnFilters, recordSearch, records, rowsPerPage]);

  function handleRecordSort(key: ThemeRecordSortKey) {
    if (recordSortKey === key) {
      setRecordSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setRecordSortKey(key);
    setRecordSortDirection(key === 'year' || key === 'amount' ? 'desc' : 'asc');
  }

  function sortIcon(key: ThemeRecordSortKey) {
    if (recordSortKey !== key) {
      return <ChevronUp size={12} className="text-slate-300" />;
    }
    return recordSortDirection === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  }

  function themeChips(record: ThemeRecordListItem) {
    return record.themeLabels.map((label, index) => (
      <span
        key={label}
        className="rounded-md px-2 py-0.5 text-[10px] font-medium text-white"
        style={{ backgroundColor: record.themeColors[index] ?? '#64748B' }}
      >
        {label}
      </span>
    ));
  }

  function subtagChips(record: ThemeRecordListItem) {
    if (!record.allTags.length) return <span className="text-[12px] text-slate-400">No subtag assigned</span>;
    return record.allTags.slice(0, 4).map((tag) => (
      <span key={tag} className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-100">
        {tag}
      </span>
    ));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg tracking-tight text-slate-900">Project Records</h2>
          <p className="mt-1 text-[14px] text-slate-500">
            Records tagged under the theme filters above. Amounts use selected {activeMeasure.lower}.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input
              value={recordSearch}
              onChange={(event) => setRecordSearch(event.target.value)}
              placeholder="Search project records"
              className="w-48 border-none bg-transparent text-[14px] placeholder:text-slate-400 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <span>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700"
            >
              {[25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {Object.values(recordColumnFilters).some(Boolean) ? (
            <button
              onClick={() => setRecordColumnFilters(EMPTY_THEME_RECORD_COLUMN_FILTERS)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Clear column filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[15%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/40 text-[12px] text-slate-500">
              {THEME_RECORD_COLUMNS.map((column) => (
                <th key={column.key} className={`px-4 pb-2 pt-4 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                  <button
                    type="button"
                    onClick={() => handleRecordSort(column.key)}
                    className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-slate-800 ${
                      column.align === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{column.label}</span>
                    {sortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50/40">
              {THEME_RECORD_COLUMNS.map((column) => (
                <th key={`${column.key}-filter`} className="px-4 pb-3 text-left">
                  {column.key === 'amount' ? (
                    <div className="h-8" aria-hidden="true" />
                  ) : isThemeRecordDropdownFilter(column.key) ? (
                    <select
                      value={recordColumnFilters[column.key]}
                      onChange={(event) =>
                        setRecordColumnFilters((current) => ({
                          ...current,
                          [column.key]: event.target.value,
                        }))
                      }
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium normal-case tracking-normal text-slate-600 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">All</option>
                      {recordFilterOptions[column.key].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={recordColumnFilters[column.key]}
                      onChange={(event) =>
                        setRecordColumnFilters((current) => ({
                          ...current,
                          [column.key]: event.target.value,
                        }))
                      }
                      placeholder="Filter"
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-left text-[12px] font-medium normal-case tracking-normal text-slate-600 shadow-sm outline-none transition-colors placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-20 text-center text-slate-400">
                  No project records match the current theme filters and search.
                </td>
              </tr>
            ) : (
              pagedRecords.map((record) => (
                <tr
                  key={record.rowKey}
                  onClick={() => setActiveRecord(record)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-4 text-[14px] text-slate-600">{record.year}</td>
                  <td className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-[14px] font-medium text-slate-900">{record.title || 'Untitled record'}</p>
                      <p className="mt-1 line-clamp-2 text-[13px] text-slate-500">{record.description || 'No description available.'}</p>
                    </div>
                  </td>
                  <td className="break-words px-4 py-4 text-[14px] text-slate-600">{record.donor}</td>
                  <td className="break-words px-4 py-4 text-[14px] text-slate-600">{record.recipient}</td>
                  <td className="break-words px-4 py-4 text-[14px] text-slate-600">{record.mode}</td>
                  <td className="break-words px-4 py-4 text-[14px] text-slate-600">{record.flow}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">{themeChips(record)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">{subtagChips(record)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-[14px] font-medium text-slate-900">{usdM(amountFor(record, measure))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-slate-500">
          Showing {filteredRecords.length ? (page - 1) * rowsPerPage + 1 : 0}-
          {Math.min(page * rowsPerPage, filteredRecords.length)} of {filteredRecords.length.toLocaleString()} project records
        </p>
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <Sheet open={!!activeRecord} onOpenChange={(open) => !open && setActiveRecord(null)}>
        <SheetContent className="border-l border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl">
          {activeRecord ? (
            <div className="flex h-full flex-col">
              <div className="bg-slate-900 p-10 text-white">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[12px] font-semibold">Record detail</span>
                <h2 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-white">{activeRecord.title || 'Untitled record'}</h2>
              </div>
              <div className="flex-1 space-y-8 overflow-y-auto p-10">
                <div className="grid grid-cols-2 gap-4">
                  <KPICard label="Commitment" value={usdM(activeRecord.commitment_defl)} />
                  <KPICard label="Disbursement" value={usdM(activeRecord.disbursement_defl)} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    ['Donor', activeRecord.donor],
                    ['Recipient', activeRecord.recipient],
                    ['Flow', activeRecord.flow],
                    ['Mode', activeRecord.mode],
                    ['Year', activeRecord.year],
                    ['Row', activeRecord.rowNumber],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[12px] font-medium text-slate-500">{label}</p>
                      <p className="mt-1 text-[15px] text-slate-900">{value || 'Not specified'}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-3 text-[12px] font-medium text-slate-500">Themes</p>
                  <div className="flex flex-wrap gap-2">{themeChips(activeRecord)}</div>
                </div>

                <div>
                  <p className="mb-3 text-[12px] font-medium text-slate-500">Subtags</p>
                  <div className="flex flex-wrap gap-2">
                    {activeRecord.allTags.length
                      ? activeRecord.allTags.map((tag) => (
                        <span key={tag} className="rounded-md bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 ring-1 ring-sky-100">
                          {tag}
                        </span>
                      ))
                      : <span className="text-[13px] text-slate-400">No subtag assigned</span>}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[12px] font-medium text-slate-500">Description</p>
                  <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-6 text-[15px] leading-relaxed text-slate-700">
                    {activeRecord.description || 'Detailed descriptive metadata not available for this record.'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

export function ThemeExplorer() {
  const [filtersByTheme, setFiltersByTheme] = useState<ThemeFilterState>(() => createInitialFilters());
  const [measure, setMeasure] = useState<BasisMeasure>('commitment_defl');
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(THEME_IDS[0]);
  const [themeRecords, setThemeRecords] = useState<ThemeRecordsByTheme | null>(null);
  const [recordsError, setRecordsError] = useState(false);
  const emptyThemeRecords = useMemo(() => createEmptyThemeRecords(), []);
  const recordsByTheme = themeRecords ?? emptyThemeRecords;
  const activeTheme = THEME_SUMMARIES.find((theme) => theme.id === activeThemeId) ?? THEME_SUMMARIES[0];
  const activeFilters = filtersByTheme[activeThemeId];
  const activeThemeRecords = recordsByTheme[activeThemeId] ?? [];
  const filterOptions = useMemo(
    () => ({
      donors: buildFilterOptions(activeThemeRecords, (record) => [record.donor], measure),
      recipients: buildFilterOptions(activeThemeRecords, (record) => [record.recipient], measure),
      subtags: buildFilterOptions(activeThemeRecords, (record) => record.tags, measure),
    }),
    [activeThemeRecords, measure],
  );
  const themeRecordTableRows = useMemo(
    () => mergeFilteredThemeRecords(recordsByTheme, filtersByTheme),
    [filtersByTheme, recordsByTheme],
  );

  useEffect(() => {
    let cancelled = false;

    fetch(THEME_RECORDS_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load theme records: ${response.status}`);
        return response.json();
      })
      .then((data: ThemeRecordsByTheme) => {
        if (cancelled) return;
        setThemeRecords(data);
        setRecordsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setThemeRecords(createEmptyThemeRecords());
        setRecordsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sections = THEME_IDS.map((themeId) => document.getElementById(themeSectionId(themeId))).filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const themeId = activeEntry?.target.id.replace('theme-section-', '') as ThemeId | undefined;
        if (themeId && THEME_IDS.includes(themeId)) setActiveThemeId(themeId);
      },
      { rootMargin: '-180px 0px -55% 0px', threshold: [0.08, 0.2, 0.4, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const updateActiveFilters = (updates: Partial<ThemeFilters>) => {
    setFiltersByTheme((current) => ({
      ...current,
      [activeThemeId]: {
        ...current[activeThemeId],
        ...updates,
      },
    }));
  };

  const resetActiveFilters = () => {
    const fresh = createInitialFilters()[activeThemeId];
    setMeasure('commitment_defl');
    setFiltersByTheme((current) => ({
      ...current,
      [activeThemeId]: fresh,
    }));
  };

  const scrollToTheme = (themeId: ThemeId) => {
    setActiveThemeId(themeId);
    document.getElementById(themeSectionId(themeId))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <CRSPageIntro
          title="Themes"
          note="The thematic tags are based on an analytical exercise that interprets project titles and descriptions in the OECD CRS data. These tags are not officially reported classifications in the OECD CRS and should therefore be treated as indicative rather than definitive."
        >
          <p>
            The Themes page allows users to view information on bespoke transport themes. It shows how transport-related development finance is distributed across these themes or topics, and how support has changed over time.
          </p>
        </CRSPageIntro>

        <div className="sticky top-24 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Filters for {activeTheme.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">Theme filters are saved separately as you scroll; basis applies to all themes.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {THEME_SUMMARIES.map((theme) => {
                const themeId = theme.id as ThemeId;
                const isActive = themeId === activeThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => scrollToTheme(themeId)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {theme.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(320px,0.9fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
            <YearRangeSelector
              label="Year"
              min={activeTheme.yearMin ?? GLOBAL_THEME_YEAR_MIN}
              max={activeTheme.yearMax ?? GLOBAL_THEME_YEAR_MAX}
              yearMin={activeFilters.yearMin}
              yearMax={activeFilters.yearMax}
              onChange={(min, max) => {
                updateActiveFilters({ yearMin: min, yearMax: max });
              }}
            />
            <FilterSelect
              label="Recipient"
              value={activeFilters.recipient}
              options={filterOptions.recipients}
              allLabel="All recipients"
              onChange={(recipient) => updateActiveFilters({ recipient })}
            />
            <FilterSelect
              label="Donor"
              value={activeFilters.donor}
              options={filterOptions.donors}
              allLabel="All donors"
              onChange={(donor) => updateActiveFilters({ donor })}
            />
            <FilterSelect
              label="Subtag"
              value={activeFilters.subtag}
              options={filterOptions.subtags}
              allLabel="All subtags"
              onChange={(subtag) => updateActiveFilters({ subtag })}
            />
            <BasisDropdown value={measure} onChange={setMeasure} />
            <button
              type="button"
              onClick={resetActiveFilters}
              className="h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              Reset
            </button>
          </div>
          {recordsError ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Theme records could not be loaded. Check that the static data file was published with the dashboard.
            </p>
          ) : !themeRecords ? (
            <p className="mt-3 text-xs text-slate-400">Loading theme records...</p>
          ) : null}
        </div>

        {THEME_SUMMARIES.map((theme, index) => (
          <div key={theme.id} className="space-y-12">
            {index > 0 && <div className="h-px bg-slate-300" />}
            <ThemeSection theme={theme} records={recordsByTheme[theme.id as ThemeId] ?? []} filters={filtersByTheme[theme.id as ThemeId]} measure={measure} />
          </div>
        ))}

        <ThemeRecordTable records={themeRecordTableRows} measure={measure} />
      </div>
    </div>
  );
}
