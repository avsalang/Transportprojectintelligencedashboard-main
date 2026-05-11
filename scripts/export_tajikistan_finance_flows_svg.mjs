import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const INPUT_CSV = path.join(repoRoot, 'crs_transport_dashboard_ready.csv');
const OUTPUT_DIR = path.join(repoRoot, 'publication_figures');
const OUTPUT_SVG = path.join(OUTPUT_DIR, 'tajikistan_finance_flows.svg');

const RECIPIENT = 'Tajikistan';
const MEASURE = 'usd_commitment_defl';
const YEAR_MIN = 2000;
const YEAR_MAX = 2024;
const FONT_FAMILY = '"Tw Cen MT", "Tw Cen MT Condensed", Arial, sans-serif';
const FONT_SIZE = 14;
const LINE_HEIGHT = 17;
const WIDTH = 1400;
const HEIGHT = 820;

const DONOR_COLORS = ['#0F766E', '#0EA5E9', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#65A30D', '#0891B2'];
const AGENCY_COLOR = '#60A5FA';
const RECIPIENT_COLOR = '#10B981';
const FLOW_TYPE_ORDER = [
  'ODA Grants',
  'ODA Loans',
  'Other Official Flows',
  'Export Credits',
  'Equity Investment',
  'Private Development Finance',
  'Other Flow Types',
];
const FLOW_TYPE_COLORS = {
  'ODA Grants': '#0EA5E9',
  'ODA Loans': '#2563EB',
  'Other Official Flows': '#F59E0B',
  'Export Credits': '#EF4444',
  'Equity Investment': '#10B981',
  'Private Development Finance': '#8B5CF6',
  'Other Flow Types': '#64748B',
};

function parseCsv(text, onRow) {
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    onRow(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ',') {
      pushField();
      continue;
    }
    if (!inQuotes && ch === '\n') {
      pushRow();
      continue;
    }
    if (!inQuotes && ch === '\r') {
      continue;
    }
    field += ch;
  }
  if (field.length || row.length) pushRow();
}

