import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CRS_DONOR_OPTIONS, CRS_FACTS, CRS_MODE_OPTIONS, CRS_REGION_OPTIONS, CRSFact } from '../data/crsData';

export type CRSFilters = {
  donors: string[];
  regions: string[];
  recipients: string[];
  modes: string[];
  scopes: string[];
  yearMin: number;
  yearMax: number;
  isConstantUSD: boolean;
  climateMitigation: number | null; // 0, 1, 2
  climateAdaptation: number | null;
  gender: number | null;
  measure: 'commitment' | 'disbursement';
};

type CRSFilterContextValue = {
  filters: CRSFilters;
  setFilters: (updater: (prev: CRSFilters) => CRSFilters) => void;
  resetFilters: () => void;
  filteredFacts: CRSFact[];
  donorOptions: string[];
  regionOptions: string[];
  recipientOptions: string[];
  modeOptions: string[];
};

const DEFAULT_FILTERS: CRSFilters = {
  donors: [],
  regions: [],
  recipients: [],
  modes: [],
  scopes: [],
  yearMin: 1973,
  yearMax: 2024,
  isConstantUSD: false,
  climateMitigation: null,
  climateAdaptation: null,
  gender: null,
  measure: 'commitment',
};

const CRSFilterContext = createContext<CRSFilterContextValue | null>(null);

function applyFilters(facts: CRSFact[], filters: CRSFilters): CRSFact[] {
  return facts.filter((fact) => {
    if (filters.donors.length && !filters.donors.includes(fact.donor)) return false;
    if (filters.regions.length && !filters.regions.includes(fact.region || 'Unknown')) return false;
    if (filters.recipients.length && !filters.recipients.includes(fact.recipient || 'Unknown')) return false;
    if (filters.modes.length && !filters.modes.includes(fact.mode || 'Other')) return false;
    if (filters.scopes.length && !filters.scopes.includes(fact.recipient_scope || 'unknown')) return false;
    if (fact.year < filters.yearMin) return false;
    if (fact.year > filters.yearMax) return false;
    
    // Sustainability filters are currently retired from the global filter bar
    // if (filters.climateMitigation !== null && (fact.climate_mitigation ?? 0) < filters.climateMitigation) return false;
    // if (filters.climateAdaptation !== null && (fact.climate_adaptation ?? 0) < filters.climateAdaptation) return false;
    // if (filters.gender !== null && (fact.gender ?? 0) < filters.gender) return false;
    
    return true;
  });
}

export function CRSFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<CRSFilters>(DEFAULT_FILTERS);

  const value = useMemo<CRSFilterContextValue>(() => {
    const filteredFacts = applyFilters(CRS_FACTS, filters);
    const recipientOptionSource = CRS_FACTS.filter((fact) => {
      if (fact.recipient_scope !== 'economy') return false;
      if (filters.regions.length && !filters.regions.includes(fact.region || 'Unknown')) return false;
      return true;
    });
    const recipientOptions = [...new Set(recipientOptionSource.map((fact) => fact.recipient).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      filters,
      setFilters: (updater) => setFiltersState((prev) => updater(prev)),
      resetFilters: () => setFiltersState(DEFAULT_FILTERS),
      filteredFacts,
      donorOptions: CRS_DONOR_OPTIONS,
      regionOptions: CRS_REGION_OPTIONS,
      recipientOptions,
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
