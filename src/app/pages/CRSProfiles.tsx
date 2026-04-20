import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  ZAxis,
  Legend,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Label,
} from 'recharts';
import { 
  Building2, 
  Globe2, 
  Layers3, 
  MapPinned, 
  Table2, 
  Info, 
  Leaf, 
  User, 
  ShieldCheck, 
  Activity, 
  Wind 
} from 'lucide-react';
import { estimateCategoryAxisWidth, WrappedCategoryTick } from '../components/ChartTicks';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import { aggregateFacts, summarizeFacts } from '../utils/crsAggregations';

type CRSEntityType = 'country' | 'regionalRecipient' | 'broadRegion' | 'donor' | 'agency';

type CRSRecord = {
  id: number;
  year: number | null;
  donor: string;
  agency: string;
  recipient: string;
  recipient_scope: string;
  region: string;
  flow: string;
  finance_type: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  title: string;
  short_description: string;
  purpose: string;
  mode: string;
  mode_detail: string;
  climate_mitigation: number;
  climate_adaptation: number;
  gender: number;
  biodiversity: number;
  environment: number;
  drr: number;
};

type CRSRecordIndex = {
  version: number;
  totalRecords: number;
  chunks: Array<{
    id: number;
    file: string;
    count: number;
  }>;
  entityShardMap: Record<CRSEntityType, Record<string, number[]>>;
};

const ENTITY_META: Record<CRSEntityType, { label: string; description: string }> = {
  country: { label: 'ADB Economy', description: 'Deep dive into official ADB standard economies.' },
  regionalRecipient: { label: 'Regional Recipient', description: 'Rollups of multi-country regional programs.' },
  broadRegion: { label: 'Broad Region', description: 'Macro-regional transport investment trends.' },
  donor: { label: 'Funding Source', description: 'Top-level contributing nations or institutions.' },
  agency: { label: 'Implementing Agency', description: 'Technical departments, windows, or ministries.' },
};

const COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'];

