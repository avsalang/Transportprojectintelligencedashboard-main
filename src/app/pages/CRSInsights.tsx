import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  Cell,
  Label,
  ReferenceLine,
} from 'recharts';
import { 
  ChevronDown
} from 'lucide-react';
import { useCRSFilters } from '../context/CRSFilterContext';
import { buildStrategicInsights, summarizeFacts } from '../utils/crsAggregations';
import { crsFmt } from '../data/crsData';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#64748b', '#2dd4bf', '#fb7185', '#a78bfa'];

function getHeatmapColor(ratio: number) {
  if (ratio >= 90) return 'bg-emerald-500 text-white';
  if (ratio >= 75) return 'bg-emerald-400 text-emerald-950';
  if (ratio >= 50) return 'bg-amber-300 text-amber-950';
  if (ratio >= 25) return 'bg-amber-500 text-white';
  return 'bg-rose-500 text-white';
}

export function CRSInsights() {
  const { filteredFacts, filters } = useCRSFilters();
  const measure = filters.measure;
  const activeMeasure = measure.includes('commitment') ? 'commitment_defl' : 'disbursement_defl';

  const data = useMemo(() => buildStrategicInsights(filteredFacts, activeMeasure), [filteredFacts, activeMeasure]);
  const stats = useMemo(() => summarizeFacts(filteredFacts), [filteredFacts]);

  const scatterData = useMemo(() => {
    return data.entities.slice(0, 60).map(e => ({
      name: e.label,
      commitment: e.commitment,
      disbursement: e.disbursement,
      ratio: e.commitment > 0 ? (e.disbursement / e.commitment) * 100 : 0,
    }));
  }, [data]);

  const maxVal = useMemo(() => {
    if (!scatterData.length) return 1000;
    return Math.max(...scatterData.map(d => Math.max(d.commitment, d.disbursement))) * 1.1;
  }, [scatterData]);

  const bubbleData = useMemo(() => {
    return data.entities.slice(0, 40).map(e => ({
      name: e.label,
      volume: e.commitment,
      greenShare: e.commitment > 0 ? (e.sustainableCommitment / e.commitment) * 100 : 0,
      projectCount: e.count,
    }));
  }, [data]);

  const heatmapDonors = useMemo(() => data.entities.slice(0, 15), [data]);
  const heatmapModes = useMemo(() => data.modes, [data]);

  return (
    <div className="p-8 bg-[#F5F7FA] min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <span className="text-[14px] text-slate-500">Institutional analysis</span>
              </div>
              <h1 className="text-2xl text-slate-900 tracking-tight">Deployment insights</h1>
              <p className="text-slate-500 text-base mt-1">Auditing the disbursement efficiency and sectoral allocation ratio across the global transport portfolio.</p>
           </div>
           <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 min-w-[200px]">
              <p className="text-[14px] text-slate-500">Global deployment ratio</p>
              <p className="text-2xl font-medium text-slate-900 tracking-tight">{((stats.disbursement_defl / (stats.commitment_defl || 1)) * 100).toFixed(1)}%</p>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          
          {/* 1. Implementation Heatmap (Full Width) */}
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
               <div>
                  <h3 className="text-lg text-slate-900 flex items-center gap-2">
                    Disbursement efficiency
                  </h3>
                  <p className="text-[15px] text-slate-500 mt-1">Numerical audit of fund deployment by sub-sector (Disbursement / Commitment)</p>
               </div>
               <div className="flex items-center gap-4">
                  <span className="text-[14px] text-slate-500">0%</span>
                  <div className="h-3 w-48 bg-gradient-to-r from-rose-500 via-amber-300 to-emerald-500 rounded-full" />
                  <span className="text-[14px] text-slate-500">100%</span>
               </div>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar pb-2">
               <div className="min-w-[1000px]">
                  <table className="w-full border-collapse border border-slate-200">
                     <thead>
                        <tr>
                           <th className="w-[280px] border border-slate-200 p-4 bg-slate-50 text-left">
                              <span className="text-[14px] text-slate-500">Funding agency</span>
                           </th>
                           {heatmapModes.map(mode => (
                             <th key={mode} className="border border-slate-200 p-4 bg-slate-50 text-center w-[140px]">
                                <span className="text-[14px] text-slate-500">{mode}</span>
                             </th>
                           ))}
                        </tr>
                      </thead>
                      <tbody>
                         {heatmapDonors.map(donor => (
                           <tr key={donor.label}>
                              <td className="border border-slate-200 p-4 bg-white">
                                 <span className="text-[14px] font-medium text-slate-900 leading-tight line-clamp-2">{donor.label}</span>
                              </td>
                              {heatmapModes.map(mode => {
                                 const val = donor.modes.get(mode);
                                 if (!val || val.commitment === 0) {
                                   return <td key={mode} className="border border-slate-100 bg-slate-50/30"></td>;
                                 }
                                 
                                 const ratio = (val.disbursement / val.commitment) * 100;
                                 const cellColor = getHeatmapColor(ratio);
                                 
                                 return (
                                   <td key={mode} className={`border border-white p-0 text-center transition-all ${cellColor}`}>
                                      <div className="py-6 px-2 flex flex-col items-center justify-center min-h-[90px]">
                                         <span className="text-[14px] font-medium tabular-nums">{ratio.toFixed(1)}%</span>
                                         <span className="text-[12px] mt-1 opacity-70">
                                            Vol: ${val.commitment.toFixed(0)}m
                                         </span>
                                      </div>
                                   </td>
                                 );
                              })}
                           </tr>
                         ))}
                      </tbody>
                  </table>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* 2. Execution Parity (Scatter) */}
            <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-sm flex flex-col h-[550px]">
               <h3 className="text-base text-slate-900 flex items-center gap-2 mb-10">
                 Execution parity (million USD)
               </h3>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis type="number" dataKey="commitment" domain={[0, maxVal]} fontSize={10} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                         <Label value="Aggregate Commitment (million USD)" position="bottom" offset={30} fontSize={10} fontWeight={900} fill="#64748b" className="uppercase tracking-[0.1em]" />
                      </XAxis>
                      <YAxis type="number" dataKey="disbursement" domain={[0, maxVal]} fontSize={10} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                         <Label 
                            value="Aggregate Disbursement (million USD)" 
                            angle={-90} 
                            position="insideLeft" 
                            offset={-30} 
                            fontSize={10} 
                            fontWeight={900} 
                            fill="#64748b" 
                            className="uppercase tracking-[0.1em]" 
                            style={{ textAnchor: 'middle' }}
                         />
                      </YAxis>
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} labelFormatter={() => ''} />
                      <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="5 5" />
                      <Scatter data={scatterData}>
                         {scatterData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.4} />
                         ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* 3. Strategic Alignment (Bubble) */}
            <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-sm flex flex-col h-[550px]">
               <h3 className="text-base text-slate-900 flex items-center gap-2 mb-10">
                 CRS tag alignment
               </h3>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis type="number" dataKey="volume" fontSize={10} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                         <Label value="Portfolio Commitment Scale (million USD)" position="bottom" offset={30} fontSize={10} fontWeight={900} fill="#64748b" className="uppercase tracking-[0.1em]" />
                      </XAxis>
                      <YAxis type="number" dataKey="greenShare" fontSize={10} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} unit="%">
                         <Label 
                            value="CRS Tag Intensity (%)" 
                            angle={-90} 
                            position="insideLeft" 
                            offset={-30} 
                            fontSize={10} 
                            fontWeight={900} 
                            fill="#64748b" 
                            className="uppercase tracking-[0.1em]" 
                            style={{ textAnchor: 'middle' }}
                         />
                      </YAxis>
                      <ZAxis type="number" dataKey="projectCount" range={[50, 500]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={bubbleData}>
                         {bubbleData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} fillOpacity={0.4} />
                         ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* 4. Portfolio DNA (Full Width) */}
          <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-sm overflow-hidden h-[650px] flex flex-col">
             <div className="mb-14">
                <h3 className="text-lg text-slate-900 flex items-center gap-3">
                  Investment by sector (million USD)
                </h3>
                <p className="text-[14px] text-slate-500 mt-2">Cumulative portfolio distribution across transport sectors</p>
             </div>
             
             <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.stackedData} layout="vertical" barSize={35} margin={{ left: 50, right: 30, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={11} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(v) => crsFmt.usdM(v)}>
                       <Label value="Cumulative Portfolio Volume (million USD)" position="bottom" offset={40} fontSize={11} fontWeight={900} fill="#64748b" className="uppercase tracking-[0.1em]" />
                    </XAxis>
                    <YAxis dataKey="label" type="category" width={220} fontSize={11} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#475569' }}>
                       <Label 
                          value="Funding Institution" 
                          angle={-90} 
                          position="insideLeft" 
                          offset={-60} 
                          fontSize={11} 
                          fontWeight={900} 
                          fill="#64748b" 
                          className="uppercase tracking-[0.1em]" 
                          style={{ textAnchor: 'middle' }}
                       />
                    </YAxis>
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }) => {
                        if (active && payload?.length) {
                          const total = payload.reduce((sum, p) => sum + (p.value as number), 0);
                          return (
                            <div className="bg-slate-900 p-6 rounded-sm shadow-2xl border border-white/10 text-white min-w-[280px]">
                               <p className="text-[14px] font-medium text-amber-400 mb-4 pb-2 border-b border-white/5">{label}</p>
                               <div className="space-y-2">
                                  {payload.filter(p => (p.value as number) > 0).sort((a,b) => (b.value as number) - (a.value as number)).map((p) => (
                                    <div key={p.name} className="flex justify-between items-center text-[15px]">
                                       <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                          <span className="text-slate-400">{p.name}</span>
                                       </div>
                                       <span className="tabular-nums tracking-tight">{crsFmt.usdM(p.value as number)}</span>
                                    </div>
                                  ))}
                                  <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center">
                                     <span className="text-[14px] text-white">Total portfolio</span>
                                     <span className="text-base text-white tabular-nums">{crsFmt.usdM(total)}</span>
                                  </div>
                               </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                       verticalAlign="top" 
                       align="right" 
                       iconType="square" 
                       wrapperStyle={{ paddingBottom: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                    />
                    {data.modes.map((mode, i) => (
                      <Bar key={mode} dataKey={mode} stackId="a" fill={COLORS[i % COLORS.length]} radius={0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
