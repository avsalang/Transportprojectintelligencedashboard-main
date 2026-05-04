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
  Area,
  AreaChart,
} from 'recharts';
import { Check, ChevronDown, ChevronUp, Circle, Search } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
import { CRSDecadeRecord, CRSDecadeRecordIndex, CRSDecadeThemeId, CRS_DECADE_THEMES } from '../data/crsDecadeData';
import { useCRSPageFilters } from '../context/CRSFilterContext';
import {
  aggregateByTheme,
  buildDonorThemePortfolio,
  buildModeThemeMatrix,
  buildThemeTrend,
  buildTopThemeByRecipient,
  getDecadeThemeIds,
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

type RecordSortKey = 'year' | 'record' | 'donor' | 'recipient' | 'mode' | 'themes' | 'amount';
type SortDirection = 'asc' | 'desc';
type RecordColumnFilters = Record<RecordSortKey, string>;

const RECORD_COLUMNS: Array<{ key: RecordSortKey; label: string; align?: 'right' }> = [
  { key: 'year', label: 'Year' },
  { key: 'record', label: 'Record' },
  { key: 'donor', label: 'Donor' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'mode', label: 'Mode' },
  { key: 'themes', label: 'UN Decade Themes' },
  { key: 'amount', label: 'Amount', align: 'right' },
];

const EMPTY_RECORD_COLUMN_FILTERS: RecordColumnFilters = {
  year: '',
  record: '',
  donor: '',
  recipient: '',
  mode: '',
  themes: '',
  amount: '',
};

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
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<CRSDecadeRecord | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [recordSortKey, setRecordSortKey] = useState<RecordSortKey>('amount');
  const [recordSortDirection, setRecordSortDirection] = useState<SortDirection>('desc');
  const [recordColumnFilters, setRecordColumnFilters] = useState<RecordColumnFilters>(EMPTY_RECORD_COLUMN_FILTERS);
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

  const stats = useMemo(() => summarizeDecadeRecords(filteredRecords, measure), [filteredRecords, measure]);
  const themeSeries = useMemo(() => aggregateByTheme(filteredRecords), [filteredRecords]);
  const trend = useMemo(() => buildThemeTrend(filteredRecords, measure), [filteredRecords, measure]);
  const modeThemeMatrix = useMemo(() => buildModeThemeMatrix(filteredRecords, measure), [filteredRecords, measure]);
  const donorThemePortfolio = useMemo(() => buildDonorThemePortfolio(filteredRecords, measure, 10), [filteredRecords, measure]);
  const topRecipients = useMemo(() => buildTopThemeByRecipient(filteredRecords, measure, 5), [filteredRecords, measure]);
  const recordThemeLabels = (record: CRSDecadeRecord) =>
    CRS_DECADE_THEMES.filter((theme) => record[theme.id]).map((theme) => theme.label);
  const recordColumnText = (record: CRSDecadeRecord, key: RecordSortKey) => {
    switch (key) {
      case 'year':
        return String(record.year ?? '');
      case 'record':
        return [record.title, record.purpose, record.short_description, record.long_description].filter(Boolean).join(' ');
      case 'donor':
        return record.donor;
      case 'recipient':
        return record.recipient;
      case 'mode':
        return [record.mode, record.mode_detail].filter(Boolean).join(' ');
      case 'themes':
        return recordThemeLabels(record).join(' ');
      case 'amount':
        return String(record[measure] ?? 0);
    }
  };
  const recordSortValue = (record: CRSDecadeRecord, key: RecordSortKey) => {
    if (key === 'year') return record.year ?? 0;
    if (key === 'amount') return record[measure] ?? 0;
    return recordColumnText(record, key).toLowerCase();
  };
  const fullListRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const activeColumnFilters = Object.entries(recordColumnFilters)
      .map(([key, value]) => [key as RecordSortKey, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value.length > 0);
    return [...filteredRecords]
      .filter((record) => {
        const matchesSearch = !query || (
          record.title.toLowerCase().includes(query) ||
          record.purpose.toLowerCase().includes(query) ||
          record.short_description.toLowerCase().includes(query) ||
          record.long_description.toLowerCase().includes(query) ||
          record.donor.toLowerCase().includes(query) ||
          record.agency.toLowerCase().includes(query) ||
          record.recipient.toLowerCase().includes(query) ||
          record.mode.toLowerCase().includes(query) ||
          recordThemeLabels(record).join(' ').toLowerCase().includes(query) ||
          String(record.year || '').includes(query)
        );
        if (!matchesSearch) return false;
        return activeColumnFilters.every(([key, value]) => recordColumnText(record, key).toLowerCase().includes(value));
      })
      .sort((a, b) => {
        const aValue = recordSortValue(a, recordSortKey);
        const bValue = recordSortValue(b, recordSortKey);
        const direction = recordSortDirection === 'asc' ? 1 : -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [filteredRecords, measure, recordColumnFilters, recordSearch, recordSortDirection, recordSortKey]);
  const totalPages = Math.max(1, Math.ceil(fullListRecords.length / rowsPerPage));
  const pagedRecords = fullListRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const taggedShare = stats.count > 0 ? (stats.taggedCount / stats.count) * 100 : 0;
  const activeMeasureLabel = measure.includes('commitment') ? 'commitments' : 'disbursements';
  const activeMeasureTitle = measure.includes('commitment') ? 'Commitments' : 'Disbursements';

  useEffect(() => {
    setPage(1);
  }, [filters, recordColumnFilters, recordSearch, rowsPerPage, selectedThemes]);

  function handleRecordSort(key: RecordSortKey) {
    if (recordSortKey === key) {
      setRecordSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setRecordSortKey(key);
    setRecordSortDirection(key === 'year' || key === 'amount' ? 'desc' : 'asc');
  }

  function toggleTheme(theme: CRSDecadeThemeId) {
    setSelectedThemes((current) =>
      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme],
    );
  }

  function themeChips(record: CRSDecadeRecord, dense = false) {
    const activeThemes = CRS_DECADE_THEMES.filter((theme) => record[theme.id]);
    if (!activeThemes.length) {
      return <span className="text-[12px] text-slate-400">No theme assigned</span>;
    }
    return activeThemes.map((theme) => (
      <span
        key={theme.id}
        className={`rounded-md font-medium text-white ${dense ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
        style={{ backgroundColor: THEME_COLORS[theme.id] }}
      >
        {theme.label}
      </span>
    ));
  }

  function recordDescription(record: CRSDecadeRecord) {
    return record.long_description || record.short_description || '';
  }

  function sortIcon(key: RecordSortKey) {
    if (recordSortKey !== key) {
      return <ChevronUp size={12} className="text-slate-300" />;
    }
    return recordSortDirection === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  }

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <p className="text-[13px] font-medium text-blue-600 mb-1">Prototype screening view</p>
            <h1 className="text-2xl text-slate-900 tracking-tight">UN Decade of Sustainable Transport</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {CRS_DECADE_THEMES.map((theme) => {
              const active = selectedThemes.includes(theme.id);
              return (
                <button
                  key={theme.id}
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
          recordCount={filteredRecords.length}
        />

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard label="Screened Records" value={isLoading ? 'Loading...' : crsFmt.num(stats.count)} sub="CRS transaction lines in view" />
          <KPICard label="Aligned Records" value={crsFmt.num(stats.taggedCount)} sub={`${taggedShare.toFixed(1)}% with at least one theme`} />
          <KPICard label="Aligned Value" value={crsFmt.usdM(stats.taggedMeasure)} sub={`Tagged ${activeMeasureLabel}`} />
          <KPICard label="Recipients" value={crsFmt.num(stats.recipientCount)} sub="ATO economies and Asia regional recipients" />
          <KPICard label="Donors" value={crsFmt.num(stats.donorCount)} sub="Funding sources in view" />
          <KPICard label="Focus Areas" value={crsFmt.num(CRS_DECADE_THEMES.length)} sub="UN Decade themes" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6 xl:items-start">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-slate-900 text-base font-semibold">Theme Overview</h2>
              <p className="text-slate-500 text-[13px] mt-1">
                Total {activeMeasureLabel} tagged to each UN Decade focus area.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={themeSeries} layout="vertical" margin={{ top: 0, right: 20, left: 42, bottom: 0 }} barCategoryGap={12}>
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
              <p className="text-slate-500 text-[13px] mt-1">Largest recipients and their dominant Decade focus area.</p>
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
              Each panel shows annual tagged {activeMeasureLabel} for one UN Decade focus area.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
            {CRS_DECADE_THEMES.map((theme) => (
              <div key={theme.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: THEME_COLORS[theme.id] }} />
                  <h3 className="text-[13px] font-semibold text-slate-800">{theme.label}</h3>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={trend} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<SingleValueTooltip measureLabel={activeMeasureTitle} />} />
                    <Area
                      type="monotone"
                      dataKey={theme.label}
                      stroke={THEME_COLORS[theme.id]}
                      fill={THEME_COLORS[theme.id]}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </AreaChart>
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
            <BarChart data={modeThemeMatrix} margin={{ top: 10, right: 18, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="mode" tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
              <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {CRS_DECADE_THEMES.map((theme) => (
                <Bar key={theme.id} dataKey={theme.label} fill={THEME_COLORS[theme.id]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-slate-900 text-base font-semibold">Focus Area Portfolio of Top Donors</h2>
            <p className="text-slate-500 text-[13px] mt-1">
              Clustered bars compare the UN Decade focus areas represented in each top donor portfolio.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={760}>
            <BarChart
              data={donorThemePortfolio}
              layout="vertical"
              margin={{ top: 0, right: 18, left: 72, bottom: 0 }}
              barCategoryGap={24}
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="donor" width={260} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
              <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Customized component={(props: any) => <DonorPortfolioDividers {...props} data={donorThemePortfolio} />} />
              {CRS_DECADE_THEMES.map((theme) => (
                <Bar key={theme.id} dataKey={theme.label} fill={THEME_COLORS[theme.id]} radius={[0, 4, 4, 0]} barSize={8} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 text-lg tracking-tight">Records</h2>
              <p className="text-slate-500 text-[14px] mt-1">
                CRS transaction lines in the current filtered view. Select a row to view UN Decade tagging details.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Search size={16} className="text-slate-400" />
                <input
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Search records"
                  className="bg-transparent border-none focus:ring-0 text-[14px] w-48 placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span>Rows</span>
                <select
                  value={rowsPerPage}
                  onChange={(event) => setRowsPerPage(Number(event.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700"
                >
                  {[25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              {Object.values(recordColumnFilters).some(Boolean) ? (
                <button
                  onClick={() => setRecordColumnFilters(EMPTY_RECORD_COLUMN_FILTERS)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Clear column filters
                </button>
              ) : null}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr className="bg-slate-50/40 text-[12px] text-slate-500 border-b border-slate-200">
                  {RECORD_COLUMNS.map((column) => (
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
                  {RECORD_COLUMNS.map((column) => (
                    <th key={`${column.key}-filter`} className="px-6 pb-3 text-left">
                      <input
                        value={recordColumnFilters[column.key]}
                        onChange={(event) =>
                          setRecordColumnFilters((current) => ({
                            ...current,
                            [column.key]: event.target.value,
                          }))
                        }
                        placeholder={`Filter ${column.label.toLowerCase()}`}
                        className={`h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium normal-case tracking-normal text-slate-600 shadow-sm outline-none transition-colors placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                          column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                      No records match the current filters and search.
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
                        <div className="max-w-[440px]">
                          <p className="text-[14px] font-medium text-slate-900 line-clamp-1">{record.title}</p>
                          <p className="text-[13px] text-slate-500 line-clamp-2 mt-1">{record.purpose || 'No purpose description available.'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.donor}</td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.recipient}</td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.mode}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                          {themeChips(record, true)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] font-medium text-slate-900">{crsFmt.usdM(record[measure])}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[13px] text-slate-500">
              Showing {fullListRecords.length ? (page - 1) * rowsPerPage + 1 : 0}-
              {Math.min(page * rowsPerPage, fullListRecords.length)} of {fullListRecords.length.toLocaleString()} records
            </p>
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!activeRecord} onOpenChange={(open) => !open && setActiveRecord(null)}>
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
                <div>
                  <p className="text-[12px] font-medium text-slate-500 mb-3">UN Decade themes</p>
                  <div className="flex flex-wrap gap-2">{themeChips(activeRecord)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <KPICard label="Commitment" value={crsFmt.usdM(activeRecord.commitment)} />
                  <KPICard label="Disbursement" value={crsFmt.usdM(activeRecord.disbursement)} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    ['Donor', activeRecord.donor],
                    ['Agency', activeRecord.agency],
                    ['Recipient', activeRecord.recipient],
                    ['Flow', activeRecord.flow],
                    ['Mode', activeRecord.mode],
                    ['Year', activeRecord.year],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[12px] font-medium text-slate-500">{label}</p>
                      <p className="text-[15px] text-slate-900 mt-1">{value || 'Not specified'}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[12px] font-medium text-slate-500 mb-3">CRS marker hints</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['Mitigation', activeRecord.climate_mitigation],
                      ['Adaptation', activeRecord.climate_adaptation],
                      ['Gender', activeRecord.gender],
                      ['DRR', activeRecord.drr],
                      ['Biodiversity', activeRecord.biodiversity],
                      ['Environment', activeRecord.environment],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className={`px-2 py-1 rounded-lg text-[11px] border ${
                          Number(value) > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-[15px] leading-relaxed text-slate-700">
                  Tagged using CRS project text, purpose, mode, recipient context, and CRS markers against the six UN Decade focus areas.
                </div>

                <div>
                  <p className="text-[12px] font-medium text-slate-500 mb-3">Description</p>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    {recordDescription(activeRecord) ? (
                      <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-700">
                        {recordDescription(activeRecord)}
                      </p>
                    ) : (
                      <p className="text-[14px] text-slate-500">No project description is available for this CRS record.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
