import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, Flame, Globe, Landmark, MapPinned, Orbit } from 'lucide-react';
import { estimateCategoryAxisWidth, WrappedCategoryTick } from '../components/ChartTicks';
import { KPICard } from '../components/KPICard';
import { StyledCRSCountryMap } from '../components/StyledCRSCountryMap';
import { CRS_MODE_COLORS, crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import {
  aggregateFacts,
  buildCountryMapPoints,
  buildYearSeries,
  getLatestYearChange,
  summarizeFacts,
  type CRSMeasure,
} from '../utils/crsAggregations';

type MapView = 'points' | 'heatmap';

export function CRSOverview() {
  const { filteredFacts } = useCRSFilters();
  const [mapView, setMapView] = useState<MapView>('points');
  const [measure, setMeasure] = useState<CRSMeasure>('commitment');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const stats = useMemo(() => summarizeFacts(filteredFacts), [filteredFacts]);
  const yearSeries = useMemo(() => buildYearSeries(filteredFacts), [filteredFacts]);
  const modeSeries = useMemo(() => aggregateFacts(filteredFacts, (fact) => fact.mode).slice(0, 5), [filteredFacts]);
  const topRecipients = useMemo(
    () => aggregateFacts(filteredFacts.filter((fact) => fact.recipient_scope === 'economy'), (fact) => fact.recipient).slice(0, 10),
    [filteredFacts],
  );
  const mapPoints = useMemo(() => buildCountryMapPoints(filteredFacts), [filteredFacts]);
  const topRecipientAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topRecipients.map((item) => item.label), { maxChars: 18, minWidth: 168, maxWidth: 228 }),
    [topRecipients],
  );
  const selectedCountryProfile = useMemo(
    () => mapPoints.find((point) => point.recipient === selectedCountry) ?? mapPoints[0] ?? null,
    [mapPoints, selectedCountry],
  );
  const latestYearChange = useMemo(() => getLatestYearChange(), []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 text-xl font-semibold">CRS Transport Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Consolidated commitments and disbursements by donor, recipient, transport mode, and year.
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-[11px] uppercase tracking-wide">Portfolio framing</p>
          <p className="text-slate-700 text-sm">Country totals, donor flows, and mode mix</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Commitments"
          value={crsFmt.usdM(stats.commitment)}
          sub={`${crsFmt.num(stats.count)} transport records in view`}
          icon={<DollarSign size={15} />}
          accent="green"
          trend={latestYearChange ? `${latestYearChange >= 0 ? '+' : ''}${latestYearChange.toFixed(1)}% vs prior year` : undefined}
        />
        <KPICard
          label="Disbursements"
          value={crsFmt.usdM(stats.disbursement)}
          sub="gross disbursement amount"
          icon={<Landmark size={15} />}
          accent="blue"
        />
        <KPICard
          label="Recipient Countries"
          value={crsFmt.num(stats.countryRecipientCount)}
          sub={`${crsFmt.num(stats.regionalRecipientCount)} regional recipients tracked separately`}
          icon={<Globe size={15} />}
          accent="purple"
        />
        <KPICard
          label="Mapped Countries"
          value={crsFmt.num(mapPoints.length)}
          sub="country-level aggregate map points"
          icon={<MapPinned size={15} />}
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-slate-900 text-sm font-semibold">Country Totals Map</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Aggregated by recipient country only. Regional recipients stay out of the country map.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setMeasure('commitment')}
                  className={`px-3 py-1.5 text-xs rounded-md ${measure === 'commitment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  Commitments
                </button>
                <button
                  onClick={() => setMeasure('disbursement')}
                  className={`px-3 py-1.5 text-xs rounded-md ${measure === 'disbursement' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  Disbursements
                </button>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setMapView('points')}
                  className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 ${mapView === 'points' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  <Orbit size={12} />
                  Points
                </button>
                <button
                  onClick={() => setMapView('heatmap')}
                  className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 ${mapView === 'heatmap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  <Flame size={12} />
                  Heatmap
                </button>
              </div>
            </div>
          </div>
          <StyledCRSCountryMap
            points={mapPoints}
            viewMode={mapView}
            measure={measure}
            height={460}
            onCountrySelect={setSelectedCountry}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-800 text-sm font-semibold mb-1">Country Snapshot</p>
            <p className="text-slate-400 text-xs mb-4">Click a point on the map to inspect a country profile.</p>
            {selectedCountryProfile ? (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-900 text-lg font-semibold">{selectedCountryProfile.recipient}</p>
                  <p className="text-slate-500 text-xs">{selectedCountryProfile.region}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Commitments</p>
                    <p className="text-slate-900 text-sm font-semibold mt-1">{crsFmt.usdM(selectedCountryProfile.commitment)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Disbursements</p>
                    <p className="text-slate-900 text-sm font-semibold mt-1">{crsFmt.usdM(selectedCountryProfile.disbursement)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Transport records</p>
                  <p className="text-slate-900 text-sm font-semibold mt-1">{crsFmt.num(selectedCountryProfile.count)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No country-level rows are available for the current filter combination.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-800 text-sm font-semibold mb-3">Mode Mix</p>
            <div className="space-y-2.5">
              {modeSeries.map((mode) => (
                <div key={mode.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{mode.label}</span>
                    <span className="text-slate-800 font-medium">{crsFmt.usdM(mode[measure])}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(mode[measure] / Math.max(modeSeries[0]?.[measure] || 1, 1)) * 100}%`,
                        backgroundColor: CRS_MODE_COLORS[mode.label] ?? '#94A3B8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Finance Over Time</p>
          <p className="text-slate-400 text-xs mb-4">Current filtered CRS transport flows by year</p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={yearSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="crsOverviewArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']}
              />
              <Area type="monotone" dataKey={measure} stroke="#059669" fill="url(#crsOverviewArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Top Recipient Countries</p>
          <p className="text-slate-400 text-xs mb-4">Country totals under the current filter view</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={topRecipients} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={topRecipientAxisWidth} interval={0} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']}
              />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={14}>
                {topRecipients.map((entry) => (
                  <Cell key={entry.label} fill="#059669" fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