function parseNumber(value) {
  const cleanValue = String(value ?? '').trim();
  if (!cleanValue) return 0;
  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function normalizeFlowType(flow) {
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

function flowColor(flow) {
  return FLOW_TYPE_COLORS[normalizeFlowType(flow)] ?? FLOW_TYPE_COLORS['Other Flow Types'];
}

function aggregate(facts, keyFn) {
  const grouped = new Map();
  for (const fact of facts) {
    const key = keyFn(fact) || 'Unknown';
    grouped.set(key, (grouped.get(key) ?? 0) + fact.value);
  }
  return [...grouped.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function buildSankeyData(facts) {
  const MIN_VISIBLE_FLOW_VALUE = 0.05;
  const donorLimit = 10;
  const agencyLimit = 10;

  const donorTotals = aggregate(facts, (fact) => fact.donor).slice(0, donorLimit);
  const recipientTotals = [{ label: RECIPIENT, value: facts.reduce((sum, fact) => sum + fact.value, 0) }];
  const donorSet = new Set(donorTotals.map((item) => item.label));
  const recipientSet = new Set([RECIPIENT]);

  const normalizeDonor = (donor) => (donorSet.has(donor) ? donor : 'Other donors');
  const normalizeRecipient = (recipient) => (recipientSet.has(recipient) ? recipient : 'Other recipients');

  const tripletTotals = aggregate(
    facts,
    (fact) => `${normalizeDonor(fact.donor)}|||${fact.agency}|||${normalizeRecipient(fact.recipient)}`,
  );
  const selectedTriplets = new Set(
    tripletTotals
      .filter((item) => item.value >= MIN_VISIBLE_FLOW_VALUE)
      .map((item) => item.label),
  );

  const shortlistedFacts = facts.filter((fact) =>
    selectedTriplets.has(`${normalizeDonor(fact.donor)}|||${fact.agency}|||${normalizeRecipient(fact.recipient)}`),
  );
  const agencyTotals = aggregate(shortlistedFacts, (fact) => fact.agency).slice(0, agencyLimit);
  const agencySet = new Set(agencyTotals.map((item) => item.label));
  const normalizeAgency = (agency) => (agencySet.has(agency) ? agency : 'Other agencies');

  const donorAgencyLinkMap = new Map();
  const agencyRecipientLinkMap = new Map();
  for (const fact of shortlistedFacts) {
    const donor = normalizeDonor(fact.donor);
    const agency = normalizeAgency(fact.agency);
    const recipient = normalizeRecipient(fact.recipient);
    const donorAgencyKey = `${donor}|||${agency}`;
    const agencyRecipientKey = `${agency}|||${recipient}|||${normalizeFlowType(fact.flow)}`;
    donorAgencyLinkMap.set(donorAgencyKey, (donorAgencyLinkMap.get(donorAgencyKey) ?? 0) + fact.value);
    agencyRecipientLinkMap.set(agencyRecipientKey, (agencyRecipientLinkMap.get(agencyRecipientKey) ?? 0) + fact.value);
  }

  const donorAgencyLinks = [...donorAgencyLinkMap.entries()]
    .map(([key, value]) => {
      const [donor, agency] = key.split('|||');
      return {
        sourceId: `donor::${donor}`,
        targetId: `agency::${agency}`,
        sourceName: donor,
        targetName: agency,
        value,
      };
    })
    .filter((link) => link.value >= MIN_VISIBLE_FLOW_VALUE);

  const agencyRecipientLinks = [...agencyRecipientLinkMap.entries()]
    .map(([key, value]) => {
      const [agency, recipient, flowType] = key.split('|||');
      return {
        sourceId: `agency::${agency}`,
        targetId: `recipient::${recipient}`,
        sourceName: agency,
        targetName: recipient,
        flowType,
        value,
      };
    })
    .filter((link) => link.value >= MIN_VISIBLE_FLOW_VALUE);

  const allLinks = [...donorAgencyLinks, ...agencyRecipientLinks];
  const activeDonors = new Set(donorAgencyLinks.map((link) => link.sourceName));
  const activeAgencies = new Set([
    ...donorAgencyLinks.map((link) => link.targetName),
    ...agencyRecipientLinks.map((link) => link.sourceName),
  ]);
  const activeRecipients = new Set(agencyRecipientLinks.map((link) => link.targetName));

  const donorLabels = [
    ...donorTotals.map((item) => item.label).filter((label) => activeDonors.has(label)),
    ...(activeDonors.has('Other donors') ? ['Other donors'] : []),
  ];
  const agencyLabels = [
    ...agencyTotals.map((item) => item.label).filter((label) => activeAgencies.has(label)),
    ...(activeAgencies.has('Other agencies') ? ['Other agencies'] : []),
  ];
  const recipientLabels = recipientTotals.map((item) => item.label).filter((label) => activeRecipients.has(label));

  const visibleValue = (role, label) => {
    const nodeId = `${role}::${label}`;
    const outgoing = allLinks.filter((link) => link.sourceId === nodeId).reduce((sum, link) => sum + link.value, 0);
    const incoming = allLinks.filter((link) => link.targetId === nodeId).reduce((sum, link) => sum + link.value, 0);
    return Math.max(outgoing, incoming);
  };

  const nodes = [
    ...donorLabels.map((label, index) => ({
      id: `donor::${label}`,
      name: label,
      role: 'donor',
      value: visibleValue('donor', label),
      color: DONOR_COLORS[index % DONOR_COLORS.length],
    })),
    ...agencyLabels.map((label) => ({
      id: `agency::${label}`,
      name: label,
      role: 'agency',
      value: visibleValue('agency', label),
      color: AGENCY_COLOR,
    })),
    ...recipientLabels.map((label) => ({
      id: `recipient::${label}`,
      name: label,
      role: 'recipient',
      value: visibleValue('recipient', label),
      color: RECIPIENT_COLOR,
    })),
  ];

  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
  const links = allLinks
    .filter((link) => nodeIndex.has(link.sourceId) && nodeIndex.has(link.targetId))
    .map((link) => ({
      source: link.sourceId,
      target: link.targetId,
      sourceName: link.sourceName,
      targetName: link.targetName,
      flowType: link.flowType,
      value: link.value,
      color: link.flowType ? flowColor(link.flowType) : nodeIndex.get(link.sourceId).color,
    }))
    .sort((a, b) => b.value - a.value);

  return { nodes, links };
}

function loadFacts() {
  const text = fs.readFileSync(INPUT_CSV, 'utf8');
  let headers = null;
  const facts = [];

  parseCsv(text, (row) => {
    if (!headers) {
      headers = new Map(row.map((header, index) => [cleanText(header), index]));
      return;
    }
    const recipient = cleanText(row[headers.get('recipient_standardized')]);
    const scope = cleanText(row[headers.get('recipient_scope')]);
    const year = parseNumber(row[headers.get('year')]);
    if (recipient !== RECIPIENT || scope !== 'economy') return;
    if (year < YEAR_MIN || year > YEAR_MAX) return;
    const value = parseNumber(row[headers.get(MEASURE)]);
    if (!(value > 0)) return;
    facts.push({
      donor: cleanText(row[headers.get('donor_name_standardized')]) || cleanText(row[headers.get('donor_name')]) || 'Unknown donor',
      agency: cleanText(row[headers.get('agency_name_standardized')]) || cleanText(row[headers.get('agency_name')]) || 'Unknown agency',
      recipient,
      flow: cleanText(row[headers.get('flow_name')]) || 'Other Flow Types',
      value,
    });
  });

  return facts;
}

function formatAmount(value) {
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}B`;
  return `$${value.toFixed(0)}M`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapLabel(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textBlock({ x, y, lines, anchor = 'start', className = '', fill = '#0F172A', weight = 400, halo = true }) {
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? -((lines.length - 1) * LINE_HEIGHT) / 2 : LINE_HEIGHT;
      return `<tspan x="${x.toFixed(1)}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');
  const baseAttrs = `class="${className}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-weight="${weight}"`;
  const haloText = halo
    ? `<text ${baseAttrs} fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linejoin="round">${tspans}</text>`
    : '';
  const foregroundText = `<text ${baseAttrs} fill="${fill}">${tspans}</text>`;
  return `${haloText}${foregroundText}`;
}

function renderSvg(data) {
  const generator = sankey()
    .nodeId((node) => node.id)
    .nodeWidth(16)
    .nodePadding(32)
    .nodeSort(null)
    .extent([
      [360, 62],
      [1050, 700],
    ]);

  const graph = generator({
    nodes: data.nodes.map((node) => ({ ...node })),
    links: data.links.map((link) => ({ ...link })),
  });

  const linkPaths = graph.links
    .slice()
    .sort((a, b) => b.width - a.width)
    .map((link) => {
      const color = link.color;
      return `<path d="${sankeyLinkHorizontal()(link)}" fill="none" stroke="${color}" stroke-width="${Math.max(1, link.width).toFixed(2)}" stroke-opacity="${link.flowType ? 0.58 : 0.50}" stroke-linecap="butt"><title>${escapeXml(`${link.source.name} to ${link.target.name}: ${formatAmount(link.value)}`)}</title></path>`;
    })
    .join('\n');

  const nodeRects = graph.nodes
    .map((node) => `<rect x="${node.x0.toFixed(1)}" y="${node.y0.toFixed(1)}" width="${(node.x1 - node.x0).toFixed(1)}" height="${Math.max(1, node.y1 - node.y0).toFixed(1)}" rx="3" fill="${node.color}" fill-opacity="0.94"><title>${escapeXml(`${node.name}: ${formatAmount(node.value)}`)}</title></rect>`)
    .join('\n');

  const labels = graph.nodes
    .map((node) => {
      const nodeHeight = node.y1 - node.y0;
      const centerY = node.y0 + nodeHeight / 2;
      if (node.role === 'donor') {
        const lines = [...wrapLabel(node.name, 25), formatAmount(node.value)];
        return textBlock({
          x: node.x0 - 12,
          y: centerY,
          lines,
          anchor: 'end',
          fill: '#0F172A',
          weight: 400,
        });
      }
      if (node.role === 'recipient') {
        return textBlock({
          x: node.x1 + 14,
          y: centerY,
          lines: [node.name, formatAmount(node.value)],
          anchor: 'start',
          fill: '#0F172A',
          weight: 400,
        });
      }
      return textBlock({
        x: node.x1 + 8,
        y: centerY,
        lines: wrapLabel(node.name, 24),
        anchor: 'start',
        fill: '#0F172A',
        weight: 400,
      });
    })
    .join('\n');

  const legendItems = FLOW_TYPE_ORDER
    .filter((label) => data.links.some((link) => normalizeFlowType(link.flowType) === label))
    .map((label) => ({ label, color: FLOW_TYPE_COLORS[label] }));
  const legendX = 1010;
  const legendY = 722;
  const legendRows = legendItems
    .map((item, index) => {
      const y = legendY + 26 + index * 20;
      return `<g transform="translate(${legendX}, ${y})"><circle cx="0" cy="-4" r="5" fill="${item.color}"/><text x="13" y="0" fill="#334155">${escapeXml(item.label)}</text></g>`;
    })
    .join('\n');

  const total = graph.nodes.find((node) => node.role === 'recipient')?.value ?? 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">Finance flows to Tajikistan</title>
  <desc id="desc">Sankey diagram showing donor to agency to Tajikistan finance flows, with recipient links colored by flow type.</desc>
  <defs>
    <style>
      text { font-family: ${FONT_FAMILY}; font-size: ${FONT_SIZE}px; letter-spacing: 0; }
      .title { font-size: 12px; font-weight: 700; }
      .subtitle { font-size: 12px; fill: #475569; }
      .note { font-size: 12px; fill: #64748B; }
    </style>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF"/>
  <g aria-label="Sankey links">
${linkPaths}
  </g>
  <g aria-label="Sankey nodes">
${nodeRects}
  </g>
  <g aria-label="Node labels">
${labels}
  </g>
  <g aria-label="Legend">
    <text x="${legendX}" y="${legendY}" class="note" font-weight="700" fill="#334155">Recipient-link colors: flow type</text>
${legendRows}
  </g>
</svg>
`;
}

const facts = loadFacts();
if (!facts.length) {
  throw new Error(`No rows found for ${RECIPIENT}`);
}

const data = buildSankeyData(facts);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_SVG, renderSvg(data), 'utf8');

const recipientTotal = data.nodes.find((node) => node.role === 'recipient')?.value ?? 0;
console.log(`Wrote ${OUTPUT_SVG}`);
console.log(`Rows used: ${facts.length}`);
console.log(`Nodes: ${data.nodes.length}; links: ${data.links.length}; total: ${formatAmount(recipientTotal)}`);
console.log('Donor nodes:');
for (const donor of data.nodes.filter((node) => node.role === 'donor')) {
  console.log(`- ${donor.name}: ${formatAmount(donor.value)}`);
}
