import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  Legend,
  Treemap,
} from 'recharts';
import { CRSFact, CRS_MODE_COLORS, crsFmt } from '../data/crsData';
import { aggregateFacts } from '../utils/crsAggregations';

// Vibrant categorical palette
const VIBRANT_PALETTE: Record<string, string> = {
  "Road": "#D97706",     // Amber
  "Rail": "#2563EB",     // Blue
  "Water": "#0D9488",    // Teal
  "Aviation": "#7C3AED", // Purple
  "Other": "#64748B"     // Slate
};

// Custom renderer for Treemap nodes to handle vibrant colors and smart labels
const CustomTreemapContent = (props: any) => {
  // Extract fillColor directly from props (passed in treemapData)
  const { x, y, width, height, name, value, fillColor } = props;
  
  if (width < 5 || height < 5) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor || '#64748B',
          stroke: '#fff',
          strokeWidth: 1,
          strokeOpacity: 0.5,
        }}
        rx={4}
        ry={4}
      />
      {/* Smart Label logic: Only show if width and height allow */}
      {width > 65 && height > 35 ? (
        <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8}>
          <div className="w-full h-full flex flex-col items-center justify-center text-center overflow-hidden pointer-events-none">
            <span 
              className="text-white font-semibold leading-tight drop-shadow-md select-none"
              style={{ fontSize: Math.max(9, Math.min(width / 12, 12)) }}
            >
              {name}
            </span>
            {height > 55 && (
              <span 
                className="text-white/90 font-medium mt-1 select-none"
                style={{ fontSize: Math.max(8, Math.min(width / 14, 10)) }}
              >
                {crsFmt.usdM(value)}
              </span>
            )}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
};

