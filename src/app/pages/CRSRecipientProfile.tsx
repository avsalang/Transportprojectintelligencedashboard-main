import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { CRSRankingCard } from '../components/CRSRankingCard';
import { CRSFlowPanel } from '../components/CRSFlowPanel';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { CRSPageIntro } from '../components/CRSPageIntro';
import { ProjectRecordsTable, type ProjectRecordTableRecord } from '../components/ProjectRecordsTable';
import { crsFmt } from '../data/crsData';
import { CRSDecadeRecord, CRSDecadeRecordIndex, CRS_DECADE_THEMES } from '../data/crsDecadeData';
import { LOW_CARBON_SCREENER_BY_ECONOMY } from '../data/lowCarbonScreenerData';
import { useCRSPageFilters } from '../context/CRSFilterContext';
import { aggregateFacts, aggregateSustainabilityTags, buildYearModeStack, summarizeFacts } from '../utils/crsAggregations';
import { matchesCRSFilters } from '../utils/crsFiltering';
import { ATO_ECONOMIES } from '../data/atoEconomies';

const MODE_AREA_COLORS = {
  Rail: '#10B981',
  Road: '#2563EB',
  Water: '#8B5CF6',
  Aviation: '#F59E0B',
  Other: '#EC4899',
};

const CURRENCY_AXIS_WIDTH = 76;
const RECIPIENT_LOW_CARBON_TEXT =
  'The scores below provide a country-specific view of low-carbon transport needs, readiness, and financeability. They are intended to support interpretation, comparison, and further discussion rather than serve as a definitive ranking.';

const LOW_CARBON_AXIS_EXPLANATIONS = [
  {
    label: 'Need axis',
    text: 'Higher values indicate greater urgency for transport decarbonisation intervention, including infrastructure gaps, emissions growth pressures, fossil fuel dependence, and wider development needs.',
  },
  {
    label: 'Readiness axis',
    text: 'Higher values indicate stronger policy frameworks, institutional capacity, and transition preparedness to convert ambition into action.',
  },
  {
    label: 'Financeability axis',
    text: 'Higher values indicate more favourable conditions for mobilising, structuring, and absorbing international climate finance.',
  },
];

const LOW_CARBON_PROFILE_LEGEND = [
  {
    color: '#E64B2A',
    text: 'Red indicates a strong pull across all three axes.',
  },
  {
    color: '#F5C400',
    text: 'Yellow marks economies where two pillars show stronger pull.',
  },
  {
    color: '#9EBB1B',
    text: 'Green marks economies where opportunity is concentrated primarily along one axis.',
  },
  {
    color: '#4E9BC3',
    text: 'Blue represents an overall low to moderate focus.',
  },
];

type CRSRecord = CRSDecadeRecord;

function ScreenerRadarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-slate-600">
        Score: <span className="font-medium text-slate-900">{row.score.toFixed(2)}</span> / {row.maxScore.toFixed(2)}
      </p>
    </div>
  );
}

function OldScreenerRadarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-slate-600">
        Score: <span className="font-medium text-slate-900">{row.score.toFixed(1)}</span> / {row.maxScore.toFixed(1)}
      </p>
      <p className="mt-1 text-slate-600">
        Normalised: <span className="font-medium text-slate-900">{row.normalized.toFixed(0)}</span> / 100
      </p>
    </div>
  );
}

function OutwardPolarAngleTick({ x = 0, y = 0, cx = 0, cy = 0, payload }: any) {
  const dx = x - cx;
  const dy = y - cy;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = 28;
  const labelX = x + (dx / length) * offset;
  const labelY = y + (dy / length) * offset;
  const anchor = labelX > cx + 8 ? 'start' : labelX < cx - 8 ? 'end' : 'middle';

  return (
    <text x={labelX} y={labelY} textAnchor={anchor} dominantBaseline="middle" fill="#334155" fontSize={13} fontWeight={600}>
      {payload?.value}
    </text>
  );
}