export function CRSProfiles() {
  const { filteredFacts, filters } = useCRSFilters();
  const measure = filters.measure;
  const [entityType, setEntityType] = useState<CRSEntityType>('country');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [recordIndex, setRecordIndex] = useState<CRSRecordIndex | null>(null);
  const [recordChunks, setRecordChunks] = useState<Record<string, CRSRecord[]>>({});
  const [indexLoading, setIndexLoading] = useState<boolean>(true);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [activeRecord, setActiveRecord] = useState<CRSRecord | null>(null);

  const isConstant = filters.isConstantUSD;
  const activeMeasure = isConstant ? (measure === 'commitment' ? 'commitment_defl' : 'disbursement_defl') : measure;

  useEffect(() => {
    async function loadIndex() {
      try {
        setIndexLoading(true);
        const res = await fetch(`${import.meta.env.BASE_URL}data/crs-records/index.json`);
        const data = await res.json();
        setRecordIndex(data);
      } catch (e) {
        console.error('Failed to load record index:', e);
      } finally {
        setIndexLoading(false);
      }
    }
    loadIndex();
  }, []);

  const entityOptions = useMemo(() => {
    const list = aggregateFacts(filteredFacts, (fact) => {
        if (entityType === 'country') return fact.recipient_scope === 'economy' ? fact.recipient : '';
        if (entityType === 'regionalRecipient') return fact.recipient_scope === 'regional' ? fact.recipient : '';
        if (entityType === 'broadRegion') return fact.region;
        if (entityType === 'donor') return fact.donor;
        if (entityType === 'agency') return fact.agency;
        return '';
    }).filter(i => i.label);

    if (entitySearch) {
      return list.filter(i => i.label.toLowerCase().includes(entitySearch.toLowerCase())).slice(0, 100);
    }
    return list.slice(0, 500);
  }, [entityType, filteredFacts, entitySearch]);

  useEffect(() => {
    if (entityOptions.length > 0 && (!selectedEntity || !entityOptions.find(o => o.label === selectedEntity))) {
      setSelectedEntity(entityOptions[0].label);
    }
  }, [entityType, entityOptions]);

  const activeShardIds = useMemo(() => recordIndex?.entityShardMap?.[entityType]?.[selectedEntity] ?? [], [entityType, recordIndex, selectedEntity]);

  useEffect(() => {
    async function loadShards() {
      if (!recordIndex || !activeShardIds.length) return;
      const missing = activeShardIds.filter(id => !recordChunks[String(id)]);
      if (!missing.length) return;
      setRecordsLoading(true);
      try {
        const loaded = await Promise.all(missing.map(async id => {
            const chunk = recordIndex.chunks.find(c => c.id === id);
            const res = await fetch(`${import.meta.env.BASE_URL}${chunk?.file}`);
            return [String(id), await res.json()];
        }));
        setRecordChunks(prev => ({ ...prev, ...Object.fromEntries(loaded) }));
      } catch (err) {
        console.error("Failed to load records", err);
      } finally {
        setRecordsLoading(false);
      }
    }
    loadShards();
  }, [activeShardIds, recordIndex]);

  const allRecords = useMemo(() => activeShardIds.flatMap(id => recordChunks[String(id)] ?? []), [activeShardIds, recordChunks]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
        if (filters.donors.length && !filters.donors.includes(r.donor)) return false;
        if (filters.regions.length && !filters.regions.includes(r.region)) return false;
        if (filters.recipients.length && !filters.recipients.includes(r.recipient)) return false;
        if (filters.modes.length && !filters.modes.includes(r.mode)) return false;
        if (r.year && (r.year < filters.yearMin || r.year > filters.yearMax)) return false;
        
        if (entityType === 'country' && (r.recipient_scope !== 'economy' || r.recipient !== selectedEntity)) return false;
        if (entityType === 'regionalRecipient' && (r.recipient_scope !== 'regional' || r.recipient !== selectedEntity)) return false;
        if (entityType === 'broadRegion' && r.region !== selectedEntity) return false;
        if (entityType === 'donor' && r.donor !== selectedEntity) return false;
        if (entityType === 'agency' && r.agency !== selectedEntity) return false;
        
        return true;
    }).sort((a,b) => (b[activeMeasure] || 0) - (a[activeMeasure] || 0));
  }, [allRecords, filters, entityType, selectedEntity, activeMeasure]);

  const stats = useMemo(() => {
    let commitment = 0, disbursement = 0, count = 0;
    let susCount = 0, mitCount = 0, adpCount = 0, gndCount = 0;
    filteredRecords.forEach(r => {
        commitment += r[isConstant ? 'commitment_defl' : 'commitment'] || 0;
        disbursement += r[isConstant ? 'disbursement_defl' : 'disbursement'] || 0;
        count++;
        if ((r.climate_mitigation ?? 0) > 0) mitCount++;
        if ((r.climate_adaptation ?? 0) > 0) adpCount++;
        if ((r.gender ?? 0) > 0) gndCount++;
        if ((r.climate_mitigation ?? 0) > 0 || (r.climate_adaptation ?? 0) > 0 || (r.gender ?? 0) > 0) susCount++;
    });
    return { commitment, disbursement, count, susCount, mitCount, adpCount, gndCount };
  }, [filteredRecords, isConstant]);

  const yearlySeries = useMemo(() => {
    const map = new Map<number, { year: string; commitment: number; disbursement: number }>();
    filteredRecords.forEach(r => {
      const y = r.year || 0;
      if (!map.has(y)) map.set(y, { year: String(y), commitment: 0, disbursement: 0 });
      const entry = map.get(y)!;
      entry.commitment += r[isConstant ? 'commitment_defl' : 'commitment'] || 0;
      entry.disbursement += r[isConstant ? 'disbursement_defl' : 'disbursement'] || 0;
    });
    return [...map.values()].sort((a,b) => Number(a.year) - Number(b.year));
  }, [filteredRecords, isConstant]);

  const partnershipSeries = useMemo(() => {
    const map: Record<string, number> = {};
    const partnerKey = (entityType === 'donor' || entityType === 'agency') ? 'recipient' : 'donor';
    filteredRecords.forEach(r => {
      const label = r[partnerKey] || 'Unknown';
      map[label] = (map[label] || 0) + (r[activeMeasure] || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredRecords, activeMeasure, entityType]);

  const pillarSeries = useMemo(() => {
    const map: Record<string, number> = { 'Road': 0, 'Rail': 0, 'Aviation': 0, 'Water': 0, 'Other': 0 };
    filteredRecords.forEach(r => {
      const raw = (r.mode || 'Other').toLowerCase();
      let key = 'Other';
      if (raw.includes('road')) key = 'Road';
      else if (raw.includes('rail')) key = 'Rail';
      else if (raw.includes('air') || raw.includes('aviation')) key = 'Aviation';
      else if (raw.includes('water') || raw.includes('sea') || raw.includes('river')) key = 'Water';
      map[key] += (r[activeMeasure] || 0);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
  }, [filteredRecords, activeMeasure]);

  const sectorMix = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const label = r.mode_detail || r.mode || 'Other';
      map[label] = (map[label] || 0) + (r[activeMeasure] || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRecords, activeMeasure]);

  const bubbleData = useMemo(() => {
    const map = new Map<string, { label: string; volume: number; susVolume: number; count: number }>();
    filteredRecords.forEach(r => {
      const key = r.mode || 'Other';
      if (!map.has(key)) map.set(key, { label: key, volume: 0, susVolume: 0, count: 0 });
      const entry = map.get(key)!;
      const vol = r[activeMeasure] || 0;
      entry.volume += vol;
      entry.count++;
      if ((r.climate_mitigation ?? 0) > 0 || (r.climate_adaptation ?? 0) > 0 || (r.gender ?? 0) > 0) {
        entry.susVolume += vol;
      }
    });
    return [...map.values()]
      .map(d => ({
        ...d,
        sustainabilityScore: d.volume > 0 ? Number(((d.susVolume / d.volume) * 100).toFixed(1)) : 0
      }))
      .filter(d => d.volume > 0.1);
  }, [filteredRecords, activeMeasure]);

  const pagedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="p-8 bg-[#F9F9F9] min-h-screen font-opensans">
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-[#002147] text-3xl font-black tracking-tighter uppercase font-lato">Portfolio Deep Dive</h1>
            <p className="text-[#6B7280] text-[13px] mt-2 font-semibold">
              Select an entity to explore its underlying project ledger and <span className="font-black text-[#002147]">micro-level financial composition</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-[#E5E7EB] shadow-md">
            {(Object.keys(ENTITY_META) as CRSEntityType[]).map((type) => (
              <button
                key={type}
                onClick={() => setEntityType(type)}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  entityType === type 
                    ? 'bg-[#002147] text-white shadow-lg' 
                    : 'text-[#94A3B8] hover:bg-[#F9F9F9]'
                }`}
              >
                {ENTITY_META[type].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-8 items-start">
          {/* Sidebar Navigation */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md flex flex-col h-[calc(100vh-200px)] overflow-hidden">
             <div className="p-6 border-b border-[#F3F4F6]">
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-4 font-lato">Filter Entity</p>
                <input
                  type="text"
                  placeholder={`Search ${entityType === 'country' ? 'Economies' : ENTITY_META[entityType].label + 's'}...`}
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  className="w-full bg-[#F9F9F9] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00ADEF]/20 transition-all font-semibold"
                />
             </div>
             <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-[#E5E7EB]">
               {indexLoading ? (
                 <div className="space-y-2 p-2">
                   {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-[#F9F9F9] rounded-lg animate-pulse" />)}
                 </div>
               ) : (
                 <div className="space-y-1">
                   {entityOptions.map(o => (
                     <button
                       key={o.label}
                       onClick={() => setSelectedEntity(o.label)}
                       className={`w-full text-left px-4 py-3.5 rounded-xl transition-all ${
                         selectedEntity === o.label 
                           ? 'bg-[#00ADEF]/10 text-[#002147] shadow-sm ring-1 ring-[#00ADEF]/20' 
                           : 'hover:bg-[#F9F9F9] text-[#64748B] font-medium'
                       }`}
                     >
                       <span className="text-[11px] font-black uppercase tracking-tight truncate block">{o.label}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
          </div>

          {/* Main Profile content */}
          <div className="space-y-8">
            {!selectedEntity ? (
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-12 text-center h-[600px] flex flex-col items-center justify-center">
                <Globe2 className="text-[#E5E7EB] w-20 h-20 mb-6" />
                <h3 className="text-xl font-black text-[#002147] tracking-tighter uppercase font-lato">Select an entity to explore</h3>
                <p className="text-[#94A3B8] text-base mt-3 max-w-sm font-semibold">
                  Deep dive into financial instruments, thematic distributions, and the full project ledger for a specific economy.
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-700">
                {/* Profile Header Card */}
                <div className="bg-[#002147] rounded-2xl p-10 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-8 shadow-2xl border border-white/5">
                   <div className="relative z-10">
                      <span className="px-4 py-1.5 bg-[#00ADEF] rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#00ADEF]/20">
                        {ENTITY_META[entityType].label} PROFILE
                      </span>
                      <h2 className="text-5xl font-black tracking-tighter mt-8 mb-3 leading-none uppercase font-lato">{selectedEntity}</h2>
                      <p className="text-[#94A3B8] text-xs font-black uppercase tracking-[0.2em] font-lato">Asian Transport Observatory • Portfolio Audit</p>
                   </div>
                   <div className="flex gap-12 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12 relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2 font-lato">Standard Volume</p>
                        <p className="text-4xl font-black text-white tabular-nums tracking-tighter font-lato">{crsFmt.usdM(stats[measure])}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2 font-lato">Total Records</p>
                        <p className="text-3xl font-black text-white tabular-nums tracking-tighter font-lato">{crsFmt.num(stats.count)}</p>
                      </div>
                   </div>
                   {/* Background Decorative Element */}
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 1. Momentum Trend */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8 overflow-hidden">
                       <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Portfolio Momentum</p>
                       <p className="text-[10px] text-[#94A3B8] font-black uppercase mb-8">Historical trajectory ($M USD)</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={yearlySeries} margin={{ left: 10, right: 30, bottom: 40 }}>
                                <defs>
                                   <linearGradient id="colorCommit" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#00ADEF" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#00ADEF" stopOpacity={0}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="year" fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}>
                                   <Label value="Reporting Year" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Volume ($M USD)" angle={-90} position="insideLeft" offset={-40} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(v: number) => crsFmt.usdM(v)} />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '30px' }} />
                                <Area name="Commitment" type="monotone" dataKey="commitment" stroke="#00ADEF" strokeWidth={3} fillOpacity={1} fill="url(#colorCommit)" />
                                <Area name="Disbursement" type="monotone" dataKey="disbursement" stroke="#002147" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 2. Top Sub-Partners */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8 overflow-hidden">
                       <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">
                          { (entityType === 'donor' || entityType === 'agency') ? 'Top Recipient Economies' : 'Institutional Funding Sources' }
                       </p>
                       <p className="text-[10px] text-[#94A3B8] font-black uppercase mb-8">Core network topography</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={partnershipSeries} layout="vertical" margin={{ left: 10, right: 30, bottom: 40 }}>
                                <XAxis type="number" fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis type="category" dataKey="label" fontSize={9} fontWeight={900} width={120} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}>
                                   <Label value="Partner Entity" angle={-90} position="insideLeft" offset={-60} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(v: number) => crsFmt.usdM(v)} />
                                <Bar dataKey="value" fill="#002147" radius={[0, 4, 4, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 3. Strategic Pillar Mix */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8 overflow-hidden">
                       <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Standard Pillar Distribution</p>
                       <p className="text-[10px] text-[#94A3B8] font-black uppercase mb-8">Portfolio focus across pillars</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={pillarSeries} margin={{ left: 10, right: 30, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="label" fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}>
                                   <Label value="ATO Standard Pillars" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Volume ($M USD)" angle={-90} position="insideLeft" offset={-40} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} formatter={(v: number) => crsFmt.usdM(v)} />
                                <Bar dataKey="value" fill="#76B7B2" radius={[4, 4, 0, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 4. Sub-Sector Alignment Matrix */}
                    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md p-8 overflow-hidden">
                       <p className="text-[#002147] text-[11px] font-black uppercase tracking-widest mb-1 font-lato">Sustainability Alignment Matrix</p>
                       <p className="text-[10px] text-[#94A3B8] font-black uppercase mb-8">Volume vs Sustainability Score (%)</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <ScatterChart margin={{ left: 10, right: 30, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis type="number" dataKey="volume" fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Sub-Sector Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis type="number" dataKey="sustainabilityScore" fontSize={9} fontWeight={900} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} unit="%">
                                   <Label value="Sustainability (%)" angle={-90} position="insideLeft" offset={-40} fontSize={9} fontWeight={900} fill="#94a3b8" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip 
                                   cursor={{ strokeDasharray: '3 3' }}
                                   content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                         const data = payload[0].payload;
                                         return (
                                            <div className="bg-white p-4 border border-[#E5E7EB] shadow-2xl rounded-xl">
                                               <p className="text-[11px] font-black text-[#002147] uppercase mb-2 tracking-widest font-lato">{data.label}</p>
                                               <div className="space-y-1">
                                                 <p className="text-[10px] text-[#64748B] font-black">
                                                   VOLUME: <span className="text-[#002147]">{crsFmt.usdM(data.volume)}</span>
                                                 </p>
                                                 <p className="text-[10px] text-[#64748B] font-black">
                                                   SUSTAINABILITY: <span className="text-[#59A14F]">{data.sustainabilityScore}%</span>
                                                 </p>
                                               </div>
                                            </div>
                                         );
                                      }
                                      return null;
                                   }}
                                />
                                <Scatter data={bubbleData} fill="#59A14F" fillOpacity={0.6} />
                             </ScatterChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 {/* Key Sub-Mode Comparison */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                     <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest mb-1">Granular Portfolio Focus</p>
                     <p className="text-xs text-slate-400 font-bold mb-6">Top 10 specialized transport sub-modes</p>
                     <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sectorMix} layout="vertical" margin={{ left: 10, right: 60, bottom: 40 }}>
                            <XAxis type="number" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                               <Label value="Project Volumes ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#94a3b8" className="uppercase tracking-widest" />
                            </XAxis>
                            <YAxis type="category" dataKey="name" fontSize={9} fontWeight={800} width={120} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                            <Tooltip formatter={(v: number) => crsFmt.usdM(v)} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center gap-6">
                      <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest w-full text-left mb-1">Sustainability Alignment Score</p>
                      <p className="text-xs text-slate-400 font-bold w-full text-left mb-6">Share of projects with thematic markers</p>
                      <div className="relative w-48 h-48">
                         <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                            <circle cx="96" cy="96" r="80" fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
                            <circle 
                               cx="96" cy="96" r="80" fill="transparent" stroke="#10b981" strokeWidth="20" 
                               strokeDasharray={`${(stats.susCount / Math.max(stats.count, 1)) * 502} 502`}
                               strokeLinecap="round"
                            />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-900 tabular-nums">{((stats.susCount / Math.max(stats.count, 1)) * 100).toFixed(1)}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Match</span>
                         </div>
                      </div>
                      <div className="text-center px-10">
                         <div className="grid grid-cols-3 gap-8 mt-4">
                            <div>
                               <p className="text-md font-black text-slate-900">{stats.mitCount}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Climate</p>
                            </div>
                            <div>
                               <p className="text-md font-black text-slate-900">{stats.gndCount}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Gender</p>
                            </div>
                            <div>
                               <p className="text-md font-black text-slate-900">{stats.count}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                            </div>
                         </div>
                      </div>
                   </div>
                 </div>                 {/* Transaction Ledger */}
                 <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-md overflow-hidden">
                    <div className="px-8 py-6 bg-[#F9F9F9] border-b border-[#F3F4F6] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                       <div className="flex items-center gap-3">
                         <p className="text-[#002147] text-lg font-black uppercase font-lato">Transaction Ledger</p>
                         <span className="px-3 py-1 bg-white border border-[#E5E7EB] rounded-lg text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">{filteredRecords.length} results</span>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 h-10">
                             <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))} 
                                disabled={page === 1} 
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#94A3B8] disabled:opacity-30 hover:bg-[#F9F9F9] shadow-sm transition-all"
                             >←</button>
                             <span className="text-[11px] font-black text-[#002147] w-12 text-center font-lato">{page}</span>
                             <button 
                                onClick={() => setPage(p => p + 1)} 
                                disabled={page >= Math.ceil(filteredRecords.length / rowsPerPage)} 
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#E5E7EB] text-[#94A3B8] disabled:opacity-30 hover:bg-[#F9F9F9] shadow-sm transition-all"
                             >→</button>
                          </div>
                       </div>
                    </div>
                    <div className="overflow-x-auto min-h-[500px]">
                      {recordsLoading ? (
                        <div className="p-32 flex flex-col items-center justify-center gap-6">
                           <div className="w-12 h-12 border-4 border-[#F9F9F9] border-t-[#00ADEF] rounded-full animate-spin shadow-lg" />
                           <p className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] font-lato">Streaming Institutional Records...</p>
                        </div>
                      ) : (
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-[#F9F9F9] text-[10px] font-black text-[#94A3B8] uppercase tracking-widest border-b border-[#F3F4F6]">
                              <th className="px-8 py-5 text-left font-lato">Year</th>
                              <th className="px-8 py-5 text-left font-lato">Source / Agency</th>
                              <th className="px-8 py-5 text-left font-lato">Volume</th>
                              <th className="px-8 py-5 text-left font-lato">Project Narrative</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F3F4F6]">
                            {pagedRecords.map((record) => (
                              <tr key={record.id} onClick={() => setActiveRecord(record)} className="hover:bg-[#F9F9F9] transition-all group cursor-pointer">
                                <td className="px-8 py-5 text-[11px] font-bold text-[#64748B] tabular-nums font-lato">{record.year}</td>
                                <td className="px-8 py-5">
                                   <div className="max-w-[240px]">
                                     <p className="text-[12px] font-black text-[#002147] line-clamp-1 uppercase font-lato">{record.donor}</p>
                                     <p className="text-[10px] text-[#94A3B8] font-bold truncate uppercase tracking-tight">{record.agency}</p>
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-[12px] font-black text-[#002147] tabular-nums font-lato">
                                   {crsFmt.usdM(record[activeMeasure] || 0)}
                                </td>
                                <td className="px-8 py-5">
                                   <p className="text-[11px] font-bold text-[#334155] group-hover:text-[#00ADEF] transition-colors line-clamp-1 uppercase tracking-tight">{record.title}</p>
                                   <p className="text-[9px] text-[#94A3B8] font-black uppercase mt-1 tracking-widest">{record.mode} • {record.purpose}</p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        <Sheet open={!!activeRecord} onOpenChange={() => setActiveRecord(null)}>
          <SheetContent className="sm:max-w-xl border-l border-[#E5E7EB] bg-white p-0 shadow-2xl">
             {activeRecord && (
                <div className="h-full flex flex-col font-opensans">
                   <div className="bg-[#002147] p-10 text-white relative overflow-hidden">
                      <span className="px-4 py-1.5 bg-[#00ADEF] rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl shadow-[#00ADEF]/20 relative z-10">Transaction Audit</span>
                      <h2 className="text-3xl font-black tracking-tighter mt-8 leading-tight font-lato uppercase relative z-10">{activeRecord.title}</h2>
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24" />
                   </div>
                   <div className="flex-1 overflow-y-auto p-10 space-y-10">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="p-6 bg-[#F9F9F9] rounded-xl border border-[#E5E7EB] shadow-sm">
                            <p className="text-[10px] font-black text-[#64748B] uppercase tracking-widest mb-2 font-lato">Commitment</p>
                            <p className="text-2xl font-black text-[#002147] tabular-nums tracking-tighter font-lato">{crsFmt.usdM(activeRecord.commitment)}</p>
                         </div>
                         <div className="p-6 bg-[#00ADEF]/5 rounded-xl border border-[#00ADEF]/10 shadow-sm">
                            <p className="text-[10px] font-black text-[#00ADEF] uppercase tracking-widest mb-2 font-lato">Disbursement</p>
                            <p className="text-2xl font-black text-[#00ADEF] tabular-nums tracking-tighter font-lato">{crsFmt.usdM(activeRecord.disbursement)}</p>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] border-b border-[#F3F4F6] pb-3 font-lato">Institutional Intelligence</h4>
                         <div className="grid grid-cols-2 gap-8">
                            <div>
                               <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1.5 font-lato">Funding Source</p>
                               <p className="text-[11px] font-black text-[#002147] uppercase font-lato">{activeRecord.donor}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1.5 font-lato">Implementing Agency</p>
                               <p className="text-[11px] font-black text-[#002147] uppercase font-lato">{activeRecord.agency}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1.5 font-lato">Recipient Economy</p>
                               <p className="text-[11px] font-black text-[#002147] uppercase font-lato">{activeRecord.recipient}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1.5 font-lato">Standard Mode</p>
                               <p className="text-[11px] font-black text-[#002147] uppercase font-lato">{activeRecord.mode}</p>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="flex items-center gap-2 text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.25em] border-b border-[#F3F4F6] pb-3 font-lato">
                           <Info size={16} className="text-[#00ADEF]" /> Narrative Metadata
                         </h4>
                         <div className="text-[13px] leading-relaxed text-[#334155] font-semibold bg-[#F9F9F9] p-6 rounded-xl border border-[#F3F4F6] prose prose-slate">
                           {activeRecord.short_description || "No granular descriptive metadata available for this transaction."}
                         </div>
                      </div>
                   </div>
                   <div className="p-8 border-t border-[#F3F4F6] bg-[#F9F9F9]">
                      <p className="text-[10px] font-black text-[#94A3B8] text-center uppercase tracking-widest">Asian Transport Observatory • Transaction ID: {activeRecord.id}</p>
                   </div>
                </div>
             )}
          </SheetContent>
        </Sheet>
/Sheet>
      </div>
    </div>
  );
}
