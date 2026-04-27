import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import { Check, Circle, Search } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
import { CRSDecadeRecord, CRSDecadeRecordIndex, CRSDecadeThemeId, CRS_DECADE_THEMES } from '../data/crsDecadeData';
import { useCRSFilters } from '../context/CRSFilterContext';
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
  const { filters } = useCRSFilters();
  const [selectedThemes, setSelectedThemes] = useState<CRSDecadeThemeId[]>([]);
  const [records, setRecords] = useState<CRSDecadeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<CRSDecadeRecord | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
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
  const topRecipients = useMemo(() => buildTopThemeByRecipient(filteredRecords, measure, 12), [filteredRecords, measure]);
  const fullListRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    return [...filteredRecords]
      .filter((record) => {
        if (!query) return true;
        return (
          record.title.toLowerCase().includes(query) ||
          record.purpose.toLowerCase().includes(query) ||
          record.donor.toLowerCase().includes(query) ||
          record.agency.toLowerCase().includes(query) ||
          record.recipient.toLowerCase().includes(query) ||
          String(record.year || '').includes(query)
        );
      })
      .sort((a, b) => (b[measure] ?? 0) - (a[measure] ?? 0));
  }, [filteredRecords, measure, recordSearch]);
  const totalPages = Math.max(1, Math.ceil(fullListRecords.length / rowsPerPage));
  const pagedRecords = fullListRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const taggedShare = stats.count > 0 ? (stats.taggedCount / stats.count) * 100 : 0;
  const activeMeasureLabel = measure === 'commitment' ? 'commitments' : 'disbursements';
  const activeMeasureTitle = measure === 'commitment' ? 'Commitments' : 'Disbursements';

  useEffect(() => {
    setPage(1);
  }, [filters, recordSearch, rowsPerPage, selectedThemes]);

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

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <p className="text-[13px] font-medium text-blue-600 mb-1">Prototype screening view</p>
            <h1 className="text-2xl text-slate-900 tracking-tight">UN Decade of Sustainable Transport</h1>
            <p className="text-slate-500 mt-1 max-w-3xl">
              ATO-relevant CRS transport funding screened against the six focus areas of the 2026-2035 implementation plan.
            </p>
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

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard label="Screened Records" value={isLoading ? 'Loading...' : crsFmt.num(stats.count)} sub="CRS transaction lines in view" />
          <KPICard label="Aligned Records" value={crsFmt.num(stats.taggedCount)} sub={`${taggedShare.toFixed(1)}% with at least one theme`} />
          <KPICard label="Aligned Value" value={crsFmt.usdM(stats.taggedMeasure)} sub={`Tagged ${activeMeasureLabel}`} />
          <KPICard label="Recipients" value={crsFmt.num(stats.recipientCount)} sub="ATO economies and Asia regional recipients" />
          <KPICard label="Donors" value={crsFmt.num(stats.donorCount)} sub="Funding sources in view" />
          <KPICard label="Focus Areas" value={crsFmt.num(CRS_DECADE_THEMES.length)} sub="UN Decade themes" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-slate-900 text-base font-semibold">Theme Overview</h2>
              <p className="text-slate-500 text-[13px] mt-1">
                Total {activeMeasureLabel} tagged to each UN Decade focus area.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={themeSeries} layout="vertical" margin={{ top: 0, right: 20, left: 42, bottom: 0 }}>
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

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-slate-900 text-base font-semibold">Theme Mix Over Time</h2>
              <p className="text-slate-500 text-[13px] mt-1">Annual tagged {activeMeasureLabel} by focus area.</p>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={trend} margin={{ top: 10, right: 18, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {CRS_DECADE_THEMES.map((theme) => (
                  <Area
                    key={theme.id}
                    type="monotone"
                    dataKey={theme.label}
                    stackId="1"
                    stroke={THEME_COLORS[theme.id]}
                    fill={THEME_COLORS[theme.id]}
                    fillOpacity={0.72}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-slate-900 text-base font-semibold">Focus Areas by Mode</h2>
              <p className="text-slate-500 text-[13px] mt-1">Mode-level distribution of tagged {activeMeasureLabel}.</p>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={modeThemeMatrix} margin={{ top: 10, right: 18, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="mode" tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {CRS_DECADE_THEMES.map((theme) => (
                  <Bar key={theme.id} dataKey={theme.label} stackId="themes" fill={THEME_COLORS[theme.id]} />
                ))}
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
            <h2 className="text-slate-900 text-base font-semibold">Theme Portfolio of Top Donors</h2>
            <p className="text-slate-500 text-[13px] mt-1">
              Largest donors in the current view, split by UN Decade focus area.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={430}>
            <BarChart data={donorThemePortfolio} layout="vertical" margin={{ top: 0, right: 18, left: 72, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => crsFmt.usdM(value)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="donor" width={260} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
              <Tooltip content={<StackedTooltip measureLabel={activeMeasureTitle} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {CRS_DECADE_THEMES.map((theme) => (
                <Bar key={theme.id} dataKey={theme.label} stackId="donorThemes" fill={THEME_COLORS[theme.id]} />
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
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr className="bg-slate-50/40 text-[12px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 text-left">Year</th>
                  <th className="px-6 py-4 text-left">Record</th>
                  <th className="px-6 py-4 text-left">Donor</th>
                  <th className="px-6 py-4 text-left">Recipient</th>
                  <th className="px-6 py-4 text-left">Mode</th>
                  <th className="px-6 py-4 text-left">UN Decade Themes</th>
                  <th className="px-6 py-4 text-right">Amount</th>
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
                <span className="px-3 py-1 bg-blue-600 rounded-full text-[12px] font-bold uppercase tracking-widest">
                  Record detail
                </span>
                <h2 className="text-2xl text-white font-bold leading-tight mt-6 tracking-tight">{activeRecord.title}</h2>
                <p className="text-blue-100/70 text-[14px] mt-4 line-clamp-3">{activeRecord.purpose || 'No purpose description available.'}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                <div>
                  <p className="text-[12px] uppercase tracking-wider text-slate-400 mb-3">UN Decade themes</p>
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
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-[15px] text-slate-900 mt-1">{value || 'Not specified'}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[12px] uppercase tracking-wider text-slate-400 mb-3">CRS marker hints</p>
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
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