export function CRSRecipientProfile() {
  const { filteredFacts, filters, setFilters, resetFilters } = useCRSPageFilters();
  const measure = filters.measure;
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [records, setRecords] = useState<CRSRecord[]>([]);

  const profileRecipientGroups = useMemo(() => {
    const economyRecipients = new Set<string>();
    const regionalRecipients = new Set<string>();
    filteredFacts.forEach((fact) => {
      if (!fact.recipient) return;
      if (fact.recipient_scope === 'regional' || fact.recipient.includes(', regional')) {
        regionalRecipients.add(fact.recipient);
      } else {
        economyRecipients.add(fact.recipient);
      }
    });
    return [
      { title: 'ATO Economies', options: [...economyRecipients].sort((a, b) => a.localeCompare(b)) },
      { title: 'Asia Regional Recipients', options: [...regionalRecipients].sort((a, b) => a.localeCompare(b)) },
    ].filter((group) => group.options.length > 0);
  }, [filteredFacts]);

  const profileRecipientOptions = useMemo(
    () => profileRecipientGroups.flatMap((group) => group.options),
    [profileRecipientGroups],
  );

  useEffect(() => {
    if (!profileRecipientOptions.length) return;
    if (!selectedRecipient || !profileRecipientOptions.includes(selectedRecipient)) {
      setSelectedRecipient(profileRecipientOptions[0]);
    }
  }, [profileRecipientOptions, selectedRecipient]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      const indexResponse = await fetch(`${import.meta.env.BASE_URL}data/crs-decade-records/index.json`);
      const index: CRSDecadeRecordIndex = await indexResponse.json();
      const chunks = await Promise.all(
        index.chunks.map(async (chunk) => {
          const response = await fetch(`${import.meta.env.BASE_URL}${chunk.file}`);
          return (await response.json()) as CRSRecord[];
        }),
      );
      if (!cancelled) {
        setRecords(chunks.flat());
      }
    }

    loadRecords().catch((error) => console.error('Failed to load CRS record shards', error));

    return () => {
      cancelled = true;
    };
  }, []);

  const recipientFacts = useMemo(
    () => filteredFacts.filter((fact) => fact.recipient === selectedRecipient),
    [filteredFacts, selectedRecipient],
  );

  const stats = useMemo(() => summarizeFacts(recipientFacts), [recipientFacts]);
  const donorCount = useMemo(() => new Set(recipientFacts.map((fact) => fact.donor)).size, [recipientFacts]);
  const agencyCount = useMemo(() => new Set(recipientFacts.map((fact) => fact.agency)).size, [recipientFacts]);

  const yearlyModeStack = useMemo(() => buildYearModeStack(recipientFacts, measure), [recipientFacts, measure]);
  const donorSeries = useMemo(() => aggregateFacts(recipientFacts, (fact) => fact.donor).slice(0, 10), [recipientFacts]);
  const agencySeries = useMemo(() => aggregateFacts(recipientFacts, (fact) => fact.agency).slice(0, 10), [recipientFacts]);
  const modeSeries = useMemo(() => aggregateFacts(recipientFacts, (fact) => fact.mode).slice(0, 8), [recipientFacts]);
  const sectorSeries = useMemo(() => aggregateSustainabilityTags(recipientFacts), [recipientFacts]);
  const financingSeries = useMemo(() => aggregateFacts(recipientFacts, (fact) => fact.flow).slice(0, 8), [recipientFacts]);
  const lowCarbonScreener = LOW_CARBON_SCREENER_BY_ECONOMY[selectedRecipient];
  const measureLabel = measure.includes('commitment') ? 'commitments' : 'disbursements';
  const activeFinanceLabel = measure.includes('commitment') ? 'Commitments' : 'Disbursements';
  const recordThemeLabels = (record: CRSRecord) =>
    CRS_DECADE_THEMES.filter((theme) => record[theme.id]).map((theme) => theme.label);

  const profileRecords = useMemo(
    () => records.filter((record) => matchesCRSFilters(record, filters, ATO_ECONOMIES) && record.recipient === selectedRecipient),
    [filters, records, selectedRecipient],
  );
  const recipientProjectRecordRows = useMemo<ProjectRecordTableRecord[]>(
    () => profileRecords.map((record) => {
      const description = record.long_description || record.short_description || record.purpose || '';
      return {
        id: String(record.row_number),
        rowNumber: record.row_number,
        year: record.year,
        title: record.title,
        description,
        donor: record.donor,
        agency: record.agency,
        recipient: record.recipient,
        mode: record.mode,
        flow: record.flow,
        amount: Number(record[measure] ?? 0),
        commitment: record.commitment,
        disbursement: record.disbursement,
        commitment_defl: record.commitment_defl,
        disbursement_defl: record.disbursement_defl,
        themes: recordThemeLabels(record).map((label) => ({ label })),
        markers: [
          ['Mitigation', record.climate_mitigation],
          ['Adaptation', record.climate_adaptation],
          ['Gender', record.gender],
          ['DRR', record.drr],
          ['Biodiversity', record.biodiversity],
          ['Environment', record.environment],
        ]
          .filter(([, value]) => Number(value) > 0)
          .map(([label]) => ({ label: String(label), color: '#059669' })),
        searchText: [
          record.title,
          record.purpose,
          record.short_description,
          record.long_description,
          record.donor,
          record.agency,
          record.recipient,
          record.mode,
          record.mode_detail,
          record.flow,
          record.year,
          recordThemeLabels(record).join(' '),
        ].filter(Boolean).join(' '),
      };
    }),
    [measure, profileRecords],
  );

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <CRSPageIntro
          title="Recipient Profile"
          aside={(
            <div className="w-full">
              <label className="block text-[14px] text-slate-400 ml-1 mb-2">Recipient</label>
              <select
                value={selectedRecipient}
                onChange={(event) => setSelectedRecipient(event.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {profileRecipientGroups.map((group) => (
                  <optgroup key={group.title} label={group.title}>
                    {group.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        >
          <p>
            The Recipient Profile page provides a country-focused view of transport-related development financing. It allows users to examine how much support each recipient economy receives, which development partners are involved, which transport subsectors are being financed, and how support has changed over time. The page helps identify major financing sources, priority areas, and financing patterns for each economy, supporting a clearer understanding of how transport finance is distributed and where future support may be needed.
          </p>
        </CRSPageIntro>

        <CRSPageFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          enabled={['year', 'donor', 'mode', 'sector', 'basis']}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard label={activeFinanceLabel} value={crsFmt.usdM(stats[measure] ?? 0)} />
          <KPICard label="Donors" value={crsFmt.num(donorCount)} />
          <KPICard label="Agencies" value={crsFmt.num(agencyCount)} />
          <KPICard label="Records" value={crsFmt.num(stats.count)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-slate-900 text-lg tracking-tight">Development Finance over Time</h2>
            <p className="text-slate-500 text-[14px] mt-1 mb-4">
              Yearly {measureLabel} received by the selected recipient by transport mode, constant 2024 USD.
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyModeStack} margin={{ top: 8, right: 10, left: 8, bottom: 0 }} barCategoryGap="8%">
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => crsFmt.usdM(value)} />
                  <Tooltip formatter={(value: number, name: string) => [crsFmt.usdM(value), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Rail" stackId="modes" fill={MODE_AREA_COLORS.Rail} maxBarSize={28} />
                  <Bar dataKey="Road" stackId="modes" fill={MODE_AREA_COLORS.Road} maxBarSize={28} />
                  <Bar dataKey="Water" stackId="modes" fill={MODE_AREA_COLORS.Water} maxBarSize={28} />
                  <Bar dataKey="Aviation" stackId="modes" fill={MODE_AREA_COLORS.Aviation} maxBarSize={28} />
                  <Bar dataKey="Other" stackId="modes" fill={MODE_AREA_COLORS.Other} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <CRSRankingCard
            title="Top Donors"
            subtitle="Largest donors in the selected recipient's selection."
            data={donorSeries}
            measure={measure}
            color="#0F766E"
            maxChars={24}
          />
        </div>

        <CRSFlowPanel
          facts={recipientFacts}
          measure={measure}
          title="Finance Flows"
          subtitle="Donor to agency to recipient pathways for the selected recipient."
          sankeyOptions={{ focusedDonorLimit: 10, focusedAgencyLimit: 10, groupOtherNodes: true }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CRSRankingCard
            title="Top Agencies"
            subtitle="Most used agencies and financing channels."
            data={agencySeries}
            measure={measure}
            color="#60A5FA"
            maxChars={24}
          />
          <CRSRankingCard
            title="Transport Modes"
            subtitle="Transport modes in the selected recipient's selection."
            data={modeSeries}
            measure={measure}
            color="#8B5CF6"
            maxChars={24}
          />
          <CRSRankingCard
            title="Sustainability-related Tags"
            subtitle="Mitigation, adaptation, gender, DRR, biodiversity, and environment sustainability-related tags."
            data={sectorSeries}
            measure={measure}
            color="#F59E0B"
            maxChars={24}
            footnote="Pre-defined tags based on the OECD CRS database."
          />
          <CRSRankingCard
            title="Finance Flow Types"
            subtitle="Finance flow type by which development finance is provided."
            data={financingSeries}
            measure={measure}
            color="#334155"
            maxChars={24}
          />
        </div>

        {lowCarbonScreener ? (
          <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
            <div className="mb-4 border-b border-sky-100 pb-4">
              <p className="text-base font-semibold text-slate-900">Low-Carbon Transport Needs, Opportunity and Readiness Assessment</p>
              <p className="mt-2 w-full text-sm leading-6 text-slate-600 sm:text-justify">{RECIPIENT_LOW_CARBON_TEXT}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Need, Readiness, and Financeability Axes</p>
                    <p className="mt-1 text-xs text-slate-400">Radar values are normalised from 0.00 to 1.00.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: lowCarbonScreener.profileColor }} />
                      <span className="text-sm font-medium text-slate-800">{lowCarbonScreener.profileLabel}</span>
                    </div>
                    <div className="whitespace-nowrap text-sm text-slate-500">
                      <span className="font-semibold tabular-nums text-slate-900">{lowCarbonScreener.newScore.toFixed(2)}</span>
                      <span className="ml-1">average; rank {lowCarbonScreener.newRank} of {Object.keys(LOW_CARBON_SCREENER_BY_ECONOMY).length}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={360}>
                    <RadarChart data={lowCarbonScreener.newDimensions} outerRadius={112}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="shortLabel" tick={<OutwardPolarAngleTick />} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 1]}
                        tick={{ fill: '#94A3B8', fontSize: 10 }}
                        tickCount={6}
                        tickFormatter={(value: number) => value.toFixed(2)}
                      />
                      <Tooltip content={<ScreenerRadarTooltip />} />
                      <Radar
                        name="Screener"
                        dataKey="score"
                        stroke={lowCarbonScreener.profileColor}
                        fill={lowCarbonScreener.profileColor}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Detailed 9-Dimension Profile</p>
                    <p className="mt-1 text-xs text-slate-400">More detailed spider chart; values normalised from 0 to 100.</p>
                  </div>
                  <div className="whitespace-nowrap text-sm text-slate-500">
                    <span className="font-semibold tabular-nums text-slate-900">{lowCarbonScreener.oldScore.toFixed(1)}</span>
                    <span className="ml-1">score; rank {lowCarbonScreener.oldRank} of {Object.keys(LOW_CARBON_SCREENER_BY_ECONOMY).length}</span>
                  </div>
                </div>
                <div className="mt-5">
                  <ResponsiveContainer width="100%" height={360}>
                    <RadarChart data={lowCarbonScreener.oldDimensions} outerRadius={96}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="shortLabel" tick={<OutwardPolarAngleTick />} />
                      <PolarRadiusAxis
                        angle={78}
                        domain={[0, 100]}
                        tick={{ fill: '#94A3B8', fontSize: 10 }}
                        tickCount={6}
                        tickFormatter={(value: number) => value.toFixed(0)}
                      />
                      <Tooltip content={<OldScreenerRadarTooltip />} />
                      <Radar
                        name="Detailed Screener"
                        dataKey="normalized"
                        stroke="#2563EB"
                        fill="#2563EB"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {LOW_CARBON_AXIS_EXPLANATIONS.map((item) => (
                  <div key={item.label}>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm leading-6 text-slate-600">
                  Countries with broad and balanced profiles across all three pillars may represent strong opportunities for integrated D2D engagement and are marked in the profile color legend below. Countries with uneven profiles can be equally important because they help identify where targeted interventions such as policy reform, capacity building, or financial structuring may deliver the greatest marginal impact.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {LOW_CARBON_PROFILE_LEGEND.map((item) => (
                    <div key={item.color} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                      <span className="mt-1 h-3 w-8 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <ProjectRecordsTable
          records={recipientProjectRecordRows}
          columns={['year', 'record', 'donor', 'agency', 'mode', 'flow', 'themes', 'amount']}
          subtitle="Records for the selected recipient. Recipient is fixed by the profile selection."
          emptyMessage="No project records match the current recipient filters and search."
          minWidthClass="min-w-[1180px]"
        />
      </div>
    </div>
  );
}
