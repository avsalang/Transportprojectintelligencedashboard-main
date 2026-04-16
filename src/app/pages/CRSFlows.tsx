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

function wrapLabel(label: string, maxChars = 18) {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function FlowNode(props: any) {
  const { x, y, width, height, index, payload, onSelect, isDimmed, isActive } = props;
  const isDonor = payload?.role === 'donor';
  const isAgency = payload?.role === 'agency';
  const labelX = isDonor ? x - 12 : isAgency ? x + width + 10 : x + width + 12;
  const anchor = isDonor ? 'end' : 'start';
  const lines = wrapLabel(payload?.name ?? `Node ${index + 1}`, isAgency ? 14 : 18);
  return (
    <g
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
        y={y + height / 2 - ((lines.length - 1) * 6)}
        textAnchor={anchor}
        fontSize={11}
        fill={isDimmed ? '#94A3B8' : '#334155'}
      >
        {lines.map((line, lineIndex) => (
          <tspan key={`${payload?.name}-${lineIndex}`} x={labelX} dy={lineIndex === 0 ? 0 : 13}>
            {line}
          </tspan>
        ))}
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
  return <path d={path} fill={fill} fillOpacity={0.58} stroke="none" />;
}

export function CRSFlows() {
  const { filteredFacts } = useCRSFilters();
  const [measure, setMeasure] = useState<CRSMeasure>('commitment');
  const [selectedDonor, setSelectedDonor] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);

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

  const sankeyData = useMemo(() => buildFlowSankeyData(flowFacts, measure), [flowFacts, measure]);
  const coloredSankeyData = useMemo(() => {
    const nodes = sankeyData.nodes.map((node, index) => ({
      ...node,
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
  const topDonors = useMemo(() => sankeyData.donorLinkTotals.slice(0, 12), [sankeyData]);
  const topAgencies = useMemo(() => sankeyData.agencyLinkTotals.slice(0, 12), [sankeyData]);
  const topRecipients = useMemo(() => sankeyData.recipientLinkTotals.slice(0, 12), [sankeyData]);
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
          <ResponsiveContainer width="100%" height={460}>
            <Sankey
              data={coloredSankeyData}
              nodePadding={26}
              nodeWidth={14}
              margin={{ top: 18, right: 240, left: 220, bottom: 18 }}
              node={nodeRenderer}
              link={<FlowLink />}
            >
              <Tooltip formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
            </Sankey>
          </ResponsiveContainer>
        ) : (
          <div className="h-[460px] rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm text-slate-500">
            No donor-recipient flows are available for the current filters.
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Donors</p>
          <p className="text-slate-400 text-xs mb-4">Visible donor totals represented in the Sankey</p>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={topDonors} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={donorAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={15}>
                {topDonors.map((row) => (
                  <Cell key={row.label} fill="#0F766E" fillOpacity={0.86} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Agencies</p>
          <p className="text-slate-400 text-xs mb-4">Visible agency totals represented in the Sankey</p>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={topAgencies} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={agencyAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={15}>
                {topAgencies.map((row) => (
                  <Cell key={row.label} fill={AGENCY_COLOR} fillOpacity={0.86} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Recipient Countries</p>
          <p className="text-slate-400 text-xs mb-4">Visible recipient totals represented in the Sankey</p>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={topRecipients} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={recipientAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={15}>
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
