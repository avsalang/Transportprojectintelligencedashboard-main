import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CRS_DONOR_OPTIONS, CRS_FACTS, CRS_MODE_OPTIONS, CRSFact } from '../data/crsData';
import { ATO_ECONOMIES } from '../data/atoEconomies';
import { CRSFilters, CRS_SECTOR6_OPTIONS, isATOScopedRecipient, matchesCRSFilters } from '../utils/crsFiltering';

export type { CRSFilters };

type CRSFilterContextValue = {
  filters: CRSFilters;
  setFilters: (updater: (prev: CRSFilters) => CRSFilters) => void;
  resetFilters: () => void;
  filteredFacts: CRSFact[];
  donorOptions: string[];
  recipientOptions: string[];
  modeOptions: string[];
  sectorOptions: string[];
};

const DEFAULT_FILTERS: CRSFilters = {
  donors: [],
  recipients: [],
  modes: [],
  sectors: [],
  yearMin: 1973,
  yearMax: 2024,
  measure: 'commitment',
};

const CRSFilterContext = createContext<CRSFilterContextValue | null>(null);

function applyFilters(facts: CRSFact[], filters: CRSFilters): CRSFact[] {
  return facts.filter((fact) => matchesCRSFilters(fact, filters, ATO_ECONOMIES));
}

export function CRSFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<CRSFilters>(DEFAULT_FILTERS);

  const value = useMemo<CRSFilterContextValue>(() => {
    const atoScopedFacts = CRS_FACTS.filter((fact) => isATOScopedRecipient(fact, ATO_ECONOMIES));
    const filteredFacts = applyFilters(atoScopedFacts, filters);
    const recipientOptionSource = atoScopedFacts.filter((fact) => {
      const recipientFiltersCleared = { ...filters, recipients: [] };
      return matchesCRSFilters(fact, recipientFiltersCleared, ATO_ECONOMIES);
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
      recipientOptions,
      modeOptions: CRS_MODE_OPTIONS,
      sectorOptions: [...CRS_SECTOR6_OPTIONS],
    };
  }, [filters]);

  return <CRSFilterContext.Provider value={value}>{children}</CRSFilterContext.Provider>;
}

export function useCRSFilters() {
  const context = useContext(CRSFilterContext);
  if (!context) throw new Error('useCRSFilters must be used within CRSFilterProvider');
  return context;
}
