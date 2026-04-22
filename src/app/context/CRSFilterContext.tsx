import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CRS_DONOR_OPTIONS, CRS_FACTS, CRS_MODE_OPTIONS, CRS_REGION_OPTIONS, CRSFact } from '../data/crsData';
import { ATO_ECONOMIES } from '../data/atoEconomies';
import { CRSFilters, matchesCRSFilters } from '../utils/crsFiltering';

export type { CRSFilters };

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
  return facts.filter((fact) => matchesCRSFilters(fact, filters, ATO_ECONOMIES));
}

export function CRSFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<CRSFilters>(DEFAULT_FILTERS);

  const value = useMemo<CRSFilterContextValue>(() => {
    const filteredFacts = applyFilters(CRS_FACTS, filters);
    const recipientOptionSource = CRS_FACTS.filter((fact) => {
      if (fact.recipient_scope !== 'economy') return false;
      return matchesCRSFilters(fact, filters, ATO_ECONOMIES);
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
