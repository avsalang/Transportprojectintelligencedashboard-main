import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { CRSRankingCard } from '../components/CRSRankingCard';
import { CRSFlowPanel } from '../components/CRSFlowPanel';
import { crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import { aggregateFacts, aggregateSustainabilityTags, buildYearSeries, summarizeFacts } from '../utils/crsAggregations';

export function CRSDonorProfile() {
  const { filteredFacts, filters, donorOptions } = useCRSFilters();
  const measure = filters.measure;
  const [selectedDonor, setSelectedDonor] = useState('');

  useEffect(() => {
    if (!donorOptions.length) return;
    if (!selectedDonor || !donorOptions.includes(selectedDonor)) {
      setSelectedDonor(donorOptions[0]);
    }
  }, [donorOptions, selectedDonor]);

  const donorFacts = useMemo(
    () => filteredFacts.filter((fact) => fact.donor === selectedDonor),
    [filteredFacts, selectedDonor],
  );

  const stats = useMemo(() => summarizeFacts(donorFacts), [donorFacts]);
  const donorRecipients = useMemo(() => new Set(donorFacts.map((fact) => fact.recipient)).size, [donorFacts]);
  const donorAgencies = useMemo(() => new Set(donorFacts.map((fact) => fact.agency)).size, [donorFacts]);
  const disbursementRatio = stats.commitment > 0 ? (stats.disbursement / stats.commitment) * 100 : 0;

  const yearlySeries = useMemo(() => buildYearSeries(donorFacts), [donorFacts]);
  const recipientSeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.recipient).slice(0, 10), [donorFacts]);
  const agencySeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.agency).slice(0, 10), [donorFacts]);
  const modeSeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.mode).slice(0, 8), [donorFacts]);
  const sectorSeries = useMemo(() => aggregateSustainabilityTags(donorFacts), [donorFacts]);
  const financingSeries = useMemo(() => aggregateFacts(donorFacts, (fact) => fact.flow).slice(0, 8), [donorFacts]);

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl text-slate-900 tracking-tight">Donor Profile</h1>
            <p className="text-slate-500 mt-1">
              Funding patterns, channels, and recipient concentration for a selected donor.
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <KPICard label="Commitments" value={crsFmt.usdM(stats.commitment)} />
          <KPICard label="Disbursements" value={crsFmt.usdM(stats.disbursement)} />
          <KPICard label="Recipients" value={crsFmt.num(donorRecipients)} />
          <KPICard label="Agencies" value={crsFmt.num(donorAgencies)} />
          <KPICard label="Records" value={crsFmt.num(stats.count)} />
          <KPICard label="Disbursement Ratio" value={`${disbursementRatio.toFixed(1)}%`} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-slate-900 text-lg tracking-tight">Funding Over Time</h2>
            <p className="text-slate-500 text-[14px] mt-1 mb-4">
              Yearly {measure === 'commitment' ? 'commitments' : 'disbursements'} from the selected donor.
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlySeries} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="donor-area-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => crsFmt.usdM(value)} />
                  <Tooltip formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
                  <Area
                    type="monotone"
                    dataKey={measure}
                    stroke="#0F766E"
                    strokeWidth={2.5}
                    fill="url(#donor-area-gradient)"
                    dot={false}
                  />
                </AreaChart>
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
          title="Funding Flows"
          subtitle="Donor to agency to recipient pathways for the selected donor."
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
            subtitle="Transport modes in the selected donor portfolio."
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
            subtitle="Funding types used by the selected donor."
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
