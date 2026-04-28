import { X } from 'lucide-react';
import { CheckboxDropdown } from './CheckboxDropdown';
import { YearRangeSelector } from './YearRangeSelector';
import { CRSFilters } from '../utils/crsFiltering';
import { useCRSFilters } from '../context/CRSFilterContext';

type FilterKey = 'year' | 'donor' | 'agency' | 'recipient' | 'mode' | 'flow' | 'sector' | 'basis';

type CRSPageFiltersProps = {
  filters: CRSFilters;
  setFilters: (updater: (prev: CRSFilters) => CRSFilters) => void;
  resetFilters: () => void;
  enabled: FilterKey[];
  recordCount?: number;
};

export function CRSPageFilters({ filters, setFilters, resetFilters, enabled, recordCount }: CRSPageFiltersProps) {
  const { donorOptions, agencyOptions, recipientOptions, modeOptions, flowOptions, sectorOptions } = useCRSFilters();
  const enabledSet = new Set(enabled);
  const activeCount =
    filters.donors.length +
    filters.agencies.length +
    filters.recipients.length +
    filters.modes.length +
    filters.flows.length +
    filters.sectors.length +
    (filters.yearMin > 1973 ? 1 : 0) +
    (filters.yearMax < 2024 ? 1 : 0);

  const recipientOptionGroups = [
    {
      title: 'ATO Economies',
      options: recipientOptions.filter((option) => !option.includes(', regional')),
    },
    {
      title: 'Asia Regional Recipients',
      options: recipientOptions.filter((option) => option.includes(', regional')),
    },
  ].filter((group) => group.options.length > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
          {typeof recordCount === 'number' ? (
            <p className="mt-0.5 text-[14px] text-slate-500">
              Analyzing <span className="font-medium text-slate-900">{recordCount.toLocaleString()}</span> records in this view
            </p>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={14} />
            Reset
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {enabledSet.has('year') ? (
          <YearRangeSelector
            label="Year"
            min={1973}
            max={2024}
            yearMin={filters.yearMin}
            yearMax={filters.yearMax}
            onChange={(min, max) => setFilters((prev) => ({ ...prev, yearMin: min, yearMax: max }))}
          />
        ) : null}

        {enabledSet.has('donor') ? (
          <CheckboxDropdown
            label="Donor"
            options={donorOptions}
            selected={filters.donors}
            onChange={(value) => setFilters((prev) => ({ ...prev, donors: value }))}
          />
        ) : null}

        {enabledSet.has('agency') ? (
          <CheckboxDropdown
            label="Agency"
            options={agencyOptions}
            selected={filters.agencies}
            onChange={(value) => setFilters((prev) => ({ ...prev, agencies: value }))}
          />
        ) : null}

        {enabledSet.has('recipient') ? (
          <CheckboxDropdown
            label="Recipient"
            options={recipientOptions}
            optionGroups={recipientOptionGroups}
            selected={filters.recipients}
            onChange={(value) => setFilters((prev) => ({ ...prev, recipients: value }))}
          />
        ) : null}

        {enabledSet.has('mode') ? (
          <CheckboxDropdown
            label="Mode"
            options={modeOptions}
            selected={filters.modes}
            onChange={(value) => setFilters((prev) => ({ ...prev, modes: value }))}
          />
        ) : null}

        {enabledSet.has('flow') ? (
          <CheckboxDropdown
            label="Flow"
            options={flowOptions}
            selected={filters.flows}
            onChange={(value) => setFilters((prev) => ({ ...prev, flows: value }))}
          />
        ) : null}

        {enabledSet.has('sector') ? (
          <CheckboxDropdown
            label="CRS Tag"
            options={sectorOptions}
            selected={filters.sectors}
            onChange={(value) => setFilters((prev) => ({ ...prev, sectors: value }))}
          />
        ) : null}

        {enabledSet.has('basis') ? (
          <div className="flex flex-col justify-end gap-1.5">
            <label className="ml-1 block text-[14px] font-semibold uppercase tracking-widest text-slate-400">Basis</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, measure: 'commitment_defl' }))}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                  filters.measure.includes('commitment')
                    ? 'border-slate-200 bg-white text-blue-600 shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Commitments
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, measure: 'disbursement_defl' }))}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                  filters.measure.includes('disbursement')
                    ? 'border-slate-200 bg-white text-blue-600 shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Disbursements
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
