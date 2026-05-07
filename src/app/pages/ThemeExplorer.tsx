import { useMemo, useState } from 'react';
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
import { getFlowLegendItems, getFlowTypeColor, normalizeFlowType } from '../utils/flowTypeColors';
import {
  THEME_RECORDS,
  THEME_SUMMARIES,
  type ThemeId,
  type ThemeRankingRow,
  type ThemeRecord,
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

type ThemeSummary = (typeof THEME_SUMMARIES)[number];

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
      subtitle: entry.flowType ? `${normalizeFlowType(entry.flowType)} · allocated deflated commitments` : 'Allocated deflated commitments',
    };
  }

  const node = entry.payload;
  if (!node?.name || !(node.totalValue >= 0.05)) return null;
  return {
    x: coordinate.x,
    y: coordinate.y,
    title: node.name,
    value: usdM(node.totalValue),
    subtitle: node.role === 'subtag' ? 'Technology / enabler total' : `${node.role} total`,
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

function TechnologyEnablerSankey({ data }: { data: ThemeSankeyData }) {
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
      <p className="mb-1 text-lg font-semibold text-slate-900">Technology / Enabler Flow</p>
      <p className="mb-4 text-sm text-slate-500">
        Donor to e-mobility subtag to recipient. Multi-tag records are allocated evenly across their assigned subtags.
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
    </div>
  );
}

function ThemeSection({ theme }: { theme: ThemeSummary }) {
  const themeId = theme.id as ThemeId;
  const [yearMin, setYearMin] = useState(theme.yearMin ?? 1973);
  const [yearMax, setYearMax] = useState(theme.yearMax ?? 2024);
  const themeRecords = useMemo(
    () => THEME_RECORDS[themeId].filter((record) => record.year != null && record.year >= yearMin && record.year <= yearMax),
    [themeId, yearMax, yearMin],
  );
  const summary = useMemo(() => summarizeThemeRows(themeRecords), [themeRecords]);
  const series = useMemo(() => yearSeriesFor(themeRecords, yearMin, yearMax), [themeRecords, yearMax, yearMin]);
  const topRecipients = useMemo(() => rankingRows(themeRecords, 'recipient'), [themeRecords]);
  const topDonors = useMemo(() => rankingRows(themeRecords, 'donor'), [themeRecords]);
  const modeBreakdown = useMemo(() => rankingRows(themeRecords, 'mode', 8), [themeRecords]);
  const sankeyData = useMemo(() => buildTechnologyEnablerSankey(themeRecords), [themeRecords]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.color }} />
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{theme.label}</h2>
          </div>
          <p className="mt-2 max-w-[900px] text-sm leading-6 text-slate-500">{theme.description}</p>
        </div>
        <div className="w-full rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 lg:w-[330px]">
          <YearRangeSelector
            label="Year"
            min={theme.yearMin ?? 1973}
            max={theme.yearMax ?? 2024}
            yearMin={yearMin}
            yearMax={yearMax}
            onChange={(min, max) => {
              setYearMin(min);
              setYearMax(max);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KPICard label="Project Records" value={num(summary.recordCount)} />
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

      {themeId === 'e_mobility' && <TechnologyEnablerSankey data={sankeyData} />}
    </section>
  );
}

export function ThemeExplorer() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="mx-auto max-w-[1440px] space-y-12">
        <div>
          <h1 className="text-2xl text-slate-900">Themes</h1>
          <p className="mt-1 max-w-[920px] text-sm text-slate-500">Thematic views built from tagged CRS transport records.</p>
        </div>

        {THEME_SUMMARIES.map((theme, index) => (
          <div key={theme.id} className="space-y-12">
            {index > 0 && <div className="h-px bg-slate-300" />}
            <ThemeSection theme={theme} />
          </div>
        ))}
      </div>
    </div>
  );
}
