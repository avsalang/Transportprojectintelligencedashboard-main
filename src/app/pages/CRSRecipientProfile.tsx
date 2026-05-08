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
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { CRSRankingCard } from '../components/CRSRankingCard';
import { CRSFlowPanel } from '../components/CRSFlowPanel';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { CRSPageIntro } from '../components/CRSPageIntro';
import { Sheet, SheetContent } from '../components/ui/sheet';
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
  'The scores below provide a country-specific view of low-carbon transport opportunities based on three dimensions: needs, financeability, and readiness. Together, these scores offer additional insight into the extent to which low-carbon transport support may be needed, financeable, and ready for implementation in the selected economy. The assessment is based on available information across 50 indicators and is intended to support interpretation, comparison, and further discussion rather than serve as a definitive ranking.';

type CRSRecord = CRSDecadeRecord;

type RecipientRecordSortKey = 'year' | 'record' | 'donor' | 'agency' | 'mode' | 'amount';
type SortDirection = 'asc' | 'desc';
type RecipientRecordColumnFilters = Record<RecipientRecordSortKey, string>;

const RECIPIENT_RECORD_COLUMNS: Array<{ key: RecipientRecordSortKey; label: string; align?: 'right' }> = [
  { key: 'year', label: 'Year' },
  { key: 'record', label: 'Record' },
  { key: 'donor', label: 'Donor' },
  { key: 'agency', label: 'Agency' },
  { key: 'mode', label: 'Mode' },
  { key: 'amount', label: 'Amount', align: 'right' },
];

const EMPTY_RECIPIENT_RECORD_COLUMN_FILTERS: RecipientRecordColumnFilters = {
  year: '',
  record: '',
  donor: '',
  agency: '',
  mode: '',
  amount: '',
};

const RECIPIENT_RECORD_DROPDOWN_FILTER_KEYS = ['year', 'donor', 'agency', 'mode'] as const;
type RecipientRecordDropdownFilterKey = typeof RECIPIENT_RECORD_DROPDOWN_FILTER_KEYS[number];

function isRecipientRecordDropdownFilter(key: RecipientRecordSortKey): key is RecipientRecordDropdownFilterKey {
  return (RECIPIENT_RECORD_DROPDOWN_FILTER_KEYS as readonly RecipientRecordSortKey[]).includes(key);
}

