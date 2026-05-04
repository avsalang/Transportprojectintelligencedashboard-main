import { X, Filter, MapPin, AlertTriangle } from 'lucide-react';
import { FundingSource, MDB_COLORS } from '../data/mockData';
import { useDashboardFilters } from '../context/DashboardFilterContext';

const SOURCES: FundingSource[] = ['World Bank', 'ADB', 'AIIB'];

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function GlobalFilters() {
  const { filters, setFilters, resetFilters, regions, modes, statuses, filteredProjects } = useDashboardFilters();

  const activeCount =
    filters.sources.length +
    filters.regions.length +
    filters.modes.length +
    filters.statuses.length +
    (filters.mappedOnly ? 1 : 0) +
    (!filters.includeLowPrecision ? 1 : 0) +
    (filters.yearMin ? 1 : 0) +
    (filters.yearMax ? 1 : 0);

  return (
    <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-500" />
            <p className="text-slate-800 text-sm font-semibold">Portfolio Filters</p>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                {activeCount} active
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {filteredProjects.length.toLocaleString()} projects in current view
          </p>
        </div>
        {activeCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-6 gap-3 mt-4">
        <div>
          <p className="text-[11px] text-slate-500 mb-2">MDB</p>
          <div className="space-y-1.5">
            {SOURCES.map((source) => (
              <label key={source} className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.sources.includes(source)}
                  onChange={() =>
                    setFilters((prev) => ({ ...prev, sources: toggleValue(prev.sources, source) }))
                  }
                />
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MDB_COLORS[source] }} />
                {source}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 mb-2">Region</p>
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
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.regions.map((region) => (
              <button
                key={region}
                onClick={() => setFilters((prev) => ({ ...prev, regions: prev.regions.filter((r) => r !== region) }))}
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]"
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 mb-2">Mode</p>
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
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.modes.map((mode) => (
              <button
                key={mode}
                onClick={() => setFilters((prev) => ({ ...prev, modes: prev.modes.filter((m) => m !== mode) }))}
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 mb-2">Status</p>
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setFilters((prev) => ({ ...prev, statuses: toggleValue(prev.statuses, value) }));
              e.target.value = '';
            }}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
          >
            <option value="">Add status…</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.statuses.map((status) => (
              <button
                key={status}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, statuses: prev.statuses.filter((s) => s !== status) }))
                }
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]"
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 mb-2">Approval year</p>
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

        <div>
          <p className="text-[11px] text-slate-500 mb-2">Map filters</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={filters.mappedOnly}
                onChange={(e) => setFilters((prev) => ({ ...prev, mappedOnly: e.target.checked }))}
              />
              <MapPin size={12} className="text-emerald-500" />
              Mapped only
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={!filters.includeLowPrecision}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, includeLowPrecision: !e.target.checked }))
                }
              />
              <AlertTriangle size={12} className="text-amber-500" />
              Hide low precision
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
