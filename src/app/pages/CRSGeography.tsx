import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Flame, MapPinned, Orbit } from 'lucide-react';
import { estimateCategoryAxisWidth, WrappedCategoryTick } from '../components/ChartTicks';
import { StyledCRSCountryMap } from '../components/StyledCRSCountryMap';
import { crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import { aggregateFacts, buildCountryMapPoints, type CRSMeasure } from '../utils/crsAggregations';

type MapView = 'points' | 'heatmap';

export function CRSGeography() {
  const { filteredFacts } = useCRSFilters();
  const [measure, setMeasure] = useState<CRSMeasure>('commitment');
  const [mapView, setMapView] = useState<MapView>('points');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const countryPoints = useMemo(() => buildCountryMapPoints(filteredFacts), [filteredFacts]);
  const topCountries = useMemo(
    () => aggregateFacts(filteredFacts.filter((fact) => fact.recipient_scope === 'economy'), (fact) => fact.recipient).slice(0, 15),
    [filteredFacts],
  );
  const regionalRecipients = useMemo(
    () => aggregateFacts(filteredFacts.filter((fact) => fact.recipient_scope === 'regional'), (fact) => fact.recipient_region_detail || fact.recipient).slice(0, 12),
    [filteredFacts],
  );
  const broadRegions = useMemo(() => aggregateFacts(filteredFacts, (fact) => fact.region).slice(0, 8), [filteredFacts]);
  const countryAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(topCountries.map((item) => item.label), { maxChars: 18, minWidth: 170, maxWidth: 236 }),
    [topCountries],
  );
  const broadRegionAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(broadRegions.map((item) => item.label), { maxChars: 18, minWidth: 170, maxWidth: 236 }),
    [broadRegions],
  );
  const selectedCountryProfile = useMemo(
    () => countryPoints.find((point) => point.recipient === selectedCountry) ?? countryPoints[0] ?? null,
    [countryPoints, selectedCountry, topCountries],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Recipient Geography</h1>
          <p className="text-slate-500 text-base mt-1">
            Economy totals on the map, with regional recipients broken out separately for analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1.8fr,1fr] gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-slate-900 text-lg font-semibold">Economy Totals Map</p>
              <p className="text-slate-500 text-[15px] mt-0.5 font-normal">
                Click an economy point to sync the geography profile card.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setMeasure('commitment')}
                  className={`px-3 py-1.5 text-[15px] font-medium rounded-md ${measure === 'commitment' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Commitments
                </button>
                <button
                  onClick={() => setMeasure('disbursement')}
                  className={`px-3 py-1.5 text-[15px] font-medium rounded-md ${measure === 'disbursement' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Disbursements
                </button>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setMapView('points')}
                  className={`px-4 py-1.5 text-[15px] font-medium rounded-md flex items-center gap-1.5 ${mapView === 'points' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Orbit size={16} />
                  Points
                </button>
                <button
                  onClick={() => setMapView('heatmap')}
                  className={`px-4 py-1.5 text-[15px] font-medium rounded-md flex items-center gap-1.5 ${mapView === 'heatmap' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Flame size={16} />
                  Heatmap
                </button>
              </div>
            </div>
          </div>
          <StyledCRSCountryMap
            points={countryPoints}
            measure={measure}
            viewMode={mapView}
            height={500}
            onCountrySelect={setSelectedCountry}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPinned size={14} className="text-emerald-600" />
            <p className="text-slate-900 text-lg font-semibold">Selected Economy</p>
            </div>
            {selectedCountryProfile ? (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-900 text-2xl font-semibold tracking-tight">{selectedCountryProfile.recipient}</p>
                  <p className="text-slate-500 text-base mt-0.5">{selectedCountryProfile.region}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                    <p className="text-[14px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Commitments</p>
                    <p className="text-slate-900 text-xl font-semibold tabular-nums">
                      {crsFmt.usdM(selectedCountryProfile.commitment)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                    <p className="text-[14px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Disbursements</p>
                    <p className="text-slate-900 text-xl font-semibold tabular-nums">
                      {crsFmt.usdM(selectedCountryProfile.disbursement)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                  <p className="text-[14px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Project Count</p>
                  <p className="text-slate-900 text-xl font-semibold tabular-nums">
                    {crsFmt.num(selectedCountryProfile.count)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-base text-slate-500">No economy-level data is available under the current filters.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-900 text-lg font-semibold mb-1">Regional Recipients</p>
            <p className="text-slate-500 text-[15px] mb-4 font-normal leading-relaxed">
              Recipients ending with “, regional” are indexed here as they represent non-point spatial features.
            </p>
            <div className="space-y-2.5">
              {regionalRecipients.slice(0, 8).map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[15px]">
                  <span className="text-slate-600 truncate pr-3 font-medium">{row.label}</span>
                  <span className="text-slate-900 font-semibold tabular-nums">{crsFmt.usdM(row[measure])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-900 text-lg font-semibold mb-1">Top Recipient Economies</p>
          <p className="text-slate-500 text-[15px] mb-4 font-normal">Economy-level totals sorted by the active financial measure.</p>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={topCountries} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 15, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={countryAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 15, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={15}>
                {topCountries.map((row) => (
                  <Cell key={row.label} fill="#059669" fillOpacity={0.82} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-900 text-lg font-semibold mb-1">Broad Region Distribution</p>
          <p className="text-slate-500 text-[15px] mb-4 font-normal">Volume distribution across aggregate regional classifications.</p>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={broadRegions} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 15, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={broadRegionAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 15, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={18}>
                {broadRegions.map((row) => (
                  <Cell key={row.label} fill="#0F766E" fillOpacity={0.82} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
