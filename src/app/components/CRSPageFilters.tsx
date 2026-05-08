import { X } from 'lucide-react';
import { CheckboxDropdown } from './CheckboxDropdown';
import { YearRangeSelector } from './YearRangeSelector';
import { BasisDropdown } from './BasisDropdown';
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
          <p className="text-[13px] font-semibold text-slate-500">Filters</p>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 2xl:grid-cols-9">
        {enabledSet.has('year') ? (
          <div className="xl:col-span-2">
            <YearRangeSelector
              label="Year"
              min={1973}
              max={2024}
              yearMin={filters.yearMin}
              yearMax={filters.yearMax}
              onChange={(min, max) => setFilters((prev) => ({ ...prev, yearMin: min, yearMax: max }))}
            />
          </div>
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
          <div className="xl:col-span-2">
            <CheckboxDropdown
              label="Sustainability-related Tags"
              options={sectorOptions}
              selected={filters.sectors}
              onChange={(value) => setFilters((prev) => ({ ...prev, sectors: value }))}
            />
          </div>
        ) : null}

        {enabledSet.has('basis') ? (
          <div className="xl:col-span-2">
            <BasisDropdown
              value={filters.measure}
              onChange={(measure) =>
                setFilters((prev) => ({
                  ...prev,
                  measure,
                }))
              }
            />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-[12px] text-slate-500">
        Amounts are shown in constant 2024 USD where applicable.
      </p>
    </div>
  );
}
