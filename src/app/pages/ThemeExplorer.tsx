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
import { KPICard } from '../components/KPICard';
import { wrapTickLabel, WrappedCategoryTick } from '../components/ChartTicks';
import { YearRangeSelector } from '../components/YearRangeSelector';
import { CRSPageIntro } from '../components/CRSPageIntro';
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
type FilterOption = { value: string; label: string; commitment_defl: number; count: number };

const THEME_IDS = THEME_SUMMARIES.map((theme) => theme.id as ThemeId);

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

function buildFilterOptions(records: ThemeRecord[], valuesForRecord: (record: ThemeRecord) => string[]): FilterOption[] {
  const buckets = new Map<string, Omit<FilterOption, 'value' | 'label'>>();
  records.forEach((record) => {
    const values = valuesForRecord(record).filter(Boolean);
    values.forEach((value) => {
      const bucket = buckets.get(value) ?? { commitment_defl: 0, count: 0 };
      bucket.commitment_defl += record.commitment_defl;
      bucket.count += 1;
      buckets.set(value, bucket);
    });
  });

  return [...buckets.entries()]
    .map(([value, bucket]) => ({ value, label: value, ...bucket }))
    .sort((a, b) => b.commitment_defl - a.commitment_defl || a.label.localeCompare(b.label));
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

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[12px] font-medium text-slate-700">{usdM(Number(row.value))}</p>
      {row.payload?.count != null && <p className="mt-1 text-[11px] text-slate-400">{num(row.payload.count)} records</p>}
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

function rankingRows(records: ThemeRecord[], key: 'donor' | 'recipient' | 'mode', top = 10): ThemeRankingRow[] {
  const buckets = new Map<string, Omit<ThemeRankingRow, 'label'>>();
  records.forEach((record) => {
    const label = record[key] || 'Unknown';
    const bucket = buckets.get(label) ?? emptyRankingRow();
    addRecord(bucket, record);
    buckets.set(label, bucket);
  });
  return [...buckets.entries()]
    .map(([label, values]) => ({ label, ...values }))
    .sort((a, b) => b.commitment_defl - a.commitment_defl || a.label.localeCompare(b.label))
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

function yearSeriesFor(records: ThemeRecord[], yearMin: number, yearMax: number) {
  const byYear = new Map<number, { year: number; commitments: number; count: number }>();
  for (let year = yearMin; year <= yearMax; year += 1) {
    byYear.set(year, { year, commitments: 0, count: 0 });
  }
  records.forEach((record) => {
    if (record.year == null) return;
    const row = byYear.get(record.year);
    if (!row) return;
    row.commitments += record.commitment_defl;
    row.count += 1;
  });
  return [...byYear.values()];
}

function buildTechnologyEnablerSankey(records: ThemeRecord[], topDonorCount = 8, topRecipientCount = 10): ThemeSankeyData {
  const MIN_VISIBLE_FLOW_VALUE = 0.05;
  const donorTotals = new Map<string, number>();
  const recipientTotals = new Map<string, number>();
  records.forEach((record) => {
    if (!record.tags.length || record.commitment_defl <= 0) return;
    const value = record.commitment_defl / record.tags.length;
    donorTotals.set(record.donor || 'Unknown donor', (donorTotals.get(record.donor || 'Unknown donor') ?? 0) + value);
    recipientTotals.set(record.recipient || 'Unknown recipient', (recipientTotals.get(record.recipient || 'Unknown recipient') ?? 0) + value);
  });
  const topDonors = new Set([...donorTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topDonorCount).map(([label]) => label));
  const topRecipients = new Set([...recipientTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topRecipientCount).map(([label]) => label));
  const donorTag = new Map<string, number>();
  const tagRecipient = new Map<string, number>();

  records.forEach((record) => {
    if (!record.tags.length || record.commitment_defl <= 0) return;
    const donor = topDonors.has(record.donor) ? record.donor : 'Other donors';
    const recipient = topRecipients.has(record.recipient) ? record.recipient : 'Other recipients';
    const flowType = record.flow || 'Other Flow Types';
    const value = record.commitment_defl / record.tags.length;
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

function buildSankeyHoverState(entry: any, type: 'node' | 'link') {
  const coordinate = getHoverCoordinate(entry, type);
  if (type === 'link') {
    if (!entry.sourceName || !entry.targetName || !(entry.value >= 0.05)) return null;
    return {
      x: coordinate.x,
      y: coordinate.y,
      title: `${entry.sourceName} -> ${entry.targetName}`,
      value: usdM(entry.value),
      subtitle: entry.flowType ? `${normalizeFlowType(entry.flowType)} · allocated commitments, constant 2024 USD` : 'Allocated commitments, constant 2024 USD',
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

function TechnologyEnablerSankey({ data, theme }: { data: ThemeSankeyData; theme: ThemeSummary }) {
  const [hoveredItem, setHoveredItem] = useState<{ x: number; y: number; title: string; value: string; subtitle: string } | null>(null);
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
        Donor to {theme.shortLabel.toLowerCase()} subtheme to recipient. If a project has multiple subthemes under this theme, its commitment value is allocated evenly across those subthemes to avoid double counting.
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
              onMouseEnter={(entry: any, type: 'node' | 'link') => setHoveredItem(buildSankeyHoverState(entry, type))}
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
  axisWidth = 250,
}: {
  title: string;
  subtitle: string;
  data: ThemeRankingRow[];
  color: string;
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
            <Tooltip content={<TooltipBox />} />
            <Bar dataKey="commitment_defl" fill={color} fillOpacity={0.86} radius={[0, 3, 3, 0]} maxBarSize={15} />
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

function ThemeSection({ theme, records, filters }: { theme: ThemeSummary; records: ThemeRecord[]; filters: ThemeFilters }) {
  const themeId = theme.id as ThemeId;
  const themeRecords = useMemo(
    () => filterThemeRecords(records, filters),
    [filters, records],
  );
  const summary = useMemo(() => summarizeThemeRows(themeRecords), [themeRecords]);
  const series = useMemo(() => yearSeriesFor(themeRecords, filters.yearMin, filters.yearMax), [filters.yearMax, filters.yearMin, themeRecords]);
  const topRecipients = useMemo(() => rankingRows(themeRecords, 'recipient'), [themeRecords]);
  const topDonors = useMemo(() => rankingRows(themeRecords, 'donor'), [themeRecords]);
  const modeBreakdown = useMemo(() => rankingRows(themeRecords, 'mode', 8), [themeRecords]);
  const sankeyData = useMemo(() => buildTechnologyEnablerSankey(themeRecords), [themeRecords]);

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KPICard label="Projects" value={num(summary.recordCount)} />
        <KPICard label="Commitments" value={usdM(summary.commitment_defl)} />
        <KPICard label="Disbursements" value={usdM(summary.disbursement_defl)} />
        <KPICard label="Recipients" value={num(summary.recipientCount)} sub="Recipient economies" />
        <KPICard label="Donors" value={num(summary.donorCount)} sub="Finance sources" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-base font-semibold text-slate-900">Development Finance over Time</p>
        <p className="mb-4 text-sm text-slate-500">Commitments by year, constant 2024 USD.</p>
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
            <Tooltip content={<TooltipBox />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="commitments"
              name={`${theme.shortLabel} commitments`}
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
          subtitle={`Largest ${theme.shortLabel.toLowerCase()} recipients by constant 2024 USD commitments.`}
          data={topRecipients}
          color={theme.color}
        />
        <RankingChart
          title="Top Donors"
          subtitle={`Largest ${theme.shortLabel.toLowerCase()} finance sources by constant 2024 USD commitments.`}
          data={topDonors}
          color={theme.color}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingChart
          title="Transport Mode Mix"
          subtitle="Theme finance grouped by CRS transport mode."
          data={modeBreakdown}
          color={theme.color}
          axisWidth={210}
        />
      </div>

      {sankeyData.links.length > 0 && <TechnologyEnablerSankey data={sankeyData} theme={theme} />}
    </section>
  );
}

export function ThemeExplorer() {
  const [filtersByTheme, setFiltersByTheme] = useState<ThemeFilterState>(() => createInitialFilters());
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
      donors: buildFilterOptions(activeThemeRecords, (record) => [record.donor]),
      recipients: buildFilterOptions(activeThemeRecords, (record) => [record.recipient]),
      subtags: buildFilterOptions(activeThemeRecords, (record) => record.tags),
    }),
    [activeThemeRecords],
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
              <p className="mt-0.5 text-xs text-slate-500">Selections are saved separately for each theme as you scroll.</p>
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

          <div className="grid gap-3 lg:grid-cols-[minmax(320px,0.9fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
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
            <ThemeSection theme={theme} records={recordsByTheme[theme.id as ThemeId] ?? []} filters={filtersByTheme[theme.id as ThemeId]} />
          </div>
        ))}
      </div>
    </div>
  );
}
