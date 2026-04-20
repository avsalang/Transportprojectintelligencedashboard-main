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
  Network, 
  Target, 
  Leaf, 
  Activity,
  ArrowUpRight,
  ChevronDown,
  Scale,
  AlertCircle
} from 'lucide-react';
import { useCRSFilters } from '../context/CRSFilterContext';
import { buildStrategicInsights, summarizeFacts } from '../utils/crsAggregations';
import { crsFmt } from '../data/crsData';

const COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'];

function getHeatmapColor(ratio: number) {
  if (ratio >= 90) return 'bg-[#59A14F] text-white';
  if (ratio >= 75) return 'bg-[#76B7B2] text-white';
  if (ratio >= 50) return 'bg-[#EDC948] text-slate-900';
  if (ratio >= 25) return 'bg-[#F28E2B] text-white';
  return 'bg-[#E15759] text-white';
}

export function CRSInsights() {
  const { filteredFacts, filters } = useCRSFilters();
  const isConstant = filters.isConstantUSD;
  const measure = filters.measure;
  const activeMeasure = isConstant ? (measure === 'commitment' ? 'commitment_defl' : 'disbursement_defl') : measure;

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
    <div className="p-8 bg-[#F9F9F9] min-h-screen font-opensans">
      <div className="max-w-[1440px] mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-12 rounded-xl border border-[#E5E7EB] shadow-lg">
           <div>
              <div className="flex items-center gap-3 mb-6">
                 <div className="bg-[#002147] p-2.5 rounded-lg text-white shadow-lg">
                    <Activity size={20} />
                 </div>
                 <span className="text-[12px] font-black text-[#002147] uppercase tracking-[0.3em] font-lato">Strategic Analysis</span>
              </div>
              <h1 className="text-4xl font-black text-[#002147] tracking-tighter mb-4 uppercase font-lato">Institutional Deployment Matrix</h1>
              <p className="text-[#6B7280] text-lg font-semibold max-w-3xl leading-relaxed">Auditing the disbursement efficiency and sectoral allocation ratio across the global transport portfolio.</p>
           </div>
           <div className="bg-[#002147] px-10 py-8 rounded-xl min-w-[280px] shadow-xl border border-white/5">
              <p className="text-[11px] font-black text-[#94A3B8] uppercase tracking-widest mb-3 text-center">Global Deployment Ratio</p>
              <p className="text-5xl font-black text-white text-center tracking-tighter tabular-nums">{((stats.disbursement / (stats.commitment || 1)) * 100).toFixed(1)}%</p>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          
          {/* 1. Implementation Heatmap (Full Width) */}
          <div className="bg-white p-10 rounded-xl border border-[#E5E7EB] shadow-md space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-[#002147]">
               <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 font-lato">
                    <ArrowUpRight size={24} className="text-[#00ADEF]" /> Disbursement Ratio Matrix
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] font-black mt-2 uppercase tracking-widest">Numerical audit of fund deployment by sub-sector (Disbursement / Commitment)</p>
               </div>
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-[#94A3B8] uppercase">0%</span>
                  <div className="h-2 w-48 bg-gradient-to-r from-rose-500 via-amber-300 to-emerald-500 rounded-px" />
                  <span className="text-[10px] font-black text-[#94A3B8] uppercase">100%</span>
               </div>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar pb-2">
               <div className="min-w-[1000px]">
                  <table className="w-full border-collapse border border-[#E5E7EB]">
                     <thead>
                        <tr>
                           <th className="w-[280px] border border-[#E5E7EB] p-5 bg-[#F9F9F9] text-left">
                              <span className="text-[11px] font-black text-[#002147] uppercase tracking-widest font-lato">Funding Agency</span>
                           </th>
                           {heatmapModes.map(mode => (
                             <th key={mode} className="border border-[#E5E7EB] p-5 bg-[#F9F9F9] text-center w-[140px]">
                                <span className="text-[11px] font-black text-[#002147] uppercase tracking-widest font-lato">{mode}</span>
                             </th>
                           ))}
                        </tr>
                      </thead>
                      <tbody>
                         {heatmapDonors.map(donor => (
                           <tr key={donor.label}>
                              <td className="border border-[#E5E7EB] p-5 bg-white">
                                 <span className="text-[12px] font-black text-[#002147] uppercase leading-tight line-clamp-2 font-lato">{donor.label}</span>
                              </td>
                              {heatmapModes.map(mode => {
                                 const val = donor.modes.get(mode);
                                 if (!val || val.commitment === 0) {
                                   return <td key={mode} className="border border-[#F3F4F6] bg-[#F9F9F9]/30"></td>;
                                 }
                                 
                                 const ratio = (val.disbursement / val.commitment) * 100;
                                 const cellColor = getHeatmapColor(ratio);
                                 
                                 return (
                                   <td key={mode} className={`border border-white p-0 text-center transition-all ${cellColor}`}>
                                      <div className="py-6 px-2 flex flex-col items-center justify-center min-h-[100px]">
                                         <span className="text-[15px] font-black tabular-nums font-lato tracking-tight">{ratio.toFixed(1)}%</span>
                                         <span className="text-[9px] font-black mt-1 opacity-80 uppercase tracking-widest">
                                            VOL: ${val.commitment.toFixed(0)}M
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
            <div className="bg-white p-10 rounded-xl border border-[#E5E7EB] shadow-md flex flex-col h-[550px]">
               <h3 className="text-[11px] font-black text-[#002147] uppercase tracking-widest flex items-center gap-2 mb-10 font-lato">
                 <Target size={16} className="text-[#00ADEF]" /> Execution Parity Analysis ($M USD)
               </h3>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis type="number" dataKey="commitment" domain={[0, maxVal]} fontSize={9} fontWeight={900} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => crsFmt.usdM(v)}>
                         <Label value="Aggregate Commitment ($M USD)" position="bottom" offset={35} fontSize={10} fontWeight={900} fill="#94A3B8" className="uppercase tracking-widest font-lato" />
                      </XAxis>
                      <YAxis type="number" dataKey="disbursement" domain={[0, maxVal]} fontSize={9} fontWeight={900} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => crsFmt.usdM(v)}>
                         <Label 
                            value="Aggregate Disbursement ($M USD)" 
                            angle={-90} 
                            position="insideLeft" 
                            offset={-35} 
                            fontSize={10} 
                            fontWeight={900} 
                            fill="#94A3B8" 
                            className="uppercase tracking-widest font-lato" 
                            style={{ textAnchor: 'middle' }}
                         />
                      </YAxis>
                      <Tooltip cursor={{ strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                      <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} stroke="#002147" strokeWidth={1} strokeOpacity={0.2} strokeDasharray="5 5" />
                      <Scatter data={scatterData}>
                         {scatterData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.5} strokeWidth={0} />
                         ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* 3. Strategic Alignment (Bubble) */}
            <div className="bg-white p-10 rounded-xl border border-[#E5E7EB] shadow-md flex flex-col h-[550px]">
               <h3 className="text-[11px] font-black text-[#002147] uppercase tracking-widest flex items-center gap-2 mb-10 font-lato">
                 <Leaf size={16} className="text-[#00ADEF]" /> Strategic Alignment Matrix
               </h3>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis type="number" dataKey="volume" fontSize={9} fontWeight={900} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => crsFmt.usdM(v)}>
                         <Label value="Portfolio Commitment Scale ($M USD)" position="bottom" offset={35} fontSize={10} fontWeight={900} fill="#94A3B8" className="uppercase tracking-widest font-lato" />
                      </XAxis>
                      <YAxis type="number" dataKey="greenShare" fontSize={9} fontWeight={900} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#94A3B8' }} unit="%">
                         <Label 
                            value="Sustainability Intensity (%)" 
                            angle={-90} 
                            position="insideLeft" 
                            offset={-35} 
                            fontSize={10} 
                            fontWeight={900} 
                            fill="#94A3B8" 
                            className="uppercase tracking-widest font-lato" 
                            style={{ textAnchor: 'middle' }}
                         />
                      </YAxis>
                      <ZAxis type="number" dataKey="projectCount" range={[100, 600]} />
                      <Tooltip cursor={{ strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                      <Scatter data={bubbleData}>
                         {bubbleData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} fillOpacity={0.5} strokeWidth={0} />
                         ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* 4. Portfolio DNA (Full Width) */}
          <div className="bg-white p-10 rounded-xl border border-[#E5E7EB] shadow-md overflow-hidden h-[650px] flex flex-col">
             <div className="mb-14">
                <h3 className="text-2xl font-black text-[#002147] uppercase tracking-tighter flex items-center gap-3 font-lato">
                  <Scale size={24} className="text-[#00ADEF]" /> Sectoral Investment DNA ($M USD)
                </h3>
                <p className="text-[11px] text-[#94A3B8] font-black mt-2 uppercase tracking-widest">Cumulative Portfolio Distribution across Standard Pillars</p>
             </div>
             
             <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.stackedData} layout="vertical" barSize={30} margin={{ left: 60, right: 30, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" fontSize={10} fontWeight={900} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={(v) => crsFmt.usdM(v)}>
                       <Label value="Cumulative Portfolio Volume ($M USD)" position="bottom" offset={45} fontSize={11} fontWeight={900} fill="#94A3B8" className="uppercase tracking-widest font-lato" />
                    </XAxis>
                    <YAxis dataKey="label" type="category" width={240} fontSize={10} fontWeight={900} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fill: '#002147' }}>
                       <Label 
                          value="Funding Institution" 
                          angle={-90} 
                          position="insideLeft" 
                          offset={-80} 
                          fontSize={11} 
                          fontWeight={900} 
                          fill="#94A3B8" 
                          className="uppercase tracking-widest font-lato" 
                          style={{ textAnchor: 'middle' }}
                       />
                    </YAxis>
                    <Tooltip 
                      cursor={{ fill: '#F9F9F9' }}
                      content={({ active, payload, label }) => {
                        if (active && payload?.length) {
                          const total = payload.reduce((sum, p) => sum + (p.value as number), 0);
                          return (
                            <div className="bg-[#002147] p-8 rounded-xl shadow-2xl border border-white/10 text-white min-w-[320px]">
                               <p className="text-[13px] font-black text-[#00ADEF] uppercase tracking-widest mb-6 pb-2 border-b border-white/5 font-lato">{label}</p>
                               <div className="space-y-3">
                                  {payload.filter(p => (p.value as number) > 0).sort((a,b) => (b.value as number) - (a.value as number)).map((p) => (
                                    <div key={p.name} className="flex justify-between items-center text-[12px] font-semibold">
                                       <div className="flex items-center gap-3">
                                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                          <span className="text-blue-100/60 uppercase tracking-tight">{p.name}</span>
                                       </div>
                                       <span className="font-black tabular-nums tracking-tight">{crsFmt.usdM(p.value as number)}</span>
                                    </div>
                                  ))}
                                  <div className="pt-6 mt-4 border-t border-white/15 flex justify-between items-center">
                                     <span className="text-[11px] font-black text-white uppercase tracking-widest font-lato">Total Portfolio</span>
                                     <span className="text-lg font-black text-white tabular-nums tracking-tighter">{crsFmt.usdM(total)}</span>
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
                       wrapperStyle={{ paddingBottom: '50px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', fill: '#002147' }} 
                    />
                    {data.modes.map((mode, i) => (
                      <Bar key={mode} dataKey={mode} stackId="a" fill={COLORS[i % COLORS.length]} radius={0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
  );
}
