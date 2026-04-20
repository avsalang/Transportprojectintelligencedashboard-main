import { X } from 'lucide-react';
import { useCRSFilters } from '../context/CRSFilterContext';
import { CheckboxDropdown } from './CheckboxDropdown';
import { TimeSlider } from './TimeSlider';

export function CRSGlobalFilters() {
  const { 
    filters, 
    setFilters, 
    resetFilters, 
    donorOptions, 
    regionOptions, 
    recipientOptions, 
    modeOptions, 
    filteredFacts 
  } = useCRSFilters();

  const activeCount =
    filters.donors.length +
    filters.regions.length +
    filters.recipients.length +
    filters.modes.length +
    filters.scopes.length +
    (filters.yearMin > 1973 ? 1 : 0) +
    (filters.yearMax < 2024 ? 1 : 0);

  return (
    <div className="px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
              <h2 className="text-slate-900 text-lg tracking-tight">Funding filters</h2>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-medium">
                  {activeCount} active
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[14px] mt-0.5 font-normal">
              Analyzing <span className="text-slate-900 font-medium">{filteredFacts.length.toLocaleString()}</span> granular transaction lines
            </p>
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-2" />

          {/* USD Toggle Switch */}
          <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setFilters(prev => ({ ...prev, isConstantUSD: false }))}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${!filters.isConstantUSD ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Current USD
            </button>
            <button 
              onClick={() => setFilters(prev => ({ ...prev, isConstantUSD: true }))}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filters.isConstantUSD ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Constant USD
            </button>
          </div>
        </div>

        {activeCount > 0 && (
          <button 
            onClick={resetFilters} 
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
          >
            <X size={14} />
            Reset all
          </button>
        )}


      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <CheckboxDropdown
          label="Donors"
          options={donorOptions}
          selected={filters.donors}
          onChange={(val) => setFilters(prev => ({ ...prev, donors: val }))}
        />
        
        <CheckboxDropdown
          label="Regions"
          options={regionOptions}
          selected={filters.regions}
          onChange={(val) => setFilters(prev => ({ ...prev, regions: val }))}
        />

        <CheckboxDropdown
          label="Economies"
          options={recipientOptions}
          selected={filters.recipients}
          onChange={(val) => setFilters(prev => ({ ...prev, recipients: val }))}
        />

        <CheckboxDropdown
          label="Modes"
          options={modeOptions}
          selected={filters.modes}
          onChange={(val) => setFilters(prev => ({ ...prev, modes: val }))}
        />

        <div className="lg:col-span-1">
          <TimeSlider
            label="Year Range"
            min={1973}
            max={2024}
            yearMin={filters.yearMin}
            yearMax={filters.yearMax}
            onChange={(min, max) => setFilters(prev => ({ ...prev, yearMin: min, yearMax: max }))}
          />
        </div>

        <div className="flex flex-col justify-end gap-2.5">
           <label className="block text-[14px] text-slate-400 ml-1">
             Financial Basis
           </label>
           <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
             <button 
                onClick={() => setFilters(prev => ({ ...prev, measure: 'commitment' }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${filters.measure === 'commitment' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 border border-transparent'}`}
             >
                Commitments
             </button>
             <button 
                onClick={() => setFilters(prev => ({ ...prev, measure: 'disbursement' }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${filters.measure === 'disbursement' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 border border-transparent'}`}
             >
                Disbursements
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
