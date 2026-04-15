import { Filter, Layers, X } from 'lucide-react';
import { useCRSFilters } from '../context/CRSFilterContext';

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function CRSGlobalFilters() {
  const { filters, setFilters, resetFilters, donorOptions, regionOptions, regionDetailOptions, modeOptions, filteredFacts } = useCRSFilters();

  const activeCount =
    filters.donors.length +
    filters.regions.length +
    filters.regionDetails.length +
    filters.modes.length +
    filters.scopes.length +
    (filters.yearMin ? 1 : 0) +
    (filters.yearMax ? 1 : 0);

  return (
    <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-500" />
            <p className="text-slate-800 text-sm font-semibold">CRS Filters</p>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                {activeCount} active
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {filteredFacts.length.toLocaleString()} aggregated donor-recipient facts in current view
          </p>
        </div>
        {activeCount > 0 && (
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-6 gap-3 mt-4">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Donor</p>
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setFilters((prev) => ({ ...prev, donors: toggleValue(prev.donors, value) }));
              e.target.value = '';
            }}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
          >
            <option value="">Add donor…</option>
            {donorOptions.slice(0, 100).map((donor) => (
              <option key={donor} value={donor}>
                {donor}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.donors.map((donor) => (
              <button key={donor} onClick={() => setFilters((prev) => ({ ...prev, donors: prev.donors.filter((d) => d !== donor) }))} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                {donor}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Broad region</p>
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setFilters((prev) => ({ ...prev, regions: toggleValue(prev.regions, value) }));
              e.target.value = '';
            }}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
          >
            <option value="">Add region…</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.regions.map((region) => (
              <button key={region} onClick={() => setFilters((prev) => ({ ...prev, regions: prev.regions.filter((r) => r !== region) }))} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                {region}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Regional recipient</p>
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setFilters((prev) => ({ ...prev, regionDetails: toggleValue(prev.regionDetails, value) }));
              e.target.value = '';
            }}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
          >
            <option value="">Add regional recipient…</option>
            {regionDetailOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.regionDetails.map((region) => (
              <button key={region} onClick={() => setFilters((prev) => ({ ...prev, regionDetails: prev.regionDetails.filter((r) => r !== region) }))} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                {region}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Mode</p>
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setFilters((prev) => ({ ...prev, modes: toggleValue(prev.modes, value) }));
              e.target.value = '';
            }}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
          >
            <option value="">Add mode…</option>
            {modeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.modes.map((mode) => (
              <button key={mode} onClick={() => setFilters((prev) => ({ ...prev, modes: prev.modes.filter((m) => m !== mode) }))} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Recipient scope</p>
          <div className="space-y-1.5">
            {['economy', 'regional', 'non_country'].map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.scopes.includes(scope)}
                  onChange={() => setFilters((prev) => ({ ...prev, scopes: toggleValue(prev.scopes, scope) }))}
                />
                <Layers size={12} className="text-slate-400" />
                {scope}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Year</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="From"
              value={filters.yearMin}
              onChange={(e) => setFilters((prev) => ({ ...prev, yearMin: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
            <input
              type="number"
              placeholder="To"
              value={filters.yearMax}
              onChange={(e) => setFilters((prev) => ({ ...prev, yearMax: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
