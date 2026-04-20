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
import { Building2, Globe2, Layers3, MapPinned, Table2, Info, Leaf, User, ShieldCheck, Activity, Wind, ChevronDown, Search } from 'lucide-react';
import { estimateCategoryAxisWidth, WrappedCategoryTick } from '../components/ChartTicks';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
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
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);

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
    <div className="p-6 bg-slate-50/50 min-h-screen">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Portfolio Deep Dive</h1>
            <p className="text-slate-500 text-base mt-1">
              Select an entity to explore its underlying project ledger and <span className="font-medium text-slate-700">micro-level financial composition</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Header & Filter Selection */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                   <p className="text-[14px] font-semibold text-slate-500 uppercase tracking-widest">Analytics Focus</p>
                   <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {(Object.keys(ENTITY_META) as CRSEntityType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => { setEntityType(type); setEntitySearch(''); }}
                        className={`px-4 py-2 rounded-lg text-[15px] font-medium transition-all ${
                          entityType === type 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {ENTITY_META[type].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[320px]">
                   <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Selected Entity</p>
                   <Popover open={isEntityDropdownOpen} onOpenChange={setIsEntityDropdownOpen}>
                      <PopoverTrigger asChild>
                         <button className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-all shadow-sm">
                            <span className="text-base font-semibold text-slate-900 truncate">
                               {selectedEntity || `Select ${ENTITY_META[entityType].label}...`}
                            </span>
                            <ChevronDown className={`text-slate-400 transition-transform duration-200 ${isEntityDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                         </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-2xl border-slate-200 bg-white" align="start">
                         <div className="flex flex-col h-[400px]">
                            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                               <Search size={18} className="text-slate-400" />
                               <input
                                  type="text"
                                  autoFocus
                                  placeholder={`Search ${ENTITY_META[entityType].label === 'ADB Economy' ? 'ADB Economies' : ENTITY_META[entityType].label + 's'}...`}
                                  value={entitySearch}
                                  onChange={(e) => setEntitySearch(e.target.value)}
                                  className="w-full bg-transparent border-none p-0 text-base focus:ring-0 font-medium placeholder:text-slate-400"
                               />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                               {entityOptions.length === 0 ? (
                                  <div className="p-8 text-center text-slate-400 text-base font-medium">No results found</div>
                               ) : (
                                  <div className="space-y-1">
                                     {entityOptions.map(o => (
                                       <button
                                         key={o.label}
                                         onClick={() => { setSelectedEntity(o.label); setIsEntityDropdownOpen(false); }}
                                         className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                                           selectedEntity === o.label 
                                             ? 'bg-blue-50 text-blue-700 font-semibold' 
                                             : 'hover:bg-slate-50 text-slate-600 font-medium'
                                         }`}
                                       >
                                         <span className="text-[15px] truncate block">{o.label}</span>
                                       </button>
                                     ))}
                                  </div>
                               )}
                            </div>
                         </div>
                      </PopoverContent>
                   </Popover>
                </div>
             </div>
          </div>

          {/* Main Profile content */}
          <div className="space-y-6">
            {!selectedEntity ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center h-[500px] flex flex-col items-center justify-center">
                <Globe2 className="text-slate-200 w-16 h-16 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Select an entity to explore</h3>
                <p className="text-slate-400 text-base mt-2 max-w-sm font-medium">
                  Deep dive into financial instruments, thematic distributions, and the full project ledger for a specific economy, region, or donor.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Profile Header Card */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                   <div className="relative z-10">
                      <span className="px-3 py-1 bg-blue-500 rounded-full text-[14px] font-semibold uppercase tracking-widest shadow-lg shadow-blue-500/30">
                        {ENTITY_META[entityType].label} PROFILE
                      </span>
                      <h2 className="text-4xl font-semibold tracking-tighter mt-6 mb-2 leading-none uppercase">{selectedEntity}</h2>
                      <p className="text-slate-500 text-[15px] font-medium uppercase tracking-widest">Global Transport Portfolio Deep Dive</p>
                   </div>
                   <div className="flex gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 relative z-10">
                      <div>
                        <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-3xl font-semibold text-white tabular-nums">{crsFmt.usdM(stats[measure])}</p>
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Records</p>
                        <p className="text-3xl font-semibold text-white tabular-nums">{crsFmt.num(stats.count)}</p>
                      </div>
                   </div>
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Momentum Trend */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                       <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Portfolio Momentum</p>
                       <p className="text-[15px] text-slate-400 font-semibold mb-6">Historical investment trajectory ($M USD)</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={yearlySeries} margin={{ left: 10, right: 30, bottom: 40 }}>
                                <defs>
                                   <linearGradient id="colorCommit" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false}>
                                   <Label value="Reporting Year" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Volume ($M USD)" angle={-90} position="insideLeft" offset={-40} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip formatter={(v: number) => crsFmt.usdM(v)} />
                                <Legend 
                                   verticalAlign="top" 
                                   align="right" 
                                   iconType="circle" 
                                   wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }}
                                />
                                <Area name="Commitment" type="monotone" dataKey="commitment" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCommit)" />
                                <Area name="Disbursement" type="monotone" dataKey="disbursement" stroke="#10b981" strokeWidth={1} fill="transparent" strokeDasharray="4 4" />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 2. Top Sub-Partners */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                       <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">
                          { (entityType === 'donor' || entityType === 'agency') ? 'Top Recipient Economies' : 'Primary Funding Sources' }
                       </p>
                       <p className="text-[15px] text-slate-400 font-semibold mb-6">Core institutional network topography</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={partnershipSeries} layout="vertical" margin={{ left: 10, right: 30, bottom: 40 }}>
                                <XAxis type="number" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis type="category" dataKey="label" fontSize={9} fontWeight={800} width={120} axisLine={{ stroke: '#cbd5e1' }} tickLine={false}>
                                   <Label value="Partner Entity" angle={-90} position="insideLeft" offset={-60} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip formatter={(v: number) => crsFmt.usdM(v)} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 3. Strategic Pillar Mix */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                       <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Standard Pillar Distribution</p>
                       <p className="text-[15px] text-slate-400 font-semibold mb-6">Aggregate focus across standardized ATO sectors</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={pillarSeries} margin={{ left: 10, right: 30, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" fontSize={9} fontWeight={800} axisLine={{ stroke: '#cbd5e1' }} tickLine={false}>
                                   <Label value="Standard Transport Pillars" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Volume ($M USD)" angle={-90} position="insideLeft" offset={-40} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip formatter={(v: number) => crsFmt.usdM(v)} />
                                <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* 4. Sub-Sector Alignment Matrix */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                       <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Strategic Alignment Matrix</p>
                       <p className="text-[15px] text-slate-400 font-semibold mb-6">Transport Sub-Sector volume vs Sustainability Score (%)</p>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <ScatterChart margin={{ left: 10, right: 30, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" dataKey="volume" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                                   <Label value="Sub-Sector Volume ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                                </XAxis>
                                <YAxis type="number" dataKey="sustainabilityScore" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} unit="%">
                                   <Label value="Sustainability (%)" angle={-90} position="insideLeft" offset={-40} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip 
                                   cursor={{ strokeDasharray: '3 3' }}
                                   content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                         const data = payload[0].payload;
                                         return (
                                            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
                                               <p className="text-[15px] font-semibold text-slate-900 uppercase mb-1">{data.label}</p>
                                               <p className="text-[15px] text-slate-500 font-semibold">
                                                 Volume: <span className="text-slate-900">{crsFmt.usdM(data.volume)}</span>
                                               </p>
                                               <p className="text-[15px] text-slate-500 font-semibold">
                                                 Sustainability: <span className="text-emerald-600">{data.sustainabilityScore}%</span>
                                               </p>
                                            </div>
                                         );
                                      }
                                      return null;
                                   }}
                                />
                                <Scatter data={bubbleData} fill="#10b981" fillOpacity={0.5} />
                             </ScatterChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 {/* Key Sub-Mode Comparison */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                     <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest mb-1">Granular Portfolio Focus</p>
                     <p className="text-[15px] text-slate-400 font-semibold mb-6">Top 10 specialized transport sub-modes</p>
                     <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sectorMix} layout="vertical" margin={{ left: 10, right: 60, bottom: 40 }}>
                            <XAxis type="number" fontSize={9} fontWeight={700} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tickFormatter={(v) => crsFmt.usdM(v)}>
                               <Label value="Project Volumes ($M USD)" position="bottom" offset={20} fontSize={9} fontWeight={800} fill="#64748b" className="uppercase tracking-widest" />
                            </XAxis>
                            <YAxis type="category" dataKey="name" fontSize={9} fontWeight={800} width={120} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                            <Tooltip formatter={(v: number) => crsFmt.usdM(v)} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center gap-6">
                      <p className="text-slate-900 text-[14px] font-semibold uppercase tracking-widest w-full text-left mb-1">Sustainability Alignment Score</p>
                      <p className="text-[15px] text-slate-400 font-semibold w-full text-left mb-6">Share of projects with thematic markers</p>
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
                            <span className="text-4xl font-semibold text-slate-900 tabular-nums">{((stats.susCount / Math.max(stats.count, 1)) * 100).toFixed(1)}%</span>
                            <span className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Direct Match</span>
                         </div>
                      </div>
                      <div className="text-center px-10">
                         <div className="grid grid-cols-3 gap-8 mt-4">
                            <div>
                               <p className="text-md font-semibold text-slate-900">{stats.mitCount}</p>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Climate</p>
                            </div>
                            <div>
                               <p className="text-md font-semibold text-slate-900">{stats.gndCount}</p>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Gender</p>
                            </div>
                            <div>
                               <p className="text-md font-semibold text-slate-900">{stats.count}</p>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Total</p>
                            </div>
                         </div>
                      </div>
                   </div>
                 </div>

                {/* Transaction Ledger */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 text-lg font-semibold">Transaction Ledger</p>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[15px] font-semibold text-slate-500">{filteredRecords.length} results</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-1.5 h-7">
                            <button 
                               onClick={() => setPage(p => Math.max(1, p - 1))} 
                               disabled={page === 1} 
                               className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50"
                            >←</button>
                            <span className="text-[15px] font-semibold text-slate-600 w-12 text-center">{page}</span>
                            <button 
                               onClick={() => setPage(p => p + 1)} 
                               disabled={page >= Math.ceil(filteredRecords.length / rowsPerPage)} 
                               className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50"
                            >→</button>
                         </div>
                      </div>
                   </div>
                   <div className="overflow-x-auto min-h-[400px]">
                     {recordsLoading ? (
                       <div className="p-20 flex flex-col items-center justify-center gap-4">
                          <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
                          <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Streaming Ledger Fragments...</p>
                       </div>
                     ) : (
                       <table className="w-full border-collapse">
                         <thead>
                           <tr className="bg-slate-50/20 text-[15px] font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-50">
                             <th className="px-6 py-4 text-left">Year</th>
                             <th className="px-6 py-4 text-left">Donor / Agency</th>
                             <th className="px-6 py-4 text-left">Amount</th>
                             <th className="px-6 py-4 text-left">Project Title</th>
                           </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                           {pagedRecords.map((record) => (
                             <tr key={record.id} onClick={() => setActiveRecord(record)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                               <td className="px-6 py-4 text-[15px] font-semibold text-slate-500 tabular-nums">{record.year}</td>
                               <td className="px-6 py-4">
                                  <div className="max-w-[200px]">
                                    <p className="text-[15px] font-semibold text-slate-900 line-clamp-1">{record.donor}</p>
                                    <p className="text-[15px] text-slate-400 font-semibold truncate">{record.agency}</p>
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-[15px] font-semibold text-slate-900 tabular-nums">
                                  {crsFmt.usdM(record[activeMeasure] || 0)}
                               </td>
                               <td className="px-6 py-4">
                                  <p className="text-[15px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{record.title}</p>
                                  <p className="text-[15px] text-slate-400 font-medium uppercase mt-0.5">{record.mode} • {record.purpose}</p>
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
          <SheetContent className="sm:max-w-xl border-l border-slate-200 bg-white/95 backdrop-blur-xl p-0">
             {activeRecord && (
                <div className="h-full flex flex-col">
                   <div className="bg-slate-900 p-8 text-white">
                      <span className="px-3 py-1 bg-blue-500 rounded-full text-[15px] font-semibold tracking-widest uppercase shadow-lg shadow-blue-500/20">Project Detail Review</span>
                      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight tracking-tight">{activeRecord.title}</h2>
                   </div>
                   <div className="flex-1 overflow-y-auto p-8 space-y-8">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                            <p className="text-[15px] font-semibold text-blue-600 uppercase mb-1">Commitment</p>
                            <p className="text-xl font-semibold text-blue-900 tabular-nums">{crsFmt.usdM(activeRecord.commitment)}</p>
                         </div>
                         <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                            <p className="text-[15px] font-semibold text-emerald-600 uppercase mb-1">Disbursement</p>
                            <p className="text-xl font-semibold text-emerald-900 tabular-nums">{crsFmt.usdM(activeRecord.disbursement)}</p>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <h4 className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Institutional Identification</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Source Donor</p>
                               <p className="text-[15px] font-semibold text-slate-900">{activeRecord.donor}</p>
                            </div>
                            <div>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Reporting Agency</p>
                               <p className="text-[15px] font-semibold text-slate-900">{activeRecord.agency}</p>
                            </div>
                            <div>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Recipient Economy</p>
                               <p className="text-[15px] font-semibold text-slate-900">{activeRecord.recipient}</p>
                            </div>
                            <div>
                               <p className="text-[15px] font-semibold text-slate-500 uppercase tracking-widest">Transport Mode</p>
                               <p className="text-[15px] font-semibold text-slate-900">{activeRecord.mode}</p>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <h4 className="flex items-center gap-2 text-[15px] font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                           <Info size={14} className="text-slate-400" /> Narrative Metadata
                         </h4>
                         <p className="text-base leading-relaxed text-slate-600 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                           {activeRecord.short_description || "No granular descriptive metadata available for this transaction."}
                         </p>
                      </div>
                   </div>
                </div>
             )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
