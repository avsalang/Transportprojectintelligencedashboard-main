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
  Label,
} from 'recharts';
import { estimateCategoryAxisWidth, TruncatedCategoryTick, WrappedAxisTick } from '../components/ChartTicks';
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
    () => estimateCategoryAxisWidth(topDonors.map((item) => item.label), { maxChars: 22, minWidth: 190, maxWidth: 250 }),
    [topDonors],
  );
  const agencyAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topAgencies.map((item) => item.label), { maxChars: 22, minWidth: 200, maxWidth: 260 }),
    [topAgencies],
  );
  const recipientAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topRecipients.map((item) => item.label), { maxChars: 22, minWidth: 190, maxWidth: 250 }),
    [topRecipients],
  );
  const donorChartHeight = useMemo(() => Math.max(310, topDonors.length * 30 + 40), [topDonors.length]);
  const agencyChartHeight = useMemo(() => Math.max(310, topAgencies.length * 30 + 40), [topAgencies.length]);
  const recipientChartHeight = useMemo(() => Math.max(310, topRecipients.length * 30 + 40), [topRecipients.length]);

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
    <div className="p-8 bg-[#F9F9F9] min-h-screen font-opensans">
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-[#002147] text-3xl font-black tracking-tighter uppercase font-lato">Donor-Recipient Flows</h1>
            <p className="text-[#6B7280] text-[13px] mt-2 font-semibold">
              Follow the shape of transport finance from donor institutions into recipient economies and regional programs.
            </p>
          </div>
        <div className="flex items-center gap-4">
          {activeSelectionLabel ? (
            <button
              onClick={() => {
                setSelectedDonor(null);
                setSelectedAgency(null);
                setSelectedRecipient(null);
              }}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#E5E7EB] bg-white text-[#64748B] hover:text-[#002147] shadow-sm transition-all"
            >
              Clear {activeSelectionType} Isolate
            </button>
          ) : null}
          <div className="inline-flex rounded-lg bg-white p-1 border border-[#E5E7EB] shadow-sm">
            <button
              onClick={() => setMeasure('commitment')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${measure === 'commitment' ? 'bg-[#002147] text-white shadow-md' : 'text-[#94A3B8] hover:text-[#002147]'}`}
            >
              Commitments
            </button>
            <button
              onClick={() => setMeasure('disbursement')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${measure === 'disbursement' ? 'bg-[#002147] text-white shadow-md' : 'text-[#94A3B8] hover:text-[#002147]'}`}
            >
              Disbursements
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-10">
          <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Institutional Flow Topology</p>
          <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">
            Follow the path from funder to implementing agency to recipient economy
          </p>
        {activeSelectionLabel ? (
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-[#00ADEF]/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#00ADEF] border border-[#00ADEF]/20 shadow-sm">
            Isolated {activeSelectionType}: <span className="text-[#002147] underline decoration-[#00ADEF] decoration-2 underline-offset-4">{activeSelectionLabel}</span>
          </div>
        ) : null}
        {sankeyData.links.length ? (
          <div className="relative">
            <ResponsiveContainer width="100%" height={500}>
              <Sankey
                data={coloredSankeyData}
                nodePadding={30}
                nodeWidth={16}
                margin={{ top: 20, right: 280, left: 240, bottom: 20 }}
                node={nodeRenderer}
                link={<FlowLink />}
                onMouseEnter={handleSankeyMouseEnter}
                onMouseLeave={handleSankeyMouseLeave}
              />
            </ResponsiveContainer>
            {hoveredItem ? (
              <div
                className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-2xl scale-110 transition-transform"
                style={{ left: Math.min(hoveredItem.x + 16, 900), top: hoveredItem.y }}
              >
                <div className="text-[11px] font-black text-[#002147] uppercase tracking-widest font-lato">{hoveredItem.title}</div>
                <div className="mt-2 text-lg font-black text-[#00ADEF] tabular-nums font-lato">{hoveredItem.value}</div>
                <div className="mt-0.5 text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">{hoveredItem.subtitle}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="h-[460px] rounded-xl bg-[#F9F9F9] border border-[#E5E7EB] flex flex-col items-center justify-center gap-4">
             <div className="w-12 h-12 rounded-full border-4 border-white border-t-[#00ADEF] animate-spin" />
             <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Awaiting Institutional Context...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
          <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top Donors</p>
          <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">Funding source distribution</p>
          <ResponsiveContainer width="100%" height={donorChartHeight}>
            <BarChart data={topDonors} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 20 }} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<TruncatedCategoryTick maxChars={22} fontSize={9} fontWeight={900} fill="#64748B" />} tickLine={false} axisLine={false} width={donorAxisWidth} interval={0} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 4, 4, 0]} maxBarSize={15}>
                {topDonors.map((row) => (
                  <Cell key={row.label} fill="#4E79A7" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
          <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top Agencies</p>
          <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">Implementing departments</p>
          <ResponsiveContainer width="100%" height={agencyChartHeight}>
            <BarChart data={topAgencies} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 20 }} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<TruncatedCategoryTick maxChars={22} fontSize={9} fontWeight={900} fill="#64748B" />} tickLine={false} axisLine={false} width={agencyAxisWidth} interval={0} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 4, 4, 0]} maxBarSize={15}>
                {topAgencies.map((row) => (
                  <Cell key={row.label} fill="#00ADEF" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
          <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top economies</p>
          <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">Final portfolio destination</p>
          <ResponsiveContainer width="100%" height={recipientChartHeight}>
            <BarChart data={topRecipients} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 20 }} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<TruncatedCategoryTick maxChars={22} fontSize={9} fontWeight={900} fill="#64748B" />} tickLine={false} axisLine={false} width={recipientAxisWidth} interval={0} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 4, 4, 0]} maxBarSize={15}>
                {topRecipients.map((row) => (
                  <Cell key={row.label} fill="#59A14F" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
        <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Financing Instrument Mix</p>
        <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">Portfolio delivery modalities</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={flowTypes} margin={{ left: 10, right: 30, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="label" tick={<WrappedAxisTick maxChars={12} fontSize={9} fontWeight={900} fill="#64748B" />} tickLine={false} axisLine={false} height={80} interval={0} />
            <YAxis tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 900 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
            <Bar dataKey={measure} radius={[6, 6, 0, 0]} maxBarSize={40}>
              {flowTypes.map((row) => (
                <Cell key={row.label} fill="#002147" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
  );
}
