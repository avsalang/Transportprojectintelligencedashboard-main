import { useMemo } from 'react';
import {
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
import { WrappedCategoryTick } from '../components/ChartTicks';
import { CRSPageIntro } from '../components/CRSPageIntro';
import { crsFmt } from '../data/crsData';
import { LOW_CARBON_OLD_SCREENER_DIMENSIONS, LOW_CARBON_OLD_SCREENER_RANKING } from '../data/lowCarbonScreenerData';
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
const LOW_CARBON_ASSESSMENT_TEXT =
  'The scores below provide a comparative view of low-carbon transport needs, opportunity, and readiness across economies using the original screener dimensions. The stacked bars show how each detailed dimension contributes to the overall 100-point score.';

const LOW_CARBON_DIMENSION_COLORS: Record<string, string> = {
  Infrastructure: '#5B8DEF',
  'Transport Activity': '#67A9CF',
  'Fuel Transition': '#7FCDBB',
  'Transport Carbon Emissions': '#F6A57A',
  'Low Carbon Transport Policies': '#B8A1E3',
  'Co-Benefits': '#D98CB3',
  'Economic and Financial': '#E6C16A',
  Institutional: '#95A3B8',
  'International Support': '#5FA08D',
};

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

function ScreenerStackTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((item: any) => Number(item.value) > 0);
  const total = rows.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[12px] text-slate-600">Overall score: <span className="font-medium text-slate-900">{total.toFixed(1)}</span></p>
      <div className="mt-2 space-y-1.5">
        {rows.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[12px]">
            <span style={{ color: item.color }}>{item.dataKey}</span>
            <span className="font-medium text-slate-700">{Number(item.value).toFixed(1)}</span>
          </div>
        ))}
      </div>
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
  const lowCarbonRanking = useMemo(
    () => LOW_CARBON_OLD_SCREENER_RANKING.map((row) => ({
      ...row,
      ...Object.fromEntries(row.oldDimensions.map((dimension) => [dimension.dimension, dimension.score])),
    })),
    [],
  );
  const lowCarbonRankingHeight = Math.max(620, lowCarbonRanking.length * 25 + 80);
  const measureLabel = measure.includes('commitment') ? 'Commitments' : 'Disbursements';
  const activeFinanceLabel = measure.includes('commitment') ? 'Commitments' : 'Disbursements';
  const activeFinanceSub = measure.includes('commitment')
    ? 'Total commitments, constant 2024 USD'
    : 'Total disbursements, constant 2024 USD';

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <CRSPageIntro
          title="Regional Overview"
          note="The section on financing is based on data from the OECD (2026)."
        >
          <p>
            This regional overview page provides a high-level snapshot of transport development finance in Asia and the Pacific. It summarizes the current selection through key indicators such as commitments, disbursements, financial instruments, recipient economies, providers, and transport subsectors.
          </p>
          <p>
            Users can explore how finance is distributed across economies, modes, and development priorities, including low-carbon, resilient, safe, and inclusive transport. The page also highlights the largest recipients and providers in the current filtered selection, allowing users to see which economies and institutions account for the largest shares of reported transport development finance. Use the filters to refine the selection and explore the information most relevant to you.
          </p>
        </CRSPageIntro>

        <CRSPageFilters
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          enabled={['year', 'mode', 'sector', 'basis']}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label={activeFinanceLabel} value={crsFmt.usdM(stats[measure] ?? 0)} sub={activeFinanceSub} />
          <KPICard label="Recipients" value={crsFmt.num(stats.recipientCount)} sub="ATO economies and Asia regional recipients" />
          <KPICard label="Donors" value={crsFmt.num(stats.donorCount)} sub="Finance sources in view" />
          <KPICard label="Records" value={crsFmt.num(stats.count)} sub="CRS transaction lines" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr,1fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-slate-900 text-sm font-semibold">Recipient Map</p>
              <p className="text-slate-400 text-xs mt-1">Map of ATO economy recipients in the current filtered view. Circles show amounts in constant 2024 USD.</p>
            </div>
            <StyledCRSCountryMap points={countryPoints} measure={measure} viewMode="points" height={500} />
          </div>

          <div className="space-y-6">
            <CRSRankingCard
              title="Top Recipients"
              subtitle="Top recipient economies based on the current filters."
              data={topRecipients}
              measure={measure}
              color="#059669"
            />
            <CRSRankingCard
              title="Top Donors"
              subtitle="Largest finance sources in the current filtered selection."
              data={topDonors}
              measure={measure}
              color="#0F766E"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr,1fr] gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-900 text-sm font-semibold mb-1">Development Finance over Time</p>
            <p className="text-slate-400 text-xs mb-4">{measureLabel} by year and transport mode in the current filtered selection, constant 2024 USD.</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={yearlyModeStack} margin={{ top: 10, right: 20, left: 8, bottom: 10 }} barCategoryGap="8%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis width={CURRENCY_AXIS_WIDTH} tickMargin={8} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(value: number) => crsFmt.usdM(value)} />
                <Tooltip content={<StackedModeTooltip measureLabel={measureLabel} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Rail" stackId="modes" fill={MODE_AREA_COLORS.Rail} maxBarSize={28} />
                <Bar dataKey="Road" stackId="modes" fill={MODE_AREA_COLORS.Road} maxBarSize={28} />
                <Bar dataKey="Water" stackId="modes" fill={MODE_AREA_COLORS.Water} maxBarSize={28} />
                <Bar dataKey="Aviation" stackId="modes" fill={MODE_AREA_COLORS.Aviation} maxBarSize={28} />
                <Bar dataKey="Other" stackId="modes" fill={MODE_AREA_COLORS.Other} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-slate-900 text-base font-semibold mb-1">Transport Modes by Donor</p>
              <p className="text-slate-500 text-sm mb-4">
                Development finance by donor across road, rail, aviation, water, and other transport modes.
              </p>
              <ResponsiveContainer width="100%" height={392}>
                <BarChart data={donorModeStack} layout="vertical" margin={{ top: 0, right: 18, left: 18, bottom: 0 }} barCategoryGap={7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(value) => crsFmt.usdM(value)} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={250}
                    tickLine={false}
                    axisLine={false}
                    tick={<WrappedCategoryTick maxChars={24} fontSize={12} fill="#334155" lineHeight={14} />}
                    interval={0}
                  />
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
          title="Finance Flows"
          subtitle="Donor to agency to recipient pathways in the current filtered view."
          sankeyOptions={{ topDonors: 10, topAgencies: 10, topRecipients: 10, groupOtherNodes: true }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CRSRankingCard
            title="Transport Modes"
            subtitle="Transport mode distribution in the current filtered selection."
            data={modeSeries}
            measure={measure}
            color="#8B5CF6"
          />
          <CRSRankingCard
            title="Sustainability-related Tags"
            subtitle="Total tagged volume by sustainability-related tag in the current filtered selection."
            data={sectorSeries}
            measure={measure}
            color="#0EA5E9"
            footnote="Pre-defined tags based on the OECD CRS database."
          />
          <CRSRankingCard
            title="Finance Flow Types"
            subtitle="Finance flow type by which development finance is provided."
            data={financingSeries}
            measure={measure}
            color="#334155"
          />
        </div>

        <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
          <div className="mb-4 border-b border-sky-100 pb-4">
            <p className="text-slate-900 text-base font-semibold">Low-Carbon Transport Needs, Opportunity and Readiness Assessment</p>
            <p className="mt-2 w-full text-sm leading-6 text-slate-600 sm:text-justify">{LOW_CARBON_ASSESSMENT_TEXT}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-1 text-sm font-semibold text-slate-900">Economy Ranking</p>
            <p className="mb-4 text-xs text-slate-400">Original screener score by detailed dimension, sorted highest to lowest.</p>
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
                <Tooltip content={<ScreenerStackTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {LOW_CARBON_OLD_SCREENER_DIMENSIONS.map((dimension, index) => (
                  <Bar
                    key={dimension.dimension}
                    dataKey={dimension.dimension}
                    stackId="score"
                    fill={LOW_CARBON_DIMENSION_COLORS[dimension.dimension] ?? '#0EA5E9'}
                    maxBarSize={12}
                    radius={index === LOW_CARBON_OLD_SCREENER_DIMENSIONS.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]}
                  >
                    {index === LOW_CARBON_OLD_SCREENER_DIMENSIONS.length - 1 ? (
                      <LabelList
                        dataKey="oldScore"
                        position="right"
                        formatter={(value: number) => value.toFixed(1)}
                        style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                      />
                    ) : null}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
