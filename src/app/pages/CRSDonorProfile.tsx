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
import { KPICard } from '../components/KPICard';
import { CRSRankingCard } from '../components/CRSRankingCard';
import { CRSFlowPanel } from '../components/CRSFlowPanel';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { crsFmt } from '../data/crsData';
import { useCRSPageFilters } from '../context/CRSFilterContext';
import { aggregateFacts, aggregateSustainabilityTags, buildYearModeStack, summarizeFacts } from '../utils/crsAggregations';

const MODE_AREA_COLORS = {
  Rail: '#10B981',
  Road: '#2563EB',
  Water: '#8B5CF6',
  Aviation: '#F59E0B',
  Other: '#EC4899',
};

const CURRENCY_AXIS_WIDTH = 76;
const DEFAULT_DONOR = 'Asian Development Bank';

export function CRSDonorProfile() {
  const { filteredFacts, filters, setFilters, resetFilters } = useCRSPageFilters();
  const measure = filters.measure;
  const [selectedDonor, setSelectedDonor] = useState('');
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

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900 tracking-tight">Donor Profile</h1>
            <p className="text-slate-500 mt-1">
              Finance patterns, channels, and recipient concentration for a selected donor.
            </p>
          </div>
          <div className="w-full xl:w-[420px]">
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
        </div>

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
      </div>
    </div>
  );
}
