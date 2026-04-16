import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { estimateCategoryAxisWidth, WrappedAxisTick, WrappedCategoryTick } from '../components/ChartTicks';
import { crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import { aggregateFacts, buildFlowSankeyData, type CRSMeasure } from '../utils/crsAggregations';

const DONOR_COLORS = ['#0F766E', '#0EA5E9', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#65A30D', '#0891B2'];
const AGENCY_COLOR = '#60A5FA';
const RECIPIENT_COLOR = '#10B981';

function getHoverCoordinate(entry: any, type: 'node' | 'link') {
  if (type === 'node') {
    return {
      x: entry.x + entry.width / 2,
      y: entry.y + entry.height / 2,
    };
  }
  return {
    x: (entry.sourceX + entry.targetX) / 2,
    y: (entry.sourceY + entry.targetY) / 2,
  };
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
      subtitle: measure === 'commitment' ? 'Commitments' : 'Disbursements',
    };
  }

  const node = entry.payload;
  if (!node?.name || !node?.role || !(node.totalValue >= 0.05)) return null;
  return {
    x: coordinate.x,
    y: coordinate.y,
    title: node.name,
    value: crsFmt.usdM(node.totalValue),
    subtitle: measure === 'commitment' ? `${node.role} commitments in current filters` : `${node.role} disbursements in current filters`,
  };
}

function FlowNode(props: any) {
  const { x, y, width, height, index, payload, onSelect, isDimmed, isActive, ...rest } = props;
  const isDonor = payload?.role === 'donor';
  const isAgency = payload?.role === 'agency';
  const labelX = isDonor ? x - 12 : isAgency ? x + width + 8 : x + width + 12;
  const anchor = isDonor ? 'end' : 'start';
  return (
    <g
      {...rest}
      onClick={() => onSelect?.(payload?.name, payload?.role)}
      style={{ cursor: 'pointer' }}
    >
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
        fontSize={10.5}
        fill={isDimmed ? '#94A3B8' : '#334155'}
      >
        {payload?.name ?? `Node ${index + 1}`}
      </text>
    </g>
  );
}