function ThemeFlag({ active, label }: { active: number; label: string }) {
  return (
    <div className={`px-2 py-1 rounded-lg text-[11px] border ${active > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
      {label}
    </div>
  );
}

function ATOThemeChip({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
      {label}
    </span>
  );
}

function ScreenerRadarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-slate-600">
        Score: <span className="font-medium text-slate-900">{row.score.toFixed(1)}</span> / {row.maxScore.toFixed(1)}
      </p>
      <p className="mt-0.5 text-slate-500">{row.normalized.toFixed(1)}% of dimension maximum</p>
    </div>
  );
}

function OutwardPolarAngleTick({ x = 0, y = 0, cx = 0, cy = 0, payload }: any) {
  const dx = x - cx;
  const dy = y - cy;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = 20;
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
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<CRSRecord | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [recordSortKey, setRecordSortKey] = useState<RecipientRecordSortKey>('amount');
  const [recordSortDirection, setRecordSortDirection] = useState<SortDirection>('desc');
  const [recordColumnFilters, setRecordColumnFilters] = useState<RecipientRecordColumnFilters>(EMPTY_RECIPIENT_RECORD_COLUMN_FILTERS);

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

  const recordColumnText = (record: CRSRecord, key: RecipientRecordSortKey) => {
    switch (key) {
      case 'year':
        return String(record.year ?? '');
      case 'record':
        return [record.title, record.description, record.short_description, record.purpose].filter(Boolean).join(' ');
      case 'donor':
        return record.donor;
      case 'agency':
        return record.agency;
      case 'mode':
        return [record.mode, record.mode_detail].filter(Boolean).join(' ');
      case 'amount':
        return String(record[measure] ?? 0);
    }
  };

  const recordSortValue = (record: CRSRecord, key: RecipientRecordSortKey) => {
    if (key === 'year') return record.year ?? 0;
    if (key === 'amount') return record[measure] ?? 0;
    return recordColumnText(record, key).toLowerCase();
  };

  const profileRecords = useMemo(
    () => records.filter((record) => matchesCRSFilters(record, filters, ATO_ECONOMIES) && record.recipient === selectedRecipient),
    [filters, records, selectedRecipient],
  );

  const recordFilterOptions = useMemo<Record<RecipientRecordDropdownFilterKey, string[]>>(() => {
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const years = [...new Set(profileRecords.map((record) => String(record.year ?? '')).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a));

    return {
      year: years,
      donor: unique(profileRecords.map((record) => record.donor)),
      agency: unique(profileRecords.map((record) => record.agency)),
      mode: unique(profileRecords.map((record) => record.mode)),
    };
  }, [profileRecords]);

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const activeColumnFilters = Object.entries(recordColumnFilters)
      .map(([key, value]) => [key as RecipientRecordSortKey, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value.length > 0);
    const result = profileRecords.filter((record) => {
      const matchesSearch = !query || (
        (record.title || '').toLowerCase().includes(query) ||
        (record.description || record.short_description || '').toLowerCase().includes(query) ||
        (record.donor || '').toLowerCase().includes(query) ||
        (record.agency || '').toLowerCase().includes(query) ||
        (record.mode || '').toLowerCase().includes(query) ||
        String(record.year || '').includes(query)
      );
      if (!matchesSearch) return false;
      return activeColumnFilters.every(([key, value]) => recordColumnText(record, key).toLowerCase().includes(value));
    });

    return result.sort((a, b) => {
      const aValue = recordSortValue(a, recordSortKey);
      const bValue = recordSortValue(b, recordSortKey);
      const direction = recordSortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [measure, profileRecords, recordColumnFilters, recordSearch, recordSortDirection, recordSortKey]);

  useEffect(() => {
    setPage(1);
  }, [recordColumnFilters, recordSearch, selectedRecipient]);

  function handleRecordSort(key: RecipientRecordSortKey) {
    if (recordSortKey === key) {
      setRecordSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setRecordSortKey(key);
    setRecordSortDirection(key === 'year' || key === 'amount' ? 'desc' : 'asc');
  }

  function sortIcon(key: RecipientRecordSortKey) {
    if (recordSortKey !== key) {
      return <ChevronUp size={12} className="text-slate-300" />;
    }
    return recordSortDirection === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  }

  const pagedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));

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
          enabled={['year', 'donor', 'agency', 'mode', 'sector', 'basis']}
          recordCount={recipientFacts.length}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard label={activeFinanceLabel} value={crsFmt.usdM(stats[measure] ?? 0)} />
          <KPICard label="Donors" value={crsFmt.num(donorCount)} />
          <KPICard label="Agencies" value={crsFmt.num(agencyCount)} />
          <KPICard label="Project Records" value={crsFmt.num(stats.count)} />
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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Screener Score</p>
                <p className="mt-3 text-4xl font-semibold tabular-nums text-slate-900">{lowCarbonScreener.score.toFixed(1)}</p>
                <p className="mt-1 text-sm text-slate-500">Rank {lowCarbonScreener.rank} of {Object.keys(LOW_CARBON_SCREENER_BY_ECONOMY).length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="mb-1 text-sm font-semibold text-slate-900">Score Breakdown by Dimension</p>
                <p className="mb-4 text-xs text-slate-400">Radar shows each dimension as percent of its maximum score.</p>
                <ResponsiveContainer width="100%" height={360}>
                  <RadarChart data={lowCarbonScreener.dimensions} outerRadius={125}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="shortLabel" tick={<OutwardPolarAngleTick />} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} tickCount={5} />
                    <Tooltip content={<ScreenerRadarTooltip />} />
                    <Radar
                      name="Screener"
                      dataKey="normalized"
                      stroke="#0EA5E9"
                      fill="#0EA5E9"
                      fillOpacity={0.28}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : null}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 text-lg tracking-tight">Project Records</h2>
              <p className="text-slate-500 text-[14px] mt-1">
                Select a project record to view details.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Search size={16} className="text-slate-400" />
                <input
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Search project records"
                  className="bg-transparent border-none focus:ring-0 text-[14px] w-48 placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span>Rows</span>
                <select
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700"
                >
                  {[25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
              {Object.values(recordColumnFilters).some(Boolean) ? (
                <button
                  onClick={() => setRecordColumnFilters(EMPTY_RECIPIENT_RECORD_COLUMN_FILTERS)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Clear column filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/40 text-[12px] text-slate-500 border-b border-slate-200">
                  {RECIPIENT_RECORD_COLUMNS.map((column) => (
                    <th key={column.key} className={`px-6 pt-4 pb-2 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
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
                  {RECIPIENT_RECORD_COLUMNS.map((column) => (
                    <th key={`${column.key}-filter`} className="px-6 pb-3 text-left">
                      {column.key === 'amount' ? (
                        <div className="h-8" aria-hidden="true" />
                      ) : isRecipientRecordDropdownFilter(column.key) ? (
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
                          className={`h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium normal-case tracking-normal text-slate-600 shadow-sm outline-none transition-colors placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                            column.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                      No project records match the current profile and search.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((record) => (
                    <tr
                      key={record.row_number}
                      onClick={() => setActiveRecord(record)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.year}</td>
                      <td className="px-6 py-4">
                        <div className="max-w-[480px]">
                          <p className="text-[14px] font-medium text-slate-900 line-clamp-1">{record.title}</p>
                          <p className="text-[13px] text-slate-500 line-clamp-2 mt-1">
                            {record.description || record.short_description || 'No description available.'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.donor}</td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.agency}</td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.mode}</td>
                      <td className="px-6 py-4 text-right text-[14px] font-medium text-slate-900">
                        {crsFmt.usdM(record[measure] || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Sheet open={!!activeRecord} onOpenChange={() => setActiveRecord(null)}>
          <SheetContent className="sm:max-w-2xl border-l border-slate-200 bg-white/95 backdrop-blur-xl p-0 shadow-2xl">
            {activeRecord && (
              <div className="h-full flex flex-col">
                <div className="bg-slate-900 p-10 text-white">
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-[12px] font-semibold">
                    Record detail
                  </span>
                  <h2 className="text-2xl text-white font-bold leading-tight mt-6 tracking-tight">{activeRecord.title}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <KPICard label="Commitment" value={crsFmt.usdM(activeRecord.commitment)} />
                    <KPICard label="Disbursement" value={crsFmt.usdM(activeRecord.disbursement)} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">Donor</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.donor}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">Agency</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.agency}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">Recipient</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.recipient}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">Flow</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.flow}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">Mode</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.mode}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-slate-500">Year</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.year}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-3">ATO thematic tags</p>
                    <div className="flex flex-wrap gap-2">
                      {recordThemeLabels(activeRecord).length
                        ? recordThemeLabels(activeRecord).map((label) => <ATOThemeChip key={label} label={label} />)
                        : <span className="text-[13px] text-slate-400">No thematic tag assigned</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-3">Sustainability-related Tags</p>
                    <div className="flex flex-wrap gap-2">
                      <ThemeFlag active={activeRecord.climate_mitigation} label="Mitigation" />
                      <ThemeFlag active={activeRecord.climate_adaptation} label="Adaptation" />
                      <ThemeFlag active={activeRecord.gender} label="Gender" />
                      <ThemeFlag active={activeRecord.drr} label="DRR" />
                      <ThemeFlag active={activeRecord.biodiversity} label="Biodiversity" />
                      <ThemeFlag active={activeRecord.environment} label="Environment" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-3">Description</p>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {activeRecord.description || activeRecord.short_description || 'Detailed descriptive metadata not available for this record.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
