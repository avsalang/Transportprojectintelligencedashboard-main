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
    <div className="p-6 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Transport Intelligence Overview</h1>
            <p className="text-slate-500 text-base mt-1">
              Global portfolio analytics focusing on <span className="text-slate-900 font-medium">financial flows</span> and <span className="text-blue-600 font-medium">sustainability shifts</span>.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
             <div className="text-right">
               <p className="text-slate-500 text-[14px] uppercase font-semibold tracking-widest">Active Basis</p>
               <p className="text-blue-600 text-[15px] font-semibold capitalize">{isConstant ? 'Constant USD (Deflated)' : 'Current USD (Nominal)'}</p>
             </div>
             <Activity size={18} className="text-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label="Total Amount"
            value={crsFmt.usdM(isConstant ? stats.commitment_defl : stats.commitment)}
            sub={`Gross ${measure}s in view`}
            icon={<DollarSign size={15} />}
            accent="blue"
          />
          <KPICard
            label="Sustainability Share"
            value={`${sustainabilityTrend.length > 0 ? sustainabilityTrend.at(-1)?.sustainableShare.toFixed(1) : 0}%`}
            sub="Tagged for Climate/Mitigation"
            icon={<Wind size={15} />}
            accent="green"
          />
          <KPICard
            label="Mapped Economies"
            value={crsFmt.num(stats.countryRecipientCount)}
            sub="Official ADB standard economies"
            icon={<Globe size={15} />}
            accent="purple"
          />
          <KPICard
            label="Total Records"
            value={crsFmt.num(filteredFacts.reduce((sum, f) => sum + f.count, 0))}
            sub="Individual project entries"
            icon={<Waves size={15} />}
            accent="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-900 text-lg font-semibold">Investment Flows (Sankey)</p>
                  <p className="text-slate-500 text-[15px] mt-0.5 font-normal">Donor ➔ Mode ➔ Recipient Region</p>
                </div>
              </div>
              <div className="h-[460px] p-4">
                <CRSSankey data={sankeyData} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Top Donors */}
               <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Top Donors</p>
                  <p className="text-[15px] text-slate-500 mb-6 font-normal">Lending volume by source</p>
                  <div className="h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDonors} layout="vertical" margin={{ left: 10, right: 20, bottom: 40 }}>
                           <XAxis type="number" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                              <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                           </XAxis>
                           <YAxis 
                              type="category" 
                              dataKey="label" 
                              tick={<TruncatedCategoryTick maxChars={20} />} 
                              width={donorWidth} 
                              tickLine={false} 
                              axisLine={{ stroke: '#cbd5e1' }} 
                              interval={0}
                           >
                              <Label 
                                 value="Funding Source" 
                                 angle={-90} 
                                 position="insideLeft" 
                                 offset={-50} 
                                 fontSize={14} 
                                 fontWeight={600} 
                                 fill="#64748b" 
                                 className="uppercase tracking-widest" 
                                 style={{ textAnchor: 'middle' }}
                              />
                           </YAxis>
                           <Tooltip formatter={(v: number) => crsFmt.usdM(v)} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                           <Bar dataKey="value" fill="#0F766E" radius={[0, 4, 4, 0]} minBarSize={2} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Top Agencies */}
               <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Top Agencies</p>
                  <p className="text-[15px] text-slate-500 mb-6 font-normal">Technical implementing entities</p>
                  <div className="h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topAgencies} layout="vertical" margin={{ left: 10, right: 20, bottom: 40 }}>
                           <XAxis type="number" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                              <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                           </XAxis>
                           <YAxis 
                              type="category" 
                              dataKey="label" 
                              tick={<TruncatedCategoryTick maxChars={20} />} 
                              width={agencyWidth} 
                              tickLine={false} 
                              axisLine={{ stroke: '#cbd5e1' }} 
                              interval={0}
                           >
                              <Label 
                                 value="Agency" 
                                 angle={-90} 
                                 position="insideLeft" 
                                 offset={-50} 
                                 fontSize={14} 
                                 fontWeight={600} 
                                 fill="#64748b" 
                                 className="uppercase tracking-widest" 
                                 style={{ textAnchor: 'middle' }}
                              />
                           </YAxis>
                           <Tooltip formatter={(v: number) => crsFmt.usdM(v)} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                           <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} minBarSize={2} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Top Recipients */}
               <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Top Recipients</p>
                  <p className="text-[15px] text-slate-500 mb-6 font-normal">Primary destination economies</p>
                  <div className="h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topRecipients} layout="vertical" margin={{ left: 10, right: 20, bottom: 40 }}>
                           <XAxis type="number" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                              <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                           </XAxis>
                           <YAxis 
                              type="category" 
                              dataKey="label" 
                              tick={<TruncatedCategoryTick maxChars={20} />} 
                              width={recipientWidth} 
                              tickLine={false} 
                              axisLine={{ stroke: '#cbd5e1' }} 
                              interval={0}
                           >
                              <Label 
                                 value="Recipient Economy" 
                                 angle={-90} 
                                 position="insideLeft" 
                                 offset={-50} 
                                 fontSize={9} 
                                 fontWeight={800} 
                                 fill="#64748b" 
                                 className="uppercase tracking-widest" 
                                 style={{ textAnchor: 'middle' }}
                              />
                           </YAxis>
                           <Tooltip formatter={(v: number) => crsFmt.usdM(v)} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                           <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} minBarSize={2} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
              <p className="text-slate-900 text-lg font-semibold mb-1">Sustainability Trend</p>
              <p className="text-slate-500 text-[15px] mb-5 font-medium">Sustainable-tagged finance vs total portfolio volume</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={sustainabilityTrend} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                     <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="sustainableColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 15, fill: '#64748b' }} 
                    label={{ value: 'Transaction Year', position: 'insideBottom', offset: -10, fontSize: 15, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 15, fill: '#64748b' }} 
                    tickFormatter={(v) => crsFmt.usdM(v)} 
                    label={{ value: 'Volume (USD Millions)', angle: -90, position: 'insideLeft', offset: 0, dx: -10, fontSize: 15, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(v: number) => [crsFmt.usdM(v), 'Volume']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#totalColor)" />
                  <Area type="monotone" dataKey="sustainable" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#sustainableColor)" />
                </AreaChart>
              </ResponsiveContainer>

               <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                      <span className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Total Finance</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Sustainable Tagged</span>
                  </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <p className="text-slate-900 text-lg font-semibold mb-4 tracking-tight">Transport Mode Mix</p>
              <div className="space-y-4">
                {modeSeries.map((mode) => (
                  <div key={mode.label}>
                    <div className="flex justify-between text-[15px] mb-1.5 px-0.5">
                      <span className="text-slate-700 font-semibold">{mode.label}</span>
                      <span className="text-slate-900 font-semibold">{crsFmt.usdM(mode[activeMeasure] ?? mode[measure])}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-[1px]">
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-900 text-lg font-semibold">Spatial Concentration</p>
                <p className="text-slate-500 text-[15px] mt-0.5 font-medium">Mapped economies standard totals</p>
              </div>
              <div className="text-slate-500 text-[15px] font-semibold uppercase py-2">
                Viewing: {measure === 'commitment' ? 'COMMITMENTS' : 'DISBURSEMENTS'}
              </div>
            </div>
            <StyledCRSCountryMap
              points={mapPoints}
              viewMode={mapView}
              measure={measure}
              height={480}
              onCountrySelect={setSelectedCountry}
            />
        </div>

        <CRSThematicAnalysis facts={filteredFacts} isConstant={filters.isConstantUSD} />
      </div>
    </div>
  );
}
