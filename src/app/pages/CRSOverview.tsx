import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, Globe, Landmark, MapPinned, Activity, Wind, Waves } from 'lucide-react';
import { estimateCategoryAxisWidth, TruncatedCategoryTick } from '../components/ChartTicks';
import { KPICard } from '../components/KPICard';
import { StyledCRSCountryMap } from '../components/StyledCRSCountryMap';
import { CRSSankey } from '../components/CRSSankey';
import { CRSGlobalFilters } from '../components/CRSGlobalFilters';
import { CRSThematicAnalysis } from '../components/CRSThematicAnalysis';
import { CRS_MODE_COLORS, crsFmt, CRS_SANKEY_DATA } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import {
  aggregateFacts,
  buildCountryMapPoints,
  getLatestYearChange,
  summarizeFacts,
  buildSustainabilityTrend,
  buildFlowSankeyData,
} from '../utils/crsAggregations';

const ATO_COLORS = {
  navy: '#002147',
  cyan: '#00ADEF',
  teal: '#76B7B2',
  orange: '#F28E2B',
  red: '#E15759',
  green: '#59A14F',
  slate: '#94a3b8'
};

type MapView = 'points' | 'heatmap';

export function CRSOverview() {
  const { filteredFacts, filters } = useCRSFilters();
  const [mapView, setMapView] = useState<MapView>('points');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const isConstant = filters.isConstantUSD;
  const measure = filters.measure;
  const activeMeasure = isConstant ? (measure === 'commitment' ? 'commitment_defl' : 'disbursement_defl') : measure;

  const stats = useMemo(() => summarizeFacts(filteredFacts), [filteredFacts]);
  const sustainabilityTrend = useMemo(() => buildSustainabilityTrend(filteredFacts, isConstant), [filteredFacts, isConstant]);
  
  const modeSeries = useMemo(() => {
     return aggregateFacts(filteredFacts, (fact) => fact.mode).slice(0, 5);
  }, [filteredFacts]);

  const mapPoints = useMemo(() => buildCountryMapPoints(filteredFacts), [filteredFacts]);
  
  const selectedCountryProfile = useMemo(
    () => mapPoints.find((point) => point.recipient === selectedCountry) ?? mapPoints[0] ?? null,
    [mapPoints, selectedCountry],
  );

  const { topDonors, topAgencies, topRecipients, donorWidth, agencyWidth, recipientWidth } = useMemo(() => {
    const donorMap: Record<string, number> = {};
    const agencyMap: Record<string, number> = {};
    const recipientMap: Record<string, number> = {};
    
    filteredFacts.forEach(f => {
      const val = isConstant ? (f.commitment_defl ?? f.commitment) : f.commitment;
      const dVal = isConstant ? (f.disbursement_defl ?? f.disbursement) : f.disbursement;
      const activeVal = measure === 'commitment' ? val : dVal;
      
      donorMap[f.donor] = (donorMap[f.donor] || 0) + activeVal;
      agencyMap[f.agency] = (agencyMap[f.agency] || 0) + activeVal;
      recipientMap[f.recipient] = (recipientMap[f.recipient] || 0) + activeVal;
    });

    const sortFn = (a: [string, number], b: [string, number]) => b[1] - a[1];

    const donorList = Object.entries(donorMap).sort(sortFn).slice(0, 10).map(([label, value]) => ({ label, value }));
    const agencyList = Object.entries(agencyMap).sort(sortFn).slice(0, 10).map(([label, value]) => ({ label, value }));
    const recipientList = Object.entries(recipientMap).sort(sortFn).slice(0, 10).map(([label, value]) => ({ label, value }));

    return { 
      topDonors: donorList, 
      topAgencies: agencyList, 
      topRecipients: recipientList,
      donorWidth: estimateCategoryAxisWidth(donorList.map(i => i.label), { maxChars: 20, minWidth: 100, maxWidth: 160 }),
      agencyWidth: estimateCategoryAxisWidth(agencyList.map(i => i.label), { maxChars: 20, minWidth: 100, maxWidth: 160 }),
      recipientWidth: estimateCategoryAxisWidth(recipientList.map(i => i.label), { maxChars: 20, minWidth: 100, maxWidth: 160 }),
    };
  }, [filteredFacts, isConstant, measure]);

  const sankeyData = useMemo(() => {
    return buildFlowSankeyData(filteredFacts, activeMeasure as any);
  }, [filteredFacts, activeMeasure]);

  return (
    <div className="p-8 bg-[#F9F9F9] min-h-screen font-opensans">
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-[#002147] text-3xl font-black tracking-tighter uppercase font-lato">Transport Intelligence Overview</h1>
            <p className="text-[#6B7280] text-[13px] mt-2 font-semibold">
              Global portfolio analytics focusing on <span className="text-[#002147] font-black">financial flows</span> and <span className="text-[#00ADEF] font-black">sustainability shifts</span>.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-md">
             <div>
               <p className="text-[#94A3B8] text-[10px] uppercase font-black tracking-widest">Active Basis</p>
               <p className="text-[#00ADEF] text-xs font-black capitalize">{isConstant ? 'Constant USD' : 'Current USD'}</p>
             </div>
             <Activity size={20} className="text-[#00ADEF]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            label="Total Amount"
            value={crsFmt.usdM(isConstant ? stats.commitment_defl : stats.commitment)}
            sub={`Gross ${measure}s in view`}
            icon={<DollarSign size={16} />}
            accent="navy"
          />
          <KPICard
            label="Sustainability Share"
            value={`${sustainabilityTrend.length > 0 ? sustainabilityTrend.at(-1)?.sustainableShare.toFixed(1) : 0}%`}
            sub="Tagged for Climate/Mitigation"
            icon={<Wind size={16} />}
            accent="cyan"
          />
          <KPICard
            label="Mapped Economies"
            value={crsFmt.num(stats.countryRecipientCount)}
            sub="Official ADB standard economies"
            icon={<Globe size={16} />}
            accent="teal"
          />
          <KPICard
            label="Total Records"
            value={crsFmt.num(filteredFacts.reduce((sum, f) => sum + f.count, 0))}
            sub="Individual project entries"
            icon={<Waves size={16} />}
            accent="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-8">
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#F3F4F6]">
                <p className="text-[#002147] text-lg font-black uppercase font-lato">Investment Flows (Sankey)</p>
                <p className="text-[#94A3B8] text-[11px] mt-1 font-bold uppercase tracking-widest text-[#00ADEF]">Donor ➔ Mode ➔ Recipient Region</p>
              </div>
              <div className="h-[480px] p-6">
                <CRSSankey data={sankeyData} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-md">
                  <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top Donors</p>
                  <p className="text-[10px] text-[#94A3B8] mb-8 font-bold uppercase">Lending volume by source</p>
                  <div className="h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDonors} layout="vertical" margin={{ left: 10, right: 20, bottom: 40 }}>
                           <XAxis type="number" fontSize={9} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                              <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                           </XAxis>
                           <YAxis type="category" dataKey="label" tick={<TruncatedCategoryTick maxChars={20} />} width={donorWidth} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval={0} />
                           <Tooltip formatter={(v: number) => crsFmt.usdM(v)} contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                           <Bar dataKey="value" fill={ATO_COLORS.navy} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-md">
                  <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top Agencies</p>
                  <p className="text-[10px] text-[#94A3B8] mb-8 font-bold uppercase">Implementing entities</p>
                  <div className="h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topAgencies} layout="vertical" margin={{ left: 10, right: 20, bottom: 40 }}>
                           <XAxis type="number" fontSize={9} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                              <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                           </XAxis>
                           <YAxis type="category" dataKey="label" tick={<TruncatedCategoryTick maxChars={20} />} width={agencyWidth} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval={0} />
                           <Tooltip formatter={(v: number) => crsFmt.usdM(v)} contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                           <Bar dataKey="value" fill={ATO_COLORS.cyan} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-md">
                  <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Top Recipients</p>
                  <p className="text-[10px] text-[#94A3B8] mb-8 font-bold uppercase">Destination economies</p>
                  <div className="h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topRecipients} layout="vertical" margin={{ left: 10, right: 20, bottom: 40 }}>
                           <XAxis type="number" fontSize={9} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                              <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                           </XAxis>
                           <YAxis type="category" dataKey="label" tick={<TruncatedCategoryTick maxChars={20} />} width={recipientWidth} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval={0} />
                           <Tooltip formatter={(v: number) => crsFmt.usdM(v)} contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                           <Bar dataKey="value" fill={ATO_COLORS.teal} radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-md">
              <p className="text-[#002147] text-lg font-black uppercase mb-1 font-lato">Sustainability Trend</p>
              <p className="text-[#94A3B8] text-[11px] mb-8 font-bold uppercase tracking-widest text-[#59A14F]">Climate-tagged vs total portfolio</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={sustainabilityTrend} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                     <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ATO_COLORS.slate} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={ATO_COLORS.slate} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="sustainableColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ATO_COLORS.green} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={ATO_COLORS.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}>
                    <Label value="Reporting Year" position="bottom" offset={0} fontSize={9} fontWeight={900} fill="#cbd5e1" className="uppercase tracking-widest" />
                  </XAxis>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => crsFmt.usdM(v)}>
                    <Label value="Volume ($M USD)" angle={-90} position="insideLeft" offset={0} fontSize={9} fontWeight={900} fill="#cbd5e1" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                  </YAxis>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(v: number) => crsFmt.usdM(v)} />
                  <Area type="monotone" dataKey="total" stroke={ATO_COLORS.slate} strokeWidth={2} fillOpacity={1} fill="url(#totalColor)" />
                  <Area type="monotone" dataKey="sustainable" stroke={ATO_COLORS.green} strokeWidth={3} fillOpacity={1} fill="url(#sustainableColor)" />
                </AreaChart>
              </ResponsiveContainer>

               <div className="mt-8 flex items-center justify-center gap-8">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#94A3B8]" />
                      <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Total Finance</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#59A14F]" />
                      <span className="text-[10px] font-black text-[#59A14F] uppercase tracking-widest">Sustainable</span>
                  </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-md">
              <p className="text-[#002147] text-lg font-black uppercase mb-6 font-lato">Transport Mode Mix</p>
              <div className="space-y-6">
                {modeSeries.map((mode) => (
                  <div key={mode.label}>
                    <div className="flex justify-between text-[11px] mb-2 px-0.5">
                      <span className="text-[#374151] font-black uppercase tracking-tight">{mode.label}</span>
                      <span className="text-[#002147] font-black tabular-nums">{crsFmt.usdM(mode[activeMeasure] ?? mode[measure])}</span>
                    </div>
                    <div className="h-3 bg-[#F9F9F9] rounded-full overflow-hidden p-[2px] border border-[#F3F4F6]">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                        style={{
                          width: `${(mode[activeMeasure] / Math.max(modeSeries[0]?.[activeMeasure] || 1, 1)) * 100}%`,
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

        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md overflow-hidden">
            <div className="p-6 border-b border-[#F3F4F6] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[#002147] text-lg font-black uppercase font-lato">Spatial Concentration</p>
                <p className="text-[#94A3B8] text-[11px] mt-1 font-bold uppercase tracking-widest text-[#00ADEF]">Mapped economies standard totals</p>
              </div>
              <div className="text-[#002147] text-[10px] font-black bg-[#F9F9F9] px-4 py-2 rounded-lg border border-[#F3F4F6] uppercase tracking-widest">
                Viewing: {measure === 'commitment' ? 'COMMITMENTS' : 'DISBURSEMENTS'}
              </div>
            </div>
            <StyledCRSCountryMap
              points={mapPoints}
              viewMode={mapView}
              measure={measure}
              height={520}
              onCountrySelect={setSelectedCountry}
            />
        </div>

        <CRSThematicAnalysis facts={filteredFacts} isConstant={filters.isConstantUSD} />
      </div>
    </div>
  );
}