export function CRSThematicAnalysis({ facts, isConstant }: Props) {
  // Use a more robust single-pass aggregation for all trend-based visuals
  const { trendData, modeTrendData, treemapData } = useMemo(() => {
    const yearMap: Record<number, any> = {};
    const modeTree: Record<string, Record<string, number>> = {};
    
    facts.forEach(f => {
      const year = f.year;
      const val = isConstant ? (f.commitment_defl ?? f.commitment) : f.commitment;
      const mode = f.mode || 'Other';
      const detail = f.mode_detail || 'Other';
      
      // Trend Data
      if (!yearMap[year]) {
        yearMap[year] = { 
          year: String(year), 
          sustainable: 0, 
          total: 0,
          mitigation: 0,
          adaptation: 0,
          gender: 0,
          drr: 0,
          biodiversity: 0,
          environment: 0,
          ...Object.fromEntries(Object.keys(CRS_MODE_COLORS).map(m => [m, 0]))
        };
      }
      
      const yRow = yearMap[year];
      yRow.total += val;
      if (yRow[mode] !== undefined) yRow[mode] += val;
      else yRow['Other'] += val;

      let isSus = false;
      if ((f.climate_mitigation ?? 0) > 0) { yRow.mitigation += val; isSus = true; }
      if ((f.climate_adaptation ?? 0) > 0) { yRow.adaptation += val; isSus = true; }
      if ((f.gender ?? 0) > 0) { yRow.gender += val; isSus = true; }
      if ((f.drr ?? 0) > 0) { yRow.drr += val; isSus = true; }
      if ((f.biodiversity ?? 0) > 0) { yRow.biodiversity += val; isSus = true; }
      if ((f.environment ?? 0) > 0) { yRow.environment += val; isSus = true; }
      
      if (isSus) yRow.sustainable += val;

      // Tree Data
      if (!modeTree[mode]) modeTree[mode] = {};
      modeTree[mode][detail] = (modeTree[mode][detail] || 0) + val;
    });

    const sortedTrend = Object.values(yearMap).sort((a, b) => Number(a.year) - Number(b.year))
      .map(d => ({
        ...d,
        sustainableShare: d.total > 0 ? (d.sustainable / d.total) * 100 : 0,
        mitigationShare: d.total > 0 ? (d.mitigation / d.total) * 100 : 0,
        conventional: Math.max(0, d.total - d.sustainable)
      }));

    const sortedTree = Object.entries(modeTree).map(([name, kids]) => {
      return {
        name,
        children: Object.entries(kids).map(([kName, kVal]) => ({ 
          name: kName, 
          value: kVal,
          fillColor: VIBRANT_PALETTE[name] || VIBRANT_PALETTE["Other"]
        }))
      };
    });

    return { trendData: sortedTrend, modeTrendData: sortedTrend, treemapData: sortedTree };
  }, [facts, isConstant]);

  // Data for Clustered Bars (Big 6)
  const markerData = trendData.map(d => ({
    year: d.year,
    'Mitigation': d.mitigation,
    'Adaptation': d.adaptation,
    'Gender': d.gender,
    'DRR': d.drr,
    'Biodiversity': d.biodiversity,
    'Environment': d.environment,
  }));

  // Data for Purpose Ranking (Horizontal Bars)
  const purposeRanking = useMemo(() => {
     return aggregateFacts(facts, f => f.mode_detail).slice(0, 15);
  }, [facts]);

  return (
    <div className="space-y-12 py-8">
      
      {/* SECTION 1: SUSTAINABILITY SHIFT */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg text-slate-900">Sustainability alignment trends</h2>
            <p className="text-[15px] text-slate-500 font-normal mt-0.5">Tracking markers and climate alignment over time</p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
            Commitment Basis
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mitigation Share Line Chart */}
          <div className="h-[350px]">
            <h3 className="text-sm text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Climate Mitigation Target Share (%)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" fontSize={11} tickMargin={10} stroke="#94A3B8" />
                <YAxis fontSize={11} stroke="#94A3B8" unit="%" />
                <Tooltip 
                  allowEscapeViewBox={{ x: false, y: false }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }}
                  formatter={(val: number) => [`${val.toFixed(2)}%`, 'Mitigation Share']}
                />
                <Line 
                   type="monotone" 
                   dataKey="mitigationShare" 
                   stroke="#10B981" 
                   strokeWidth={3} 
                   dot={false}
                   activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Clustered Marker Volume */}
          <div className="h-[350px]">
            <h3 className="text-sm text-slate-700 mb-4 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-blue-500" />
               Annual volume by marker target
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={markerData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" fontSize={11} tickMargin={10} stroke="#94A3B8" />
                <YAxis fontSize={11} stroke="#94A3B8" tickFormatter={v => `$${v/1000}B`} />
                <Tooltip 
                  allowEscapeViewBox={{ x: false, y: false }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }}
                  formatter={(v: any) => crsFmt.usdM(v)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                <Bar dataKey="Mitigation" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Adaptation" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gender" fill="#EC4899" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DRR" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Biodiversity" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Environment" fill="#64748B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* 100% Stacked Sustainability share */}
        <div className="mt-12">
           <h3 className="text-sm text-slate-700 mb-4">Sustainability-tagged vs conventional finance (%)</h3>
           <div className="h-[240px] bg-slate-50/50 rounded-xl p-4 border border-slate-100 overflow-hidden">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} stackOffset="expand" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" hide />
                  <Tooltip 
                    allowEscapeViewBox={{ x: false, y: false }}
                    formatter={(v: any, name: string, props: any) => {
                      const total = props.payload.sustainable + props.payload.conventional;
                      const pct = total > 0 ? (Number(v) / total * 100).toFixed(1) : "0.0";
                      return [`${pct}%`, name];
                    }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }}
                  />
                  <Area type="monotone" dataKey="sustainable" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Sustainable" />
                  <Area type="monotone" dataKey="conventional" stackId="1" stroke="#E2E8F0" fill="#E2E8F0" fillOpacity={0.4} name="Conventional" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </section>

      {/* SECTION 2: SECTOR COMPOSITION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mode Evolution */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden min-h-[450px]">
          <h2 className="text-lg text-slate-900 mb-1">Sectoral distribution trends</h2>
          <p className="text-[15px] text-slate-500 font-normal">Long-term shifts in transport sub-sector focus</p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={modeTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" fontSize={11} stroke="#94A3B8" />
                <YAxis fontSize={11} stroke="#94A3B8" tickFormatter={v => `$${v/1000}B`} />
                <Tooltip 
                   allowEscapeViewBox={{ x: false, y: false }}
                   formatter={(v: any) => crsFmt.usdM(v)} 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }}
                />
                <Legend iconType="rect" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                {Object.entries(CRS_MODE_COLORS).map(([mode, color]) => (
                  <Area 
                    key={mode} 
                    type="monotone" 
                    dataKey={mode} 
                    stackId="1" 
                    stroke={color} 
                    fill={color} 
                    fillOpacity={0.6} 
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Treemap */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 min-h-[450px] overflow-hidden">
          <h2 className="text-lg text-slate-900 mb-1 border-l-4 border-blue-500 pl-3">Relative size</h2>
          <p className="text-xs text-slate-500 mb-8 pl-3 font-medium">Treemap of finance by sub-sector (Mode & Detail)</p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<CustomTreemapContent />}
              >
                <Tooltip 
                  formatter={(v: any, _n: any, props: any) => [crsFmt.usdM(v), props?.payload?.name || _n]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Purpose Ranking */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
        <h2 className="text-lg text-slate-900 mb-4">Sub-sector analysis</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={purposeRanking} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="label" 
                fontSize={10} 
                width={200}
                stroke="#64748B"
              />
              <Tooltip 
                allowEscapeViewBox={{ x: false, y: false }}
                formatter={(v: any) => crsFmt.usdM(v)} 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }}
              />
              <Bar dataKey="commitment" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                 {purposeRanking.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#1D4ED8' : '#3B82F6'} opacity={1 - (index * 0.05)} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