function FlowLink(props: any) {
  const {
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    payload,
    ...rest
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

  const fill = payload?.color ?? '#8FB996';
  return <path {...rest} d={path} fill={fill} fillOpacity={0.58} stroke="none" style={{ cursor: 'pointer' }} />;
}

export function CRSFlows() {
  const { filteredFacts } = useCRSFilters();
  const [measure, setMeasure] = useState<CRSMeasure>('commitment');
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ x: number; y: number; title: string; value: string; subtitle: string } | null>(null);

  const flowFacts = useMemo(() => {
    if (selectedDonor) {
      return filteredFacts.filter((fact) => fact.recipient_scope === 'economy' && fact.donor === selectedDonor);
    }
    if (selectedAgency) {
      return filteredFacts.filter((fact) => fact.recipient_scope === 'economy' && fact.agency === selectedAgency);
    }
    if (selectedRecipient) {
      return filteredFacts.filter((fact) => fact.recipient_scope === 'economy' && fact.recipient === selectedRecipient);
    }
    return filteredFacts;
  }, [filteredFacts, selectedAgency, selectedDonor, selectedRecipient]);
  const sankeyFacts = useMemo(() => flowFacts.filter((fact) => fact.recipient_scope === 'economy'), [flowFacts]);

  const sankeyData = useMemo(() => buildFlowSankeyData(sankeyFacts, measure), [sankeyFacts, measure]);
  const coloredSankeyData = useMemo(() => {
    const visibleValueByNode = new Map<string, number>();
    const totalValueByNode = new Map<string, number>();
    sankeyData.donorLinkTotals.forEach((item) => visibleValueByNode.set(`donor::${item.label}`, item.value));
    sankeyData.agencyLinkTotals.forEach((item) => visibleValueByNode.set(`agency::${item.label}`, item.value));
    sankeyData.recipientLinkTotals.forEach((item) => visibleValueByNode.set(`recipient::${item.label}`, item.value));
    aggregateFacts(sankeyFacts, (fact) => fact.donor).forEach((item) => totalValueByNode.set(`donor::${item.label}`, item[measure]));
    aggregateFacts(sankeyFacts, (fact) => fact.agency).forEach((item) => totalValueByNode.set(`agency::${item.label}`, item[measure]));
    aggregateFacts(sankeyFacts, (fact) => fact.recipient).forEach((item) => totalValueByNode.set(`recipient::${item.label}`, item[measure]));
    const nodes = sankeyData.nodes.map((node, index) => ({
      ...node,
      visibleValue: visibleValueByNode.get(node.id) ?? 0,
      totalValue: totalValueByNode.get(node.id) ?? 0,
      color:
        node.role === 'donor'
          ? DONOR_COLORS[index % DONOR_COLORS.length]
          : node.role === 'agency'
            ? AGENCY_COLOR
            : RECIPIENT_COLOR,
    }));
    const links = sankeyData.links.map((link) => ({
      ...link,
      color: nodes[link.source]?.color ?? DONOR_COLORS[0],
    }));
    return { ...sankeyData, nodes, links };
  }, [sankeyData]);
  const topDonors = useMemo(() => aggregateFacts(sankeyFacts, (fact) => fact.donor).slice(0, 12), [sankeyFacts]);
  const topAgencies = useMemo(() => aggregateFacts(sankeyFacts, (fact) => fact.agency).slice(0, 12), [sankeyFacts]);
  const topRecipients = useMemo(() => aggregateFacts(sankeyFacts, (fact) => fact.recipient).slice(0, 12), [sankeyFacts]);
  const flowTypes = useMemo(() => aggregateFacts(flowFacts, (fact) => fact.flow).slice(0, 8), [flowFacts]);
  const donorAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topDonors.map((item) => item.label), { maxChars: 18, minWidth: 180, maxWidth: 246 }),
    [topDonors],
  );
  const agencyAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topAgencies.map((item) => item.label), { maxChars: 18, minWidth: 180, maxWidth: 246 }),
    [topAgencies],
  );
  const recipientAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topRecipients.map((item) => item.label), { maxChars: 18, minWidth: 180, maxWidth: 246 }),
    [topRecipients],
  );

  const activeSelectionLabel = selectedDonor ?? selectedAgency ?? selectedRecipient;
  const activeSelectionType = selectedDonor ? 'donor' : selectedAgency ? 'agency' : selectedRecipient ? 'recipient' : null;

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

  const handleSankeyMouseEnter = (entry: any, type: 'node' | 'link') => {
    setHoveredItem(buildHoverState(entry, type, measure));
  };

  const handleSankeyMouseLeave = () => {
    setHoveredItem(null);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 text-xl font-semibold">Donor-Recipient Flows</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Follow the shape of transport finance from donors into recipient countries and regional recipients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeSelectionLabel ? (
            <button
              onClick={() => {
                setSelectedDonor(null);
                setSelectedAgency(null);
                setSelectedRecipient(null);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
            >
              Clear {activeSelectionType}
            </button>
          ) : null}
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setMeasure('commitment')}
              className={`px-3 py-1.5 text-xs rounded-md ${measure === 'commitment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Commitments
            </button>
            <button
              onClick={() => setMeasure('disbursement')}
              className={`px-3 py-1.5 text-xs rounded-md ${measure === 'disbursement' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Disbursements
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Donor to Recipient Flows</p>
          <p className="text-slate-400 text-xs mb-4">
            Sankey view limited to the strongest donor, agency, and recipient pathways in the current filter state. Click a donor, agency, or recipient node to isolate it.
          </p>
        {activeSelectionLabel ? (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 border border-emerald-200">
            Showing only {activeSelectionType}: <span className="font-semibold">{activeSelectionLabel}</span>
          </div>
        ) : null}
        {sankeyData.links.length ? (
          <div className="relative">
            <ResponsiveContainer width="100%" height={460}>
              <Sankey
                data={coloredSankeyData}
                nodePadding={26}
                nodeWidth={14}
                margin={{ top: 18, right: 240, left: 220, bottom: 18 }}
                node={nodeRenderer}
                link={<FlowLink />}
                onMouseEnter={handleSankeyMouseEnter}
                onMouseLeave={handleSankeyMouseLeave}
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
          <div className="h-[460px] rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm text-slate-500">
            No donor-recipient flows are available for the current filters.
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Donors</p>
          <p className="text-slate-400 text-xs mb-4">Top donors in the current filtered country-recipient portfolio</p>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={topDonors} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={donorAxisWidth} interval={0} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={15}>
                {topDonors.map((row) => (
                  <Cell key={row.label} fill="#0F766E" fillOpacity={0.86} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Agencies</p>
          <p className="text-slate-400 text-xs mb-4">Top agencies in the current filtered country-recipient portfolio</p>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={topAgencies} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={agencyAxisWidth} interval={0} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={15}>
                {topAgencies.map((row) => (
                  <Cell key={row.label} fill={AGENCY_COLOR} fillOpacity={0.86} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Recipient Countries</p>
          <p className="text-slate-400 text-xs mb-4">Top recipient countries in the current filtered portfolio</p>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={topRecipients} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={recipientAxisWidth} interval={0} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={15}>
                {topRecipients.map((row) => (
                  <Cell key={row.label} fill="#059669" fillOpacity={0.86} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <p className="text-slate-800 text-sm font-semibold mb-1">Financing Instrument Mix</p>
        <p className="text-slate-400 text-xs mb-4">How the filtered transport portfolio is delivered</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={flowTypes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={<WrappedAxisTick maxChars={12} />} tickLine={false} axisLine={false} height={78} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
            <Bar dataKey={measure} radius={[6, 6, 0, 0]}>
              {flowTypes.map((row) => (
                <Cell key={row.label} fill="#10B981" fillOpacity={0.84} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
