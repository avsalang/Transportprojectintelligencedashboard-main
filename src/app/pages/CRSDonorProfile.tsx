import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Search } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { CRSRankingCard } from '../components/CRSRankingCard';
import { CRSFlowPanel } from '../components/CRSFlowPanel';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { CRSPageIntro } from '../components/CRSPageIntro';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
import { CRSDecadeRecord, CRSDecadeRecordIndex, CRS_DECADE_THEMES } from '../data/crsDecadeData';
import { ATO_ECONOMIES } from '../data/atoEconomies';
import { useCRSPageFilters } from '../context/CRSFilterContext';
import { aggregateFacts, aggregateSustainabilityTags, buildYearModeStack, summarizeFacts } from '../utils/crsAggregations';
import { matchesCRSFilters } from '../utils/crsFiltering';

const MODE_AREA_COLORS = {
  Rail: '#10B981',
  Road: '#2563EB',
  Water: '#8B5CF6',
  Aviation: '#F59E0B',
  Other: '#EC4899',
};

const CURRENCY_AXIS_WIDTH = 76;
const DEFAULT_DONOR = 'Asian Development Bank';
type DonorRecord = CRSDecadeRecord;

function RecordThemeChip({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
      {label}
    </span>
  );
}

function MarkerFlag({ active, label }: { active: number; label: string }) {
  return (
    <div className={`px-2 py-1 rounded-lg text-[11px] border ${active > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
      {label}
    </div>
  );
}

export function CRSDonorProfile() {
  const { filteredFacts, filters, setFilters, resetFilters } = useCRSPageFilters();
  const measure = filters.measure;
  const [selectedDonor, setSelectedDonor] = useState('');
  const [records, setRecords] = useState<DonorRecord[]>([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<DonorRecord | null>(null);
  const [recordPage, setRecordPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const donorOptions = useMemo(
    () => [...new Set(filteredFacts.map((fact) => fact.donor).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filteredFacts],
  );

  useEffect(() => {
    if (!donorOptions.length) return;
    if (!selectedDonor || !donorOptions.includes(selectedDonor)) {
      setSelectedDonor(donorOptions.includes(DEFAULT_DONOR) ? DEFAULT_DONOR : donorOptions[0]);
    }
  }, [donorOptions, selectedDonor]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      const indexResponse = await fetch(`${import.meta.env.BASE_URL}data/crs-decade-records/index.json`);
      const index: CRSDecadeRecordIndex = await indexResponse.json();
      const chunks = await Promise.all(
        index.chunks.map(async (chunk) => {
          const response = await fetch(`${import.meta.env.BASE_URL}${chunk.file}`);
          return (await response.json()) as DonorRecord[];
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

  const donorFacts = useMemo(
    () => filteredFacts.filter((fact) => fact.donor === selectedDonor),
    [filteredFacts, selectedDonor],
  );

  const stats = useMemo(() => summarizeFacts(donorFacts), [donorFacts]);
  const donorRecipients = useMemo(() => new Set(donorFacts.map((fact) => fact.recipient)).size, [donorFacts]);
  const donorAgencies = useMemo(() => new Set(donorFacts.map((fact) => fact.agency)).size, [donorFacts]);

  const yearlyModeStack = useMemo(() => buildYearModeStack(donorFacts, measure), [donorFacts, measure]);
  const recipientSeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.recipient).slice(0, 10), [donorFacts]);
  const agencySeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.agency).slice(0, 10), [donorFacts]);
  const modeSeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.mode).slice(0, 8), [donorFacts]);
  const sectorSeries = useMemo(() => aggregateSustainabilityTags(donorFacts), [donorFacts]);
  const financingSeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.flow).slice(0, 8), [donorFacts]);
  const measureLabel = measure.includes('commitment') ? 'commitments' : 'disbursements';
  const activeFinanceLabel = measure.includes('commitment') ? 'Commitments' : 'Disbursements';
  const donorRecords = useMemo(
    () => records.filter((record) => matchesCRSFilters(record, filters, ATO_ECONOMIES) && record.donor === selectedDonor),
    [filters, records, selectedDonor],
  );
  const filteredDonorRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    return donorRecords
      .filter((record) => {
        if (!query) return true;
        return (
          record.title.toLowerCase().includes(query) ||
          record.purpose.toLowerCase().includes(query) ||
          record.short_description.toLowerCase().includes(query) ||
          record.long_description.toLowerCase().includes(query) ||
          record.agency.toLowerCase().includes(query) ||
          record.recipient.toLowerCase().includes(query) ||
          record.mode.toLowerCase().includes(query) ||
          String(record.year || '').includes(query)
        );
      })
      .sort((a, b) => (b[measure] ?? 0) - (a[measure] ?? 0));
  }, [donorRecords, measure, recordSearch]);
  const donorRecordTotalPages = Math.max(1, Math.ceil(filteredDonorRecords.length / rowsPerPage));
  const pagedDonorRecords = filteredDonorRecords.slice((recordPage - 1) * rowsPerPage, recordPage * rowsPerPage);
  const recordThemeLabels = (record: DonorRecord) =>
    CRS_DECADE_THEMES.filter((theme) => record[theme.id]).map((theme) => theme.label);
  const recordDescription = (record: DonorRecord) => record.long_description || record.short_description || record.purpose || '';

  useEffect(() => {
    setRecordPage(1);
  }, [recordSearch, rowsPerPage, selectedDonor, filters]);

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <CRSPageIntro
          title="Donor Profile"
          aside={(
            <div className="w-full">
              <label className="block text-[14px] text-slate-400 ml-1 mb-2">Donor</label>
              <select
                value={selectedDonor}
                onChange={(event) => setSelectedDonor(event.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {donorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        >
          <p>
            The Donor Profile page provides a focused view of transport-related development finance by financing partner. It allows users to explore how each donor supports transport projects across countries, years, subsectors, financing instruments, and policy priorities. The page helps identify donor focus areas, financing patterns, and opportunities for coordination by showing where resources are being directed and how they align with broader transport development needs.
          </p>
        </CRSPageIntro>

        <CRSPageFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          enabled={['year', 'recipient', 'mode', 'sector', 'basis']}
          recordCount={donorFacts.length}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard label={activeFinanceLabel} value={crsFmt.usdM(stats[measure] ?? 0)} />
          <KPICard label="Recipients" value={crsFmt.num(donorRecipients)} />
          <KPICard label="Agencies" value={crsFmt.num(donorAgencies)} />
          <KPICard label="Project Records" value={crsFmt.num(stats.count)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-slate-900 text-lg tracking-tight">Development Finance over Time</h2>
            <p className="text-slate-500 text-[14px] mt-1 mb-4">
              Yearly {measureLabel} from the selected donor by transport mode, constant 2024 USD.
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
            title="Top Recipients"
            subtitle="Largest recipient destinations for the selected donor."
            data={recipientSeries}
            measure={measure}
            color="#10B981"
            maxChars={24}
          />
        </div>

        <CRSFlowPanel
          facts={donorFacts}
          measure={measure}
          title="Finance Flows"
          subtitle="Donor to agency to recipient pathways for the selected donor."
          sankeyOptions={{ focusedAgencyLimit: 10, focusedRecipientLimit: 10, groupOtherNodes: true }}
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
            subtitle="Transport modes in the selected donor's selection."
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
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-slate-50/40 text-left text-[12px] font-semibold text-slate-500 border-b border-slate-200">
                  <th className="px-6 py-3">Year</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Agency</th>
                  <th className="px-6 py-3">Recipient</th>
                  <th className="px-6 py-3">Mode</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedDonorRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      No project records match the current donor and search.
                    </td>
                  </tr>
                ) : (
                  pagedDonorRecords.map((record) => (
                    <tr
                      key={record.row_number}
                      onClick={() => setActiveRecord(record)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.year}</td>
                      <td className="px-6 py-4">
                        <div className="max-w-[500px]">
                          <p className="text-[14px] font-medium text-slate-900 line-clamp-1">{record.title}</p>
                          <p className="text-[13px] text-slate-500 line-clamp-2 mt-1">
                            {recordDescription(record) || 'No description available.'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.agency}</td>
                      <td className="px-6 py-4 text-[14px] text-slate-600">{record.recipient}</td>
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
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[13px] text-slate-500">
              Showing {filteredDonorRecords.length ? (recordPage - 1) * rowsPerPage + 1 : 0}-
              {Math.min(recordPage * rowsPerPage, filteredDonorRecords.length)} of {filteredDonorRecords.length.toLocaleString()} project records
            </p>
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <button
                onClick={() => setRecordPage((current) => Math.max(1, current - 1))}
                disabled={recordPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                Prev
              </button>
              <span>Page {recordPage} of {donorRecordTotalPages}</span>
              <button
                onClick={() => setRecordPage((current) => Math.min(donorRecordTotalPages, current + 1))}
                disabled={recordPage >= donorRecordTotalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                Next
              </button>
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
                    <p className="text-[12px] font-medium text-slate-500 mb-3">ATO thematic tags</p>
                    <div className="flex flex-wrap gap-2">
                      {recordThemeLabels(activeRecord).length
                        ? recordThemeLabels(activeRecord).map((label) => <RecordThemeChip key={label} label={label} />)
                        : <span className="text-[13px] text-slate-400">No thematic tag assigned</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-3">Sustainability-related Tags</p>
                    <div className="flex flex-wrap gap-2">
                      <MarkerFlag active={activeRecord.climate_mitigation} label="Mitigation" />
                      <MarkerFlag active={activeRecord.climate_adaptation} label="Adaptation" />
                      <MarkerFlag active={activeRecord.gender} label="Gender" />
                      <MarkerFlag active={activeRecord.drr} label="DRR" />
                      <MarkerFlag active={activeRecord.biodiversity} label="Biodiversity" />
                      <MarkerFlag active={activeRecord.environment} label="Environment" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-3">Description</p>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {recordDescription(activeRecord) || 'Detailed descriptive metadata not available for this record.'}
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
