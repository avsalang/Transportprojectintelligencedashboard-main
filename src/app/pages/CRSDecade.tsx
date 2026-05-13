import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Customized,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, Circle } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { CRSPageIntro } from '../components/CRSPageIntro';
import { ProjectRecordsTable, type ProjectRecordTableRecord } from '../components/ProjectRecordsTable';
import { crsFmt } from '../data/crsData';
import { CRSDecadeRecord, CRSDecadeRecordIndex, CRSDecadeThemeId, CRS_DECADE_THEMES } from '../data/crsDecadeData';
import { useCRSPageFilters } from '../context/CRSFilterContext';
import {
  aggregateByTheme,
  buildDonorThemePortfolio,
  buildModeThemeMatrix,
  buildThemeTrend,
  buildTopThemeByRecipient,
  matchesDecadeFilters,
  summarizeDecadeRecords,
} from '../utils/crsDecadeAggregations';

const THEME_COLORS: Record<CRSDecadeThemeId, string> = {
  access_for_all: '#0EA5E9',
  low_zero_carbon_resilient_environment: '#10B981',
  connectivity_logistics_efficiency: '#F59E0B',
  urban_mobility_liveable_cities: '#8B5CF6',
  safe_and_secure: '#EF4444',
  science_technology_innovation: '#14B8A6',
};

const CURRENCY_AXIS_WIDTH = 76;

function DonorPortfolioDividers({ yAxisMap, offset, data }: any) {
  const yAxis = yAxisMap ? (Object.values(yAxisMap)[0] as any) : null;
  const scale = yAxis?.scale;
  if (!scale || !offset || !data?.length) return null;

  const positions = data
    .map((row: any) => scale(row.donor))
    .filter((value: number) => Number.isFinite(value))
    .sort((a: number, b: number) => a - b);
  const x1 = offset.left;
  const x2 = offset.left + offset.width;

  return (
    <g aria-hidden="true">
      {positions.slice(0, -1).map((position: number, index: number) => {
        const next = positions[index + 1];
        const y = position + (next - position) / 2;
        return (
          <line
            key={`donor-divider-${index}`}
            x1={x1}
            x2={x2}
            y1={y}
            y2={y}
            stroke="#CBD5E1"
            strokeOpacity={0.9}
          />
        );
      })}
    </g>
  );
}

function themeColor(label: string) {
  const theme = CRS_DECADE_THEMES.find((item) => item.label === label);
  return theme ? THEME_COLORS[theme.id] : '#64748B';
}

function StackedTooltip({ active, payload, label, measureLabel }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((item: any) => Number(item.value) > 0);
  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-2 text-[13px] font-semibold text-slate-900">{label}</p>
      <div className="space-y-1.5">
        {rows.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[12px]">
            <span className="max-w-[240px] truncate" style={{ color: item.color }}>
              {item.dataKey}
            </span>
            <span className="font-medium text-slate-700">{crsFmt.usdM(Number(item.value))}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-400">{measureLabel}</p>
    </div>
  );
}

function SingleValueTooltip({ active, payload, label, measureLabel }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-[13px] font-semibold text-slate-900">{label}</p>
      <p className="text-[12px]" style={{ color: item.color || item.fill }}>
        {label}: <span className="font-medium">{crsFmt.usdM(Number(item.value))}</span>
      </p>
      <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-400">{measureLabel}</p>
    </div>
  );
}

