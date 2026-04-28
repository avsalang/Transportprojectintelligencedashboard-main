import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import { Sheet, SheetContent } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
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

type CRSRecord = {
  id: number;
  year: number | null;
  donor: string;
  agency: string;
  recipient: string;
  recipient_scope: string;
  region: string;
  flow: string;
  finance_type: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  title: string;
  description: string;
  short_description: string;
  purpose: string;
  mode: string;
  mode_detail: string;
  climate_mitigation: number;
  climate_adaptation: number;
  gender: number;
  biodiversity: number;
  environment: number;
  drr: number;
};

type CRSRecordIndex = {
  chunks: Array<{
    id: number;
    file: string;
    count: number;
  }>;
  entityShardMap: Record<'country' | 'regionalRecipient', Record<string, number[]>>;
};

function ThemeFlag({ active, label }: { active: number; label: string }) {
  return (
    <div className={`px-2 py-1 rounded-lg text-[11px] border ${active > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
      {label}
    </div>
  );
}

export function CRSRecipientProfile() {
  const { filteredFacts, filters, setFilters, resetFilters } = useCRSPageFilters();
  const measure = filters.measure;
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [recordIndex, setRecordIndex] = useState<CRSRecordIndex | null>(null);
  const [recordChunks, setRecordChunks] = useState<Record<string, CRSRecord[]>>({});
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<CRSRecord | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const profileRecipientOptions = useMemo(
    () => [...new Set(filteredFacts.map((fact) => fact.recipient).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filteredFacts],
  );

  useEffect(() => {
    if (!profileRecipientOptions.length) return;
    if (!selectedRecipient || !profileRecipientOptions.includes(selectedRecipient)) {
      setSelectedRecipient(profileRecipientOptions[0]);
    }
  }, [profileRecipientOptions, selectedRecipient]);

  useEffect(() => {
    async function loadIndex() {
      const response = await fetch(`${import.meta.env.BASE_URL}data/crs-records/index.json`);
      const data = await response.json();
      setRecordIndex(data);
    }
    loadIndex().catch((error) => console.error('Failed to load CRS record index', error));
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
  const measureLabel = measure.includes('commitment') ? 'commitments' : 'disbursements';

  const recordEntityType = selectedRecipient.includes(', regional') ? 'regionalRecipient' : 'country';
  const recordEntityKey = useMemo(
    () => (recordEntityType === 'regionalRecipient' ? selectedRecipient.replace(/, regional$/, '') : selectedRecipient),
    [recordEntityType, selectedRecipient],
  );
  const activeShardIds = useMemo(
    () => recordIndex?.entityShardMap?.[recordEntityType]?.[recordEntityKey] ?? [],
    [recordEntityKey, recordEntityType, recordIndex],
  );

  useEffect(() => {
    async function loadMissingShards() {
      if (!recordIndex || !activeShardIds.length) return;
      const missingIds = activeShardIds.filter((id) => !recordChunks[String(id)]);
      if (!missingIds.length) return;

      const loaded = await Promise.all(
        missingIds.map(async (id) => {
          const chunk = recordIndex.chunks.find((entry) => entry.id === id);
          if (!chunk) return [String(id), []] as const;
          const response = await fetch(`${import.meta.env.BASE_URL}${chunk.file}`);
          return [String(id), await response.json()] as const;
        }),
      );

      setRecordChunks((current) => ({ ...current, ...Object.fromEntries(loaded) }));
    }

    loadMissingShards().catch((error) => console.error('Failed to load CRS record shards', error));
  }, [activeShardIds, recordChunks, recordIndex]);

  const records = useMemo(
    () => activeShardIds.flatMap((id) => recordChunks[String(id)] ?? []),
    [activeShardIds, recordChunks],
  );

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const result = records.filter((record) => {
      if (!matchesCRSFilters(record, filters, ATO_ECONOMIES)) return false;
      if (record.recipient !== selectedRecipient) return false;
      if (!query) return true;

      return (
        (record.title || '').toLowerCase().includes(query) ||
        (record.description || record.short_description || '').toLowerCase().includes(query) ||
        (record.donor || '').toLowerCase().includes(query) ||
        (record.agency || '').toLowerCase().includes(query) ||
        String(record.year || '').includes(query)
      );
    });

    return result.sort((a, b) => (b[measure] || 0) - (a[measure] || 0));
  }, [filters, measure, recordSearch, records, selectedRecipient]);

  useEffect(() => {
    setPage(1);
  }, [recordSearch, selectedRecipient]);

  const pagedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900 tracking-tight">Recipient Profile</h1>
            <p className="text-slate-500 mt-1">
              Funding pathways, donor concentration, and source records for a selected recipient.
            </p>
          </div>
          <div className="w-full xl:w-[420px]">
            <label className="block text-[14px] text-slate-400 ml-1 mb-2">Recipient</label>
            <select
              value={selectedRecipient}
              onChange={(event) => setSelectedRecipient(event.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {profileRecipientOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CRSPageFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          enabled={['year', 'donor', 'agency', 'mode', 'sector', 'basis']}
          recordCount={recipientFacts.length}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <KPICard label="Commitments" value={crsFmt.usdM(stats.commitment_defl)} />
          <KPICard label="Disbursements" value={crsFmt.usdM(stats.disbursement_defl)} />
          <KPICard label="Donors" value={crsFmt.num(donorCount)} />
          <KPICard label="Agencies" value={crsFmt.num(agencyCount)} />
          <KPICard label="Records" value={crsFmt.num(stats.count)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-slate-900 text-lg tracking-tight">Funding Over Time</h2>
            <p className="text-slate-500 text-[14px] mt-1 mb-4">
              Yearly {measureLabel} received by the selected recipient by transport mode.
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyModeStack} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => crsFmt.usdM(value)} />
                  <Tooltip formatter={(value: number, name: string) => [crsFmt.usdM(value), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Rail" stackId="modes" stroke={MODE_AREA_COLORS.Rail} fill={MODE_AREA_COLORS.Rail} fillOpacity={0.72} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Road" stackId="modes" stroke={MODE_AREA_COLORS.Road} fill={MODE_AREA_COLORS.Road} fillOpacity={0.72} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Water" stackId="modes" stroke={MODE_AREA_COLORS.Water} fill={MODE_AREA_COLORS.Water} fillOpacity={0.72} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Aviation" stackId="modes" stroke={MODE_AREA_COLORS.Aviation} fill={MODE_AREA_COLORS.Aviation} fillOpacity={0.72} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Other" stackId="modes" stroke={MODE_AREA_COLORS.Other} fill={MODE_AREA_COLORS.Other} fillOpacity={0.72} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <CRSRankingCard
            title="Top Donors"
            subtitle="Largest donors in the selected recipient portfolio."
            data={donorSeries}
            measure={measure}
            color="#0F766E"
            maxChars={24}
          />
        </div>

        <CRSFlowPanel
          facts={recipientFacts}
          measure={measure}
          title="Funding Flows"
          subtitle="Donor to agency to recipient pathways for the selected recipient."
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
            subtitle="Transport modes in the selected recipient portfolio."
            data={modeSeries}
            measure={measure}
            color="#8B5CF6"
            maxChars={24}
          />
          <CRSRankingCard
            title="CRS Tags"
            subtitle="Mitigation, adaptation, gender, DRR, biodiversity, and environment CRS tags."
            data={sectorSeries}
            measure={measure}
            color="#F59E0B"
            maxChars={24}
          />
          <CRSRankingCard
            title="Financing Type"
            subtitle="Funding types used in the selected recipient portfolio."
            data={financingSeries}
            measure={measure}
            color="#334155"
            maxChars={24}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 text-lg tracking-tight">Records</h2>
              <p className="text-slate-500 text-[14px] mt-1">
                Source transactions behind the selected recipient profile.
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/40 text-[12px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 text-left">Year</th>
                  <th className="px-6 py-4 text-left">Record</th>
                  <th className="px-6 py-4 text-left">Donor</th>
                  <th className="px-6 py-4 text-left">Agency</th>
                  <th className="px-6 py-4 text-left">Mode</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                      No records match the current profile and search.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((record) => (
                    <tr
                      key={record.id}
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
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-[12px] font-bold uppercase tracking-widest">
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
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">Donor</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.donor}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">Agency</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.agency}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">Recipient</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.recipient}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">Flow</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.flow}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">Mode</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.mode}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-wider text-slate-400">Year</p>
                      <p className="text-[15px] text-slate-900 mt-1">{activeRecord.year}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-wider text-slate-400 mb-3">CRS marker hints</p>
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
                    <p className="text-[12px] uppercase tracking-wider text-slate-400 mb-3">Description</p>
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
