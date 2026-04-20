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
    <div className="p-8 bg-[#F9F9F9] min-h-screen font-opensans">
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div>
          <h1 className="text-[#002147] text-3xl font-black tracking-tighter uppercase font-lato">Recipient Geography</h1>
          <p className="text-[#6B7280] text-[13px] mt-2 font-semibold">
            Country totals on the map, with regional recipients broken out separately for institutional analysis.
          </p>
        </div>

      <div className="grid grid-cols-[1.8fr,1fr] gap-6">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md overflow-hidden">
          <div className="px-8 py-6 border-b border-[#F3F4F6] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[#002147] text-sm font-black uppercase font-lato">Country Totals Map</p>
              <p className="text-[#94A3B8] text-[11px] mt-1 font-semibold">
                Click a country point to sync the geography profile card.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-[#F9F9F9] p-1 border border-[#E5E7EB]">
                <button
                  onClick={() => setMeasure('commitment')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${measure === 'commitment' ? 'bg-[#002147] text-white shadow-md' : 'text-[#94A3B8] hover:text-[#002147]'}`}
                >
                  Commitments
                </button>
                <button
                  onClick={() => setMeasure('disbursement')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${measure === 'disbursement' ? 'bg-[#002147] text-white shadow-md' : 'text-[#94A3B8] hover:text-[#002147]'}`}
                >
                  Disbursements
                </button>
              </div>
              <div className="inline-flex rounded-lg bg-[#F9F9F9] p-1 border border-[#E5E7EB]">
                <button
                  onClick={() => setMapView('points')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-2 transition-all ${mapView === 'points' ? 'bg-[#00ADEF] text-white shadow-md' : 'text-[#94A3B8]'}`}
                >
                  <Orbit size={12} />
                  Points
                </button>
                <button
                  onClick={() => setMapView('heatmap')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-2 transition-all ${mapView === 'heatmap' ? 'bg-[#00ADEF] text-white shadow-md' : 'text-[#94A3B8]'}`}
                >
                  <Flame size={12} />
                  Heatmap
                </button>
              </div>
            </div>
          </div>
          <StyledCRSCountryMap
            points={countryPoints}
            measure={measure}
            viewMode={mapView}
            height={550}
            onCountrySelect={setSelectedCountry}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-[#002147] rounded-xl border border-white/10 shadow-xl p-8 text-white relative overflow-hidden">
             {/* Decoration */}
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
             
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <MapPinned size={16} className="text-[#00ADEF]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8] font-lato">Profile Insight</p>
            </div>
            {selectedCountryProfile ? (
              <div className="space-y-6 relative z-10">
                <div>
                  <p className="text-3xl font-black tracking-tighter uppercase font-lato">{selectedCountryProfile.recipient}</p>
                  <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mt-1">{selectedCountryProfile.region}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#94A3B8] mb-1.5">Commitments</p>
                    <p className="text-white text-lg font-black tabular-nums font-lato">
                      {crsFmt.usdM(selectedCountryProfile.commitment)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#94A3B8] mb-1.5">Disbursements</p>
                    <p className="text-white text-lg font-black tabular-nums font-lato">
                      {crsFmt.usdM(selectedCountryProfile.disbursement)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#94A3B8] mb-1.5">Transaction Records</p>
                  <p className="text-[#00ADEF] text-xl font-black tabular-nums font-lato">
                    {crsFmt.num(selectedCountryProfile.count)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] font-semibold italic">No regional intelligence available for this selection.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
            <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Regional Overlays</p>
            <p className="text-[#94A3B8] text-[10px] font-bold mb-6">
              Multi-recipient programs tracked separately
            </p>
            <div className="space-y-3">
              {regionalRecipients.slice(0, 8).map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[11px] font-black border-b border-[#F3F4F6] pb-2 last:border-0">
                  <span className="text-[#64748B] truncate pr-4 font-lato uppercase tracking-tight">{row.label}</span>
                  <span className="text-[#002147] tabular-nums">{crsFmt.usdM(row[measure])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
          <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top Recipient Economies</p>
          <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">Direct country-level totals</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topCountries} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} fontSize={9} fontWeight={900} fill="#64748B" />} tickLine={false} axisLine={false} width={countryAxisWidth} interval={0} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 4, 4, 0]} maxBarSize={16}>
                {topCountries.map((row) => (
                  <Cell key={row.label} fill="#002147" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8">
          <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Broad Region Aggregates</p>
          <p className="text-[#94A3B8] text-[10px] font-black uppercase mb-8">Macro-regional distribution</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={broadRegions} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} fontSize={9} fontWeight={900} fill="#64748B" />} tickLine={false} axisLine={false} width={broadRegionAxisWidth} interval={0} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 4, 4, 0]} maxBarSize={20}>
                {broadRegions.map((row) => (
                  <Cell key={row.label} fill="#76B7B2" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
  );
}
