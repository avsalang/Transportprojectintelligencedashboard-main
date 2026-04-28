import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Info, Check, X } from 'lucide-react';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import { matchesCRSFilters } from '../utils/crsFiltering';
import { ATO_ECONOMIES } from '../data/atoEconomies';

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
  description: string;
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
};

export function CRSFullList() {
  const { filters } = useCRSFilters();
  const [recordIndex, setRecordIndex] = useState<CRSRecordIndex | null>(null);
  const [loadedChunks, setLoadedChunks] = useState<Record<string, CRSRecord[]>>({});
  const [indexLoading, setIndexLoading] = useState(true);
  const [chunksToLoad, setChunksToLoad] = useState<number[]>([]);
  const [activeRecord, setActiveRecord] = useState<CRSRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  const measure = filters.measure;
  const activeMeasure = measure.includes('commitment') ? 'commitment_defl' : 'disbursement_defl';

  // 1. Load the record index
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/crs-records/index.json`);
        const data = await res.json();
        setRecordIndex(data);
        // Initially load first 3 chunks to show something quickly
        setChunksToLoad([1, 2, 3]);
      } catch (e) {
        console.error('Failed to load CRS record index', e);
      } finally {
        setIndexLoading(false);
      }
    }
    init();
  }, []);

  // 2. Load chunks in background
  useEffect(() => {
    async function loadNext() {
      if (!recordIndex) return;
      const nextId = chunksToLoad.find(id => !loadedChunks[String(id)]);
      if (nextId === undefined) return;

      try {
        const chunk = recordIndex.chunks.find(c => c.id === nextId);
        if (!chunk) return;
        const res = await fetch(`${import.meta.env.BASE_URL}${chunk.file}`);
        const data = await res.json();
        setLoadedChunks(prev => ({ ...prev, [String(nextId)]: data }));
        
        // After loading one, schedule the next if there are more
        const remaining = recordIndex.chunks.map(c => c.id).filter(id => !loadedChunks[String(id)] && id !== nextId);
        if (remaining.length > 0) {
            setChunksToLoad(prev => [...prev, remaining[0]]);
        }
      } catch (e) {
        console.error(`Failed to load shard ${nextId}`, e);
      }
    }
    loadNext();
  }, [chunksToLoad, recordIndex, loadedChunks]);

  const allLoadedRecords = useMemo(() => {
    return Object.values(loadedChunks).flat();
  }, [loadedChunks]);

  // 3. Intelligent Search & Filtering
  const filteredRecords = useMemo(() => {
    let result = allLoadedRecords.filter(r => matchesCRSFilters(r, filters, ATO_ECONOMIES));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        const title = (r.title || '').toLowerCase();
        const donor = (r.donor || '').toLowerCase();
        const recipient = (r.recipient || '').toLowerCase();
        const desc = (r.description || r.short_description || '').toLowerCase();
        const year = String(r.year || '');

        // Simple weighted multi-field search
        return title.includes(q) || 
               donor.includes(q) || 
               recipient.includes(q) || 
               desc.includes(q) || 
               year.includes(q);
      });
      // Sort by "relevance" (title match first)
      result.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const bTitle = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        if (aTitle !== bTitle) return bTitle - aTitle;
        return (b[activeMeasure] || 0) - (a[activeMeasure] || 0);
      });
    } else {
      // Default sort: Year (newest) then Volume
      result.sort((a,b) => (b.year || 0) - (a.year || 0) || (b[activeMeasure] || 0) - (a[activeMeasure] || 0));
    }

    return result;
  }, [allLoadedRecords, filters, searchQuery, activeMeasure]);

  const pagedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  const ThemeIndicator = ({ val, label }: { val: number; label: string }) => (
    <div className="flex flex-col items-center gap-1 group/theme">
      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
        val > 0 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'
      }`}>
        {val > 0 ? <Check size={12} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-slate-200" />}
      </div>
      <span className="text-[10px] text-slate-400 invisible group-hover/theme:visible absolute -bottom-4 bg-slate-800 text-white px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
        {label}
      </span>
    </div>
  );

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Full project list</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              Comprehensive registry of individuated transactions across the transport portfolio.
              {indexLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 w-full md:w-96">
            <Search className="text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search"
              className="bg-transparent border-none focus:ring-0 text-[15px] w-full placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="text-[14px] font-semibold text-slate-900 uppercase tracking-widest">Project registry</span>
               <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[13px] font-bold rounded-full border border-blue-100">
                 {filteredRecords.length.toLocaleString()} matches
               </span>
               {allLoadedRecords.length < (recordIndex?.totalRecords || 0) && (
                 <span className="text-[12px] text-slate-400 flex items-center gap-1.5 animate-pulse">
                   <Loader2 size={12} className="animate-spin" /> Loading more shards...
                 </span>
               )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
                >←</button>
                <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[14px] font-medium text-slate-700 shadow-sm">
                   Page {page} of {totalPages || 1}
                </div>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
                >→</button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/30 text-[12px] text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 text-left font-bold text-slate-400">Year</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-400">Project details</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-400">Recipient</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-400">Mode</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-400">Thematic alignment (6)</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-400">Amount (million USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <Search className="text-slate-200" size={48} />
                          <p className="text-slate-500 font-medium">No projects match the current search or filters.</p>
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 text-sm font-semibold hover:underline">Clear search</button>
                       </div>
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      onClick={() => setActiveRecord(record)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-5 text-[14px] text-slate-500 tabular-nums font-medium">
                        {record.year}
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-[480px] space-y-1">
                          <p className="text-[15px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                            {record.title}
                          </p>
                          <div className="relative">
                            <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed">
                              {record.description || record.short_description || "No description available."}
                            </p>
                            {/* Fade effect for long text */}
                            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/80 to-transparent pointer-events-none group-hover:from-slate-50/80 transition-colors" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="text-[14px] font-semibold text-slate-700 line-clamp-1">{record.recipient}</span>
                            <span className="text-[12px] text-slate-400 font-medium uppercase tracking-tight">{record.donor}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                          {record.mode}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2 relative">
                          <ThemeIndicator val={record.climate_mitigation} label="Mitigation" />
                          <ThemeIndicator val={record.climate_adaptation} label="Adaptation" />
                          <ThemeIndicator val={record.gender} label="Gender" />
                          <ThemeIndicator val={record.drr} label="DRR" />
                          <ThemeIndicator val={record.biodiversity} label="Biodiversity" />
                          <ThemeIndicator val={record.environment} label="Environment" />
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right text-[15px] font-bold text-slate-900 tabular-nums">
                        {crsFmt.usdM(record[activeMeasure] || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Sheet open={!!activeRecord} onOpenChange={() => setActiveRecord(null)}>
        <SheetContent className="sm:max-w-2xl border-l border-slate-200 bg-white/95 backdrop-blur-xl p-0 shadow-2xl">
          {activeRecord && (
            <div className="h-full flex flex-col">
               <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/50">
                    Project Detail Review
                  </span>
                  <h2 className="text-2xl text-white font-bold leading-tight mt-6 tracking-tight">
                    {activeRecord.title}
                  </h2>
               </div>

               <div className="flex-1 overflow-y-auto p-10 space-y-10">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100/50 shadow-sm">
                        <p className="text-[13px] font-bold text-blue-600 uppercase tracking-widest mb-2">Commitment</p>
                        <p className="text-3xl font-black text-blue-900 tabular-nums">{crsFmt.usdM(activeRecord.commitment)}</p>
                     </div>
                     <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100/50 shadow-sm">
                        <p className="text-[13px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Disbursement</p>
                        <p className="text-3xl font-black text-emerald-900 tabular-nums">{crsFmt.usdM(activeRecord.disbursement)}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Institutional Context</h3>
                     <div className="grid grid-cols-2 gap-y-8 gap-x-8">
                        <div className="space-y-1">
                           <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Reporting Year</p>
                           <p className="text-base font-bold text-slate-900">{activeRecord.year}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Transport Mode</p>
                           <p className="text-base font-bold text-slate-900">{activeRecord.mode}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Funding Donor</p>
                           <p className="text-base font-bold text-slate-900">{activeRecord.donor}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Implementing Agency</p>
                           <p className="text-base font-bold text-slate-900">{activeRecord.agency}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Recipient Economy</p>
                           <p className="text-base font-bold text-slate-900">{activeRecord.recipient}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Flow Type</p>
                           <p className="text-base font-bold text-slate-900">{activeRecord.flow}</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
              <h3 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">CRS Tag Alignment</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { l: 'Mitigation', v: activeRecord.climate_mitigation },
                          { l: 'Adaptation', v: activeRecord.climate_adaptation },
                          { l: 'Gender', v: activeRecord.gender },
                          { l: 'DRR', v: activeRecord.drr },
                          { l: 'Biodiversity', v: activeRecord.biodiversity },
                          { l: 'Environment', v: activeRecord.environment }
                        ].map(m => (
                          <div key={m.l} className={`p-4 rounded-xl border flex items-center justify-between ${
                            m.v > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}>
                            <span className={`text-[13px] font-bold ${m.v > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{m.l}</span>
                            {m.v > 0 ? <Check size={16} strokeWidth={3} className="text-emerald-600" /> : <X size={14} className="text-slate-300" />}
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Description</h3>
                     <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner">
                        <p className="text-base leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                          {activeRecord.description || activeRecord.short_description || "Detailed descriptive metadata not available for this record."}
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
