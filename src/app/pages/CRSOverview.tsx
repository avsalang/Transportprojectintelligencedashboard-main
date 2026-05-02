import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { CRSRankingCard } from '../components/CRSRankingCard';
import { CRSFlowPanel } from '../components/CRSFlowPanel';
import { StyledCRSCountryMap } from '../components/StyledCRSCountryMap';
import { CRSPageFilters } from '../components/CRSPageFilters';
import { crsFmt } from '../data/crsData';
import { LOW_CARBON_SCREENER_RANKING } from '../data/lowCarbonScreenerData';
import { useCRSPageFilters } from '../context/CRSFilterContext';
import { aggregateFacts, aggregateSustainabilityTags, buildCountryMapPoints, buildModeStackByDonor, buildYearModeStack, summarizeFacts } from '../utils/crsAggregations';

const MODE_AREA_COLORS = {
  Rail: '#10B981',
  Road: '#2563EB',
  Water: '#8B5CF6',
  Aviation: '#F59E0B',
  Other: '#EC4899',
};

const CURRENCY_AXIS_WIDTH = 76;

function StackedModeTooltip({ active, payload, label, measureLabel = 'Commitments' }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((item: any) => Number(item.value) > 0);
  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-2 text-[13px] font-semibold text-slate-900">{label}</p>
      <div className="space-y-1.5">
        {rows.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[12px]">
            <span style={{ color: item.color }}>{item.dataKey}</span>
            <span className="font-medium text-slate-700">{crsFmt.usdM(Number(item.value))}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-400">{measureLabel}</p>
    </div>
  );
}

function ScreenerScoreTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = Number(payload[0].value);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[12px] text-slate-600">Screener score: <span className="font-medium text-slate-900">{score.toFixed(1)}</span></p>
      <p className="mt-1 text-[11px] text-slate-400">Higher score follows the workbook's weighted screen.</p>
    </div>
  );
}

