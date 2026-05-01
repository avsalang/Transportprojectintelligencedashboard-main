import { useState } from 'react';
import {
  Area,
  AreaChart,
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
import { wrapTickLabel } from '../components/ChartTicks';
import {
  EMOBILITY_TECHNOLOGY_ENABLER_SANKEY,
  THEME_MODE_BREAKDOWN,
  THEME_SUMMARIES,
  THEME_TOP_DONORS,
  THEME_TOP_RECIPIENTS,
  THEME_YEAR_SERIES,
  type ThemeId,
  type ThemeRankingRow,
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

type ThemeSummary = (typeof THEME_SUMMARIES)[number];

function usdM(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(1)}M`;
}

function num(value: number): string {
  return value.toLocaleString();
}

function trendValue(row: Record<string, number>, themeId: ThemeId) {
  return row[`${themeId}_commitment_defl`] ?? 0;
}

function yearSeriesFor(themeId: ThemeId) {
  return THEME_YEAR_SERIES.map((row) => ({
    year: row.year,
    commitments: trendValue(row, themeId),
  }));
}

function peakYearFor(themeId: ThemeId) {
  return THEME_YEAR_SERIES.reduce(
    (best, row) => {
      const value = trendValue(row, themeId);
      return value > best.value ? { year: row.year, value } : best;
    },
    { year: null as number | null, value: 0 },
  );
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
      subtitle: 'Allocated deflated commitments',
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
      <text x={labelX} y={y + height / 2} textAnchor={anchor} dominantBaseline="middle" fontSize={11} fill="#334155">
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
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload, ...rest } = props;
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

  return <path {...rest} d={path} fill={payload?.color ?? '#7DD3FC'} fillOpacity={0.42} stroke="none" />;
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
      color: nodes[link.source]?.color ?? SUBTAG_COLOR,
    })),
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-base font-semibold text-slate-900">Technology / Enabler Flow</p>
      <p className="mb-4 text-sm text-slate-500">
        Donor to e-mobility subtag to recipient. Multi-tag records are allocated evenly across their assigned subtags.
      </p>
      {coloredData.links.length ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={760}>
            <Sankey
              data={coloredData}
              nodePadding={28}
              nodeWidth={14}
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
        <div className="flex h-[760px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
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
  const chartHeight = Math.max(330, data.length * 34 + 58);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-base font-semibold text-slate-900">{title}</p>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 12, bottom: 0 }} barCategoryGap={10}>
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
            tick={{ fontSize: 12, fill: '#334155' }}
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
  const peakYear = peakYearFor(themeId);
  const series = yearSeriesFor(themeId);

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
        <div className="rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
          {theme.yearMin}-{theme.yearMax}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KPICard label="Records" value={num(theme.recordCount)} sub="Tagged CRS lines" />
        <KPICard label="Commitments" value={usdM(theme.commitment_defl)} sub="Deflated value" />
        <KPICard label="Disbursements" value={usdM(theme.disbursement_defl)} sub="Deflated value" />
        <KPICard label="Recipients" value={num(theme.recipientCount)} sub="Recipient economies" />
        <KPICard label="Donors" value={num(theme.donorCount)} sub="Funding sources" />
        <KPICard label="Peak Year" value={peakYear.year ? String(peakYear.year) : '-'} sub={usdM(peakYear.value)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-base font-semibold text-slate-900">Funding Over Time</p>
        <p className="mb-4 text-sm text-slate-500">Deflated commitments by year.</p>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={series} margin={{ top: 10, right: 24, left: 8, bottom: 10 }}>
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
            <Area
              type="monotone"
              dataKey="commitments"
              name={`${theme.shortLabel} commitments`}
              stroke={theme.color}
              fill={theme.color}
              fillOpacity={0.26}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingChart
          title="Top Recipients"
          subtitle={`Largest ${theme.shortLabel.toLowerCase()} recipients by deflated commitments.`}
          data={THEME_TOP_RECIPIENTS[themeId]}
          color={theme.color}
        />
        <RankingChart
          title="Top Donors"
          subtitle={`Largest ${theme.shortLabel.toLowerCase()} funding sources by deflated commitments.`}
          data={THEME_TOP_DONORS[themeId]}
          color={theme.color}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingChart
          title="Transport Mode Mix"
          subtitle="Theme funding grouped by CRS transport mode."
          data={THEME_MODE_BREAKDOWN[themeId]}
          color={theme.color}
          axisWidth={210}
        />
      </div>

      {themeId === 'e_mobility' && <TechnologyEnablerSankey data={EMOBILITY_TECHNOLOGY_ENABLER_SANKEY} />}
    </section>
  );
}

export function ThemeExplorer() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="mx-auto max-w-[1440px] space-y-12">
        <div>
          <h1 className="text-2xl text-slate-900">Themes</h1>
          <p className="mt-1 max-w-[920px] text-sm text-slate-500">
            Thematic views built from tagged CRS transport records. E-mobility includes subtype tags; road safety is grouped as one theme for now.
          </p>
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
