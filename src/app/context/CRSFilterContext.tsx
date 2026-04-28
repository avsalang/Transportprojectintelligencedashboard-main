import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CRS_DONOR_OPTIONS, CRS_FACTS, CRS_MODE_OPTIONS, CRSFact } from '../data/crsData';
import { ATO_ECONOMIES } from '../data/atoEconomies';
import { CRSFilters, CRS_SECTOR6_OPTIONS, isATOScopedRecipient, matchesCRSFilters } from '../utils/crsFiltering';

export type { CRSFilters };

type CRSFilterContextValue = {
  facts: CRSFact[];
  filteredFacts: CRSFact[];
  donorOptions: string[];
  agencyOptions: string[];
  recipientOptions: string[];
  modeOptions: string[];
  flowOptions: string[];
  sectorOptions: string[];
};

export const DEFAULT_CRS_FILTERS: CRSFilters = {
  donors: [],
  agencies: [],
  recipients: [],
  modes: [],
  flows: [],
  sectors: [],
  yearMin: 1973,
  yearMax: 2024,
  measure: 'commitment_defl',
};

const CRSFilterContext = createContext<CRSFilterContextValue | null>(null);

export function applyCRSFilters(facts: CRSFact[], filters: CRSFilters): CRSFact[] {
  return facts.filter((fact) => matchesCRSFilters(fact, filters, ATO_ECONOMIES));
}

function uniqueSorted(values: Array<string | undefined | null>) {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}

export function CRSFilterProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CRSFilterContextValue>(() => {
    const atoScopedFacts = CRS_FACTS.filter((fact) => isATOScopedRecipient(fact, ATO_ECONOMIES));

    return {
      facts: atoScopedFacts,
      filteredFacts: atoScopedFacts,
      donorOptions: CRS_DONOR_OPTIONS,
      agencyOptions: uniqueSorted(atoScopedFacts.map((fact) => fact.agency)),
      recipientOptions: uniqueSorted(atoScopedFacts.map((fact) => fact.recipient)),
      modeOptions: CRS_MODE_OPTIONS,
      flowOptions: uniqueSorted(atoScopedFacts.map((fact) => fact.flow)),
      sectorOptions: [...CRS_SECTOR6_OPTIONS],
    };
  }, []);

  return <CRSFilterContext.Provider value={value}>{children}</CRSFilterContext.Provider>;
}

export function useCRSFilters() {
  const context = useContext(CRSFilterContext);
  if (!context) throw new Error('useCRSFilters must be used within CRSFilterProvider');
  return context;
}

export function useCRSPageFilters(initialFilters?: Partial<CRSFilters>) {
  const { facts } = useCRSFilters();
  const [filters, setFiltersState] = useState<CRSFilters>({
    ...DEFAULT_CRS_FILTERS,
    ...initialFilters,
  });

  const filteredFacts = useMemo(() => applyCRSFilters(facts, filters), [facts, filters]);

  return {
    filters,
    setFilters: (updater: (prev: CRSFilters) => CRSFilters) => setFiltersState((prev) => updater(prev)),
    resetFilters: () => setFiltersState({ ...DEFAULT_CRS_FILTERS, ...initialFilters }),
    filteredFacts,
  };
}
