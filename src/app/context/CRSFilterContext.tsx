import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CRS_DONOR_OPTIONS, CRS_FACTS, CRS_MODE_OPTIONS, CRS_REGION_DETAIL_OPTIONS, CRS_REGION_OPTIONS, CRSFact } from '../data/crsData';

export type CRSFilters = {
  donors: string[];
  regions: string[];
  regionDetails: string[];
  modes: string[];
  scopes: string[];
  yearMin: string;
  yearMax: string;
};

type CRSFilterContextValue = {
  filters: CRSFilters;
  setFilters: (updater: (prev: CRSFilters) => CRSFilters) => void;
  resetFilters: () => void;
  filteredFacts: CRSFact[];
  donorOptions: string[];
  regionOptions: string[];
  regionDetailOptions: string[];
  modeOptions: string[];
};

const DEFAULT_FILTERS: CRSFilters = {
  donors: [],
  regions: [],
  regionDetails: [],
  modes: [],
  scopes: [],
  yearMin: '',
  yearMax: '',
};

const CRSFilterContext = createContext<CRSFilterContextValue | null>(null);

function applyFilters(facts: CRSFact[], filters: CRSFilters): CRSFact[] {
  return facts.filter((fact) => {
    if (filters.donors.length && !filters.donors.includes(fact.donor)) return false;
    if (filters.regions.length && !filters.regions.includes(fact.region || 'Unknown')) return false;
    if (filters.regionDetails.length && !filters.regionDetails.includes(fact.recipient_region_detail || '')) return false;
    if (filters.modes.length && !filters.modes.includes(fact.mode || 'Other')) return false;
    if (filters.scopes.length && !filters.scopes.includes(fact.recipient_scope || 'unknown')) return false;
    if (filters.yearMin) {
      const minYear = parseInt(filters.yearMin, 10);
      if (!Number.isNaN(minYear) && fact.year < minYear) return false;
    }
    if (filters.yearMax) {
      const maxYear = parseInt(filters.yearMax, 10);
      if (!Number.isNaN(maxYear) && fact.year > maxYear) return false;
    }
    return true;
  });
}

export function CRSFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<CRSFilters>(DEFAULT_FILTERS);

  const value = useMemo<CRSFilterContextValue>(() => {
    const filteredFacts = applyFilters(CRS_FACTS, filters);

    return {
      filters,
      setFilters: (updater) => setFiltersState((prev) => updater(prev)),
      resetFilters: () => setFiltersState(DEFAULT_FILTERS),
      filteredFacts,
      donorOptions: CRS_DONOR_OPTIONS,
      regionOptions: CRS_REGION_OPTIONS,
      regionDetailOptions: CRS_REGION_DETAIL_OPTIONS,
      modeOptions: CRS_MODE_OPTIONS,
    };
  }, [filters]);

  return <CRSFilterContext.Provider value={value}>{children}</CRSFilterContext.Provider>;
}

export function useCRSFilters() {
  const context = useContext(CRSFilterContext);
  if (!context) throw new Error('useCRSFilters must be used within CRSFilterProvider');
  return context;
}