export function CRSDecade() {
  const { filters, setFilters, resetFilters } = useCRSPageFilters();
  const [selectedThemes, setSelectedThemes] = useState<CRSDecadeThemeId[]>([]);
  const [records, setRecords] = useState<CRSDecadeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const measure = filters.measure;

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setIsLoading(true);
      const indexResponse = await fetch(`${import.meta.env.BASE_URL}data/crs-decade-records/index.json`);
      const index: CRSDecadeRecordIndex = await indexResponse.json();
      const chunks = await Promise.all(
        index.chunks.map(async (chunk) => {
          const response = await fetch(`${import.meta.env.BASE_URL}${chunk.file}`);
          return (await response.json()) as CRSDecadeRecord[];
        }),
      );
      if (!cancelled) {
        setRecords(chunks.flat());
        setIsLoading(false);
      }
    }

    loadRecords().catch((error) => {
      console.error('Failed to load UN Decade CRS records', error);
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = useMemo(
    () => records.filter((record) => matchesDecadeFilters(record, filters, selectedThemes)),
    [filters, records, selectedThemes],
  );

  const visibleThemes = useMemo(
    () => selectedThemes.length
      ? CRS_DECADE_THEMES.filter((theme) => selectedThemes.includes(theme.id))
      : CRS_DECADE_THEMES,
    [selectedThemes],
  );
  const focusAreaLabel = selectedThemes.length === 1
    ? visibleThemes[0]?.label ?? 'selected focus area'
    : selectedThemes.length > 1
      ? 'selected focus areas'
      : 'all focus areas';
  const stats = useMemo(() => summarizeDecadeRecords(filteredRecords, measure), [filteredRecords, measure]);
  const themeSeries = useMemo(() => aggregateByTheme(filteredRecords, selectedThemes), [filteredRecords, selectedThemes]);
  const trend = useMemo(() => buildThemeTrend(filteredRecords, measure, selectedThemes), [filteredRecords, measure, selectedThemes]);
  const modeThemeMatrix = useMemo(() => buildModeThemeMatrix(filteredRecords, measure, selectedThemes), [filteredRecords, measure, selectedThemes]);
  const donorThemePortfolio = useMemo(() => buildDonorThemePortfolio(filteredRecords, measure, 10, selectedThemes), [filteredRecords, measure, selectedThemes]);
  const topRecipients = useMemo(() => buildTopThemeByRecipient(filteredRecords, measure, 5, selectedThemes), [filteredRecords, measure, selectedThemes]);
  const recordThemeLabels = (record: CRSDecadeRecord) =>
    CRS_DECADE_THEMES.filter((theme) => record[theme.id]).map((theme) => theme.label);

  const taggedShare = stats.count > 0 ? (stats.taggedCount / stats.count) * 100 : 0;
  const activeMeasureLabel = measure.includes('commitment') ? 'commitments' : 'disbursements';
  const activeMeasureTitle = measure.includes('commitment') ? 'Commitments' : 'Disbursements';

  function toggleTheme(theme: CRSDecadeThemeId) {
    setSelectedThemes((current) =>
      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme],
    );
  }

  function recordDescription(record: CRSDecadeRecord) {
    return record.long_description || record.short_description || '';
  }

  const decadeProjectRecordRows = useMemo<ProjectRecordTableRecord[]>(
    () => filteredRecords.map((record) => ({
      id: String(record.row_number),
      rowNumber: record.row_number,
      year: record.year,
      title: record.title,
      description: recordDescription(record) || record.purpose || '',
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
      themes: recordThemeLabels(record).map((label) => ({ label, color: themeColor(label) })),
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
    })),
    [filteredRecords, measure],
  );

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <CRSPageIntro
          eyebrow="Analytical screening view"
          title="UN Decade of Sustainable Transport"
          note="Please note that the tagging information presented here is not officially reported under the OECD CRS. It is based on a separate analytical exercise using available database information such as project titles and project descriptions."
        >
          <p>
            This page provides a view of how transport-related development financing aligns with the focus areas of the UN Decade of Sustainable Transport. It allows users to explore projects through key sustainable transport themes, including access, safety, climate action, resilience, inclusion, and system efficiency.
          </p>
        </CRSPageIntro>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[13px] font-semibold text-slate-600">Focus Areas</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedThemes([])}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all ${
                selectedThemes.length === 0
                  ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {selectedThemes.length === 0 ? <Check size={14} /> : <Circle size={10} />}
              All focus areas
            </button>
            {CRS_DECADE_THEMES.map((theme) => {
              const active = selectedThemes.includes(theme.id);
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => toggleTheme(theme.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all ${
                    active
                      ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  {active ? <Check size={14} /> : <Circle size={10} />}
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        <CRSPageFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          enabled={['year', 'donor', 'recipient', 'mode', 'sector', 'basis']}
        />

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard label="Screened Records" value={isLoading ? 'Loading...' : crsFmt.num(stats.count)} sub="CRS transaction lines in view" />
          <KPICard
            label="Records"
            value={crsFmt.num(stats.taggedCount)}
            sub={
              selectedThemes.length
                ? `Related to selected focus ${selectedThemes.length === 1 ? 'area' : 'areas'}`
                : `${taggedShare.toFixed(1)}% with at least one focus area`
            }
          />
          <KPICard label="Value" value={crsFmt.usdM(stats.taggedMeasure)} sub={`Tagged ${activeMeasureLabel}, constant 2024 USD`} />
          <KPICard label="Recipients" value={crsFmt.num(stats.recipientCount)} sub="ATO economies and Asia regional recipients" />
          <KPICard label="Donors" value={crsFmt.num(stats.donorCount)} sub="Finance sources in view" />
          <KPICard label="Focus Areas" value={crsFmt.num(visibleThemes.length)} sub={selectedThemes.length ? 'Selected UN Decade themes' : 'UN Decade themes'} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6 xl:items-start">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-slate-900 text-base font-semibold">Theme Overview</h2>
              <p className="text-slate-500 text-[13px] mt-1">
                Total {activeMeasureLabel} tagged to {focusAreaLabel}, constant 2024 USD.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={themeSeries} layout="vertical" margin={{ top: 0, right: 20, left: 42, bottom: 0 }} barCategoryGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={190} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip content={<SingleValueTooltip measureLabel={activeMeasureTitle} />} />
                <Bar dataKey={measure} radius={[0, 6, 6, 0]}>
                  {themeSeries.map((entry) => (
                    <Cell key={entry.label} fill={themeColor(entry.label)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-slate-900 text-base font-semibold">Top Recipients</h2>
              <p className="text-slate-500 text-[13px] mt-1">Largest recipients for {focusAreaLabel}.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {topRecipients.map((row, index) => (
                <div key={row.label} className="px-5 py-3 flex items-center gap-4">
                  <span className="w-7 text-[12px] text-slate-400 tabular-nums">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-900 truncate">{row.label}</p>
                    <p className="text-[12px] text-slate-500 truncate">{row.topTheme}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-slate-900">{crsFmt.usdM(row.value)}</p>
                    <p className="text-[11px] text-slate-400">{row.taggedShare.toFixed(0)}% tagged</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-slate-900 text-base font-semibold">Annual Focus Area Trends</h2>
            <p className="text-slate-500 text-[13px] mt-1">
              Each panel shows annual tagged {activeMeasureLabel} for {focusAreaLabel}, constant 2024 USD.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
            {visibleThemes.map((theme) => (
              <div key={theme.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: THEME_COLORS[theme.id] }} />
                  <h3 className="text-[13px] font-semibold text-slate-800">{theme.label}</h3>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={trend} margin={{ top: 6, right: 8, left: 8, bottom: 0 }} barCategoryGap="10%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<SingleValueTooltip measureLabel={activeMeasureTitle} />} />
                    <Bar
                      dataKey={theme.label}
                      fill={THEME_COLORS[theme.id]}
                      fillOpacity={0.82}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-slate-900 text-base font-semibold">Focus Areas by Transport Mode</h2>
            <p className="text-slate-500 text-[13px] mt-1">
              Clustered columns compare tagged {activeMeasureLabel} across UN Decade focus areas for each transport mode.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={390}>
            <BarChart data={modeThemeMatrix} margin={{ top: 10, right: 18, left: 8, bottom: 0 }} barCategoryGap="12%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="mode" tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
              <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {visibleThemes.map((theme) => (
                <Bar key={theme.id} dataKey={theme.label} fill={THEME_COLORS[theme.id]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-slate-900 text-base font-semibold">Focus Area by Donor</h2>
            <p className="text-slate-500 text-[13px] mt-1">
              Clustered bars compare tagged {activeMeasureLabel} for {focusAreaLabel} across top donors.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={760}>
            <BarChart
              data={donorThemePortfolio}
              layout="vertical"
              margin={{ top: 0, right: 18, left: 72, bottom: 0 }}
              barCategoryGap={16}
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="donor" width={260} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
              <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Customized component={(props: any) => <DonorPortfolioDividers {...props} data={donorThemePortfolio} />} />
              {visibleThemes.map((theme) => (
                <Bar key={theme.id} dataKey={theme.label} fill={THEME_COLORS[theme.id]} radius={[0, 4, 4, 0]} barSize={8} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ProjectRecordsTable
          records={decadeProjectRecordRows}
          columns={[
            'year',
            'record',
            'donor',
            'agency',
            'recipient',
            'mode',
            'flow',
            { key: 'themes', label: 'UN Decade Themes' },
            'amount',
          ]}
          subtitle="Records matching the current UN Decade focus-area and page filters."
          minWidthClass="min-w-[1320px]"
        />
      </div>

    </div>
  );
}