export function CRSOverview() {
  const { filteredFacts, filters, setFilters, resetFilters } = useCRSPageFilters();
  const measure = filters.measure;
  const stats = useMemo(() => summarizeFacts(filteredFacts), [filteredFacts]);
  const countryPoints = useMemo(() => buildCountryMapPoints(filteredFacts), [filteredFacts]);
  const yearlyModeStack = useMemo(() => buildYearModeStack(filteredFacts, measure), [filteredFacts, measure]);
  const topRecipients = useMemo(() => aggregateFacts(filteredFacts, (fact) => fact.recipient).slice(0, 10), [filteredFacts]);
  const topDonors = useMemo(() => aggregateFacts(filteredFacts, (fact) => fact.donor).slice(0, 10), [filteredFacts]);
  const modeSeries = useMemo(() => aggregateFacts(filteredFacts, (fact) => fact.mode).slice(0, 10), [filteredFacts]);
  const sectorSeries = useMemo(() => aggregateSustainabilityTags(filteredFacts), [filteredFacts]);
  const donorModeStack = useMemo(() => buildModeStackByDonor(filteredFacts, 8), [filteredFacts]);
  const financingSeries = useMemo(() => aggregateFacts(filteredFacts, (fact) => fact.flow).slice(0, 10), [filteredFacts]);
  const lowCarbonRanking = useMemo(() => LOW_CARBON_SCREENER_RANKING, []);
  const lowCarbonRankingHeight = Math.max(620, lowCarbonRanking.length * 25 + 80);
  const measureLabel = measure.includes('commitment') ? 'Commitments' : 'Disbursements';

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl text-slate-900 tracking-tight">Overview</h1>
        </div>

        <CRSPageFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          enabled={['year', 'donor', 'recipient', 'mode', 'sector', 'basis']}
          recordCount={filteredFacts.length}
        />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label="Commitments" value={crsFmt.usdM(stats.commitment_defl)} sub="Total commitments in view" />
          <KPICard label="Disbursements" value={crsFmt.usdM(stats.disbursement_defl)} sub="Total disbursements in view" />
          <KPICard label="Recipients" value={crsFmt.num(stats.recipientCount)} sub="ATO economies and Asia regional recipients" />
          <KPICard label="Donors" value={crsFmt.num(stats.donorCount)} sub="Funding sources in view" />
          <KPICard label="Records" value={crsFmt.num(stats.count)} sub="CRS transaction lines" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr,1fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-slate-900 text-sm font-semibold">Recipient Map</p>
              <p className="text-slate-400 text-xs mt-1">Map of ATO economy recipients in the current filtered view.</p>
            </div>
            <StyledCRSCountryMap points={countryPoints} measure={measure} viewMode="points" height={500} />
          </div>

          <div className="space-y-6">
            <CRSRankingCard
              title="Top Recipients"
              subtitle="Largest recipients in the current filtered portfolio."
              data={topRecipients}
              measure={measure}
              color="#059669"
            />
            <CRSRankingCard
              title="Top Donors"
              subtitle="Largest funding sources in the current filtered portfolio."
              data={topDonors}
              measure={measure}
              color="#0F766E"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr,1fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-900 text-sm font-semibold mb-1">Funding Over Time</p>
            <p className="text-slate-400 text-xs mb-4">{measureLabel} by year and transport mode in the current filtered portfolio.</p>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={yearlyModeStack} margin={{ top: 10, right: 20, left: 8, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(value: number) => crsFmt.usdM(value)} />
                <Tooltip content={<StackedModeTooltip measureLabel={measureLabel} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Rail" stackId="modes" stroke={MODE_AREA_COLORS.Rail} fill={MODE_AREA_COLORS.Rail} fillOpacity={0.72} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Road" stackId="modes" stroke={MODE_AREA_COLORS.Road} fill={MODE_AREA_COLORS.Road} fillOpacity={0.72} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Water" stackId="modes" stroke={MODE_AREA_COLORS.Water} fill={MODE_AREA_COLORS.Water} fillOpacity={0.72} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Aviation" stackId="modes" stroke={MODE_AREA_COLORS.Aviation} fill={MODE_AREA_COLORS.Aviation} fillOpacity={0.72} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Other" stackId="modes" stroke={MODE_AREA_COLORS.Other} fill={MODE_AREA_COLORS.Other} fillOpacity={0.72} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-slate-900 text-base font-semibold mb-1">Transport Modes by Donor</p>
              <p className="text-slate-500 text-sm mb-4">
                Investment by donor across road, rail, aviation, water, and other transport modes.
              </p>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={donorModeStack} layout="vertical" margin={{ top: 0, right: 18, left: 18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(value) => crsFmt.usdM(value)} />
                  <YAxis type="category" dataKey="label" width={220} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#334155' }} interval={0} />
                  <Tooltip content={<StackedModeTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Road" stackId="modes" fill="#2563EB" />
                  <Bar dataKey="Rail" stackId="modes" fill="#10B981" />
                  <Bar dataKey="Aviation" stackId="modes" fill="#F59E0B" />
                  <Bar dataKey="Water" stackId="modes" fill="#8B5CF6" />
                  <Bar dataKey="Other" stackId="modes" fill="#EC4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        <CRSFlowPanel
          facts={filteredFacts}
          measure={measure}
          title="Funding Flows"
          subtitle="Donor to agency to recipient pathways in the current filtered view."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CRSRankingCard
            title="Transport Modes"
            subtitle="Transport mode distribution in the current filtered portfolio."
            data={modeSeries}
            measure={measure}
            color="#8B5CF6"
          />
          <CRSRankingCard
            title="CRS Tag Totals"
            subtitle="Total tagged volume by CRS marker in the current filtered portfolio."
            data={sectorSeries}
            measure={measure}
            color="#0EA5E9"
          />
          <CRSRankingCard
            title="Finance Flow Type"
            subtitle="Finance flow type by which development finance is provided."
            data={financingSeries}
            measure={measure}
            color="#334155"
          />
        </div>

        <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
          <div className="mb-4 border-b border-sky-100 pb-4">
            <p className="text-slate-900 text-base font-semibold">Low Carbon Transport Screener</p>
            <p className="mt-1 max-w-[900px] text-sm text-slate-500">
              Economy-level ranking from the low-carbon transport screening workbook. This is separate from the CRS finance filters above.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-1 text-sm font-semibold text-slate-900">Economy Ranking</p>
            <p className="mb-4 text-xs text-slate-400">All economies by weighted screener score, sorted highest to lowest.</p>
            <ResponsiveContainer width="100%" height={lowCarbonRankingHeight}>
              <BarChart data={lowCarbonRanking} layout="vertical" margin={{ top: 0, right: 54, left: 16, bottom: 8 }} barCategoryGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => value.toFixed(0)}
                />
                <YAxis
                  type="category"
                  dataKey="economy"
                  width={250}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip content={<ScreenerScoreTooltip />} />
                <Bar dataKey="score" fill="#0EA5E9" fillOpacity={0.86} radius={[0, 3, 3, 0]} maxBarSize={12}>
                  <LabelList
                    dataKey="score"
                    position="right"
                    formatter={(value: number) => value.toFixed(1)}
                    style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
