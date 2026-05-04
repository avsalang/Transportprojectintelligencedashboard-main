import { useMemo, useState } from 'react';
import { ResponsiveContainer, Sankey } from 'recharts';
import { crsFmt } from '../data/crsData';
import { buildFlowSankeyData, type CRSMeasure, type FlowSankeyOptions } from '../utils/crsAggregations';
import { getFlowLegendItems, getFlowTypeColor, normalizeFlowType } from '../utils/flowTypeColors';
import { wrapTickLabel } from './ChartTicks';

const DONOR_COLORS = ['#0F766E', '#0EA5E9', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#65A30D', '#0891B2'];
const AGENCY_COLOR = '#60A5FA';
const RECIPIENT_COLOR = '#10B981';
const SANKEY_NODE_PADDING = 32;
const SANKEY_LABEL_LINE_HEIGHT = 14;

function getHoverCoordinate(entry: any, type: 'node' | 'link') {
  if (type === 'node') {
    return { x: entry.x + entry.width / 2, y: entry.y + entry.height / 2 };
  }
  return { x: (entry.sourceX + entry.targetX) / 2, y: (entry.sourceY + entry.targetY) / 2 };
}

function buildHoverState(entry: any, type: 'node' | 'link', measure: CRSMeasure) {
  const coordinate = getHoverCoordinate(entry, type);
  if (type === 'link') {
    if (!entry.sourceName || !entry.targetName || !(entry.value >= 0.05)) return null;
    return {
      x: coordinate.x,
      y: coordinate.y,
      title: `${entry.sourceName} → ${entry.targetName}`,
      value: crsFmt.usdM(entry.value),
      subtitle: entry.flowType
        ? `${normalizeFlowType(entry.flowType)} · ${measure.includes('commitment') ? 'commitments' : 'disbursements'}`
        : measure.includes('commitment') ? 'Commitments' : 'Disbursements',
    };
  }

  const node = entry.payload;
  if (!node?.name || !node?.role || !(node.totalValue >= 0.05)) return null;
  return {
    x: coordinate.x,
    y: coordinate.y,
    title: node.name,
    value: crsFmt.usdM(node.totalValue),
    subtitle: measure.includes('commitment') ? `${node.role} commitments in current filters` : `${node.role} disbursements in current filters`,
  };
}

function FlowNode(props: any) {
  const { x, y, width, height, index, payload, onSelect, isDimmed, isActive, ...rest } = props;
  const isDonor = payload?.role === 'donor';
  const isAgency = payload?.role === 'agency';
  const labelX = isDonor ? x - 12 : isAgency ? x + width + 8 : x + width + 12;
  const anchor = isDonor ? 'end' : 'start';
  const lines = wrapTickLabel(payload?.name ?? `Node ${index + 1}`, 24);

  return (
    <g {...rest} onClick={() => onSelect?.(payload?.name, payload?.role)} style={{ cursor: 'pointer' }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload?.color ?? (isDonor ? '#0F766E' : isAgency ? AGENCY_COLOR : RECIPIENT_COLOR)}
        fillOpacity={isDimmed ? 0.25 : 0.92}
        stroke={isActive ? '#0F172A' : 'transparent'}
        strokeWidth={isActive ? 1.5 : 0}
        rx={3}
      />
      <text
        x={labelX}
        y={y + height / 2}
        textAnchor={anchor}
        dominantBaseline="middle"
        fontSize={12}
        fill={isDimmed ? '#94A3B8' : '#334155'}
        stroke="#FFFFFF"
        strokeWidth={4}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {lines.map((line: string, lineIndex: number) => (
          <tspan
            key={`${payload?.name}-${lineIndex}`}
            x={labelX}
            dy={lineIndex === 0 ? -((lines.length - 1) * 14) / 2 : 14}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function FlowLink(props: any) {
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

  return <path {...rest} d={path} fill={payload?.color ?? '#8FB996'} fillOpacity={0.58} stroke="none" style={{ cursor: 'pointer' }} />;
}

function estimateSankeyColumnHeight(nodes: any[], role: 'donor' | 'agency' | 'recipient') {
  const roleNodes = nodes.filter((node) => node.role === role);
  if (!roleNodes.length) return 0;
  const labelHeights = roleNodes.map((node) => {
    const labelWidth = role === 'agency' ? 21 : 24;
    return Math.max(38, wrapTickLabel(node.name ?? '', labelWidth).length * SANKEY_LABEL_LINE_HEIGHT + 12);
  });
  return labelHeights.reduce((sum, height) => sum + height, 0) + (roleNodes.length - 1) * SANKEY_NODE_PADDING + 60;
}

export function CRSFlowPanel({
  facts,
  measure,
  title = 'Funding Flows',
  subtitle = 'Donor to agency to recipient pathways in the current filtered view.',
  sankeyOptions,
}: {
  facts: any[];
  measure: CRSMeasure;
  title?: string;
  subtitle?: string;
  sankeyOptions?: FlowSankeyOptions;
}) {
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ x: number; y: number; title: string; value: string; subtitle: string } | null>(null);

  const flowFacts = useMemo(() => {
    if (selectedDonor) return facts.filter((fact) => (fact.recipient_scope === 'economy' || fact.recipient_scope === 'regional') && fact.donor === selectedDonor);
    if (selectedAgency) return facts.filter((fact) => (fact.recipient_scope === 'economy' || fact.recipient_scope === 'regional') && fact.agency === selectedAgency);
    if (selectedRecipient) return facts.filter((fact) => (fact.recipient_scope === 'economy' || fact.recipient_scope === 'regional') && fact.recipient === selectedRecipient);
    return facts;
  }, [facts, selectedAgency, selectedDonor, selectedRecipient]);

  const sankeyFacts = useMemo(() => flowFacts.filter((fact) => fact.recipient_scope === 'economy' || fact.recipient_scope === 'regional'), [flowFacts]);
  const sankeyData = useMemo(() => buildFlowSankeyData(sankeyFacts, measure, sankeyOptions), [sankeyFacts, measure, sankeyOptions]);

  const coloredSankeyData = useMemo(() => {
    const visibleValueByNode = new Map<string, number>();
    const totalValueByNode = new Map<string, number>();
    sankeyData.donorLinkTotals.forEach((item) => visibleValueByNode.set(`donor::${item.label}`, item.value));
    sankeyData.agencyLinkTotals.forEach((item) => visibleValueByNode.set(`agency::${item.label}`, item.value));
    sankeyData.recipientLinkTotals.forEach((item) => visibleValueByNode.set(`recipient::${item.label}`, item.value));
    sankeyFacts.forEach((fact) => {
      totalValueByNode.set(`donor::${fact.donor}`, (totalValueByNode.get(`donor::${fact.donor}`) ?? 0) + fact[measure]);
      totalValueByNode.set(`agency::${fact.agency}`, (totalValueByNode.get(`agency::${fact.agency}`) ?? 0) + fact[measure]);
      totalValueByNode.set(`recipient::${fact.recipient}`, (totalValueByNode.get(`recipient::${fact.recipient}`) ?? 0) + fact[measure]);
    });
    const nodes = sankeyData.nodes.map((node, index) => ({
      ...node,
      visibleValue: visibleValueByNode.get(node.id) ?? node.globalValue ?? 0,
      totalValue: totalValueByNode.get(node.id) ?? node.globalValue ?? 0,
      color:
        node.role === 'donor'
          ? DONOR_COLORS[index % DONOR_COLORS.length]
          : node.role === 'agency'
            ? AGENCY_COLOR
            : RECIPIENT_COLOR,
    }));
    const links = sankeyData.links.map((link) => ({
      ...link,
      color: link.flowType ? getFlowTypeColor(link.flowType) : nodes[link.source]?.color ?? DONOR_COLORS[0],
      flowType: link.flowType ? normalizeFlowType(link.flowType) : undefined,
    }));
    return { ...sankeyData, nodes, links };
  }, [measure, sankeyData, sankeyFacts]);

  const flowLegendItems = useMemo(
    () => getFlowLegendItems(coloredSankeyData.links.map((link: any) => link.flowType)),
    [coloredSankeyData.links],
  );

  const activeSelectionLabel = selectedDonor ?? selectedAgency ?? selectedRecipient;
  const activeSelectionType = selectedDonor ? 'donor' : selectedAgency ? 'agency' : selectedRecipient ? 'recipient' : null;
  const sankeyHeight = Math.max(
    460,
    estimateSankeyColumnHeight(coloredSankeyData.nodes, 'donor'),
    estimateSankeyColumnHeight(coloredSankeyData.nodes, 'agency'),
    estimateSankeyColumnHeight(coloredSankeyData.nodes, 'recipient'),
  );

  const handleNodeSelect = (name?: string, type?: 'donor' | 'agency' | 'recipient') => {
    if (!name || !type) return;
    if (type === 'donor') {
      setSelectedAgency(null);
      setSelectedRecipient(null);
      setSelectedDonor((prev) => (prev === name ? null : name));
      return;
    }
    if (type === 'agency') {
      setSelectedDonor(null);
      setSelectedRecipient(null);
      setSelectedAgency((prev) => (prev === name ? null : name));
      return;
    }
    setSelectedDonor(null);
    setSelectedAgency(null);
    setSelectedRecipient((prev) => (prev === name ? null : name));
  };

  const nodeRenderer = (props: any) => (
    <FlowNode
      {...props}
      onSelect={handleNodeSelect}
      isActive={activeSelectionLabel === props.payload?.name}
      isDimmed={Boolean(activeSelectionLabel) && activeSelectionLabel !== props.payload?.name}
    />
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p className="text-slate-900 text-lg font-semibold mb-1">{title}</p>
      <p className="text-slate-500 text-sm mb-4">{subtitle}</p>
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
      {activeSelectionLabel ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 border border-emerald-200">
          Showing only {activeSelectionType}: <span className="font-semibold">{activeSelectionLabel}</span>
        </div>
      ) : null}
      {sankeyData.links.length ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={sankeyHeight}>
            <Sankey
              data={coloredSankeyData}
              nodePadding={SANKEY_NODE_PADDING}
              nodeWidth={14}
              sort={false}
              margin={{ top: 24, right: 320, left: 300, bottom: 24 }}
              node={nodeRenderer}
              link={<FlowLink />}
              onMouseEnter={(entry: any, type: 'node' | 'link') => setHoveredItem(buildHoverState(entry, type, measure))}
              onMouseLeave={() => setHoveredItem(null)}
            />
          </ResponsiveContainer>
          {hoveredItem ? (
            <div
              className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"
              style={{ left: Math.min(hoveredItem.x + 12, 980), top: hoveredItem.y }}
            >
              <div className="font-medium text-slate-700">{hoveredItem.title}</div>
              <div className="mt-1 text-slate-900">{hoveredItem.value}</div>
              <div className="mt-0.5 text-slate-500">{hoveredItem.subtitle}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-h-[460px] rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm text-slate-500">
          No funding flows are available for the current filters.
        </div>
      )}
    </div>
  );
}
