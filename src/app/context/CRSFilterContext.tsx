import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { CRS_DONOR_OPTIONS, CRS_FACTS_URL, CRS_MODE_OPTIONS, CRSFact } from '../data/crsData';
import { ATO_ECONOMIES } from '../data/atoEconomies';
import { CRSFilters, CRS_SECTOR6_OPTIONS, isATOScopedRecipient, matchesCRSFilters } from '../utils/crsFiltering';

export type { CRSFilters };

type CRSFilterContextValue = {
  facts: CRSFact[];
  filteredFacts: CRSFact[];
  donorOptions: string[];
  recipientOptions: string[];
  modeOptions: string[];
  flowOptions: string[];
  sectorOptions: string[];
  isLoading: boolean;
  error: string | null;
};

export const DEFAULT_CRS_FILTERS: CRSFilters = {
  donors: [],
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
  const [facts, setFacts] = useState<CRSFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFacts() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(CRS_FACTS_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = (await response.json()) as CRSFact[];
        if (!cancelled) {
          setFacts(rows.filter((fact) => isATOScopedRecipient(fact, ATO_ECONOMIES)));
        }
      } catch (err) {
        if (!cancelled) {
          setFacts([]);
          setError(err instanceof Error ? err.message : 'Unable to load CRS facts');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFacts();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CRSFilterContextValue>(() => {
    return {
      facts,
      filteredFacts: facts,
      donorOptions: CRS_DONOR_OPTIONS,
      recipientOptions: uniqueSorted(facts.map((fact) => fact.recipient)),
      modeOptions: CRS_MODE_OPTIONS,
      flowOptions: uniqueSorted(facts.map((fact) => fact.flow)),
      sectorOptions: [...CRS_SECTOR6_OPTIONS],
      isLoading,
      error,
    };
  }, [error, facts, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div>
          <p className="text-base font-semibold text-slate-900">Loading dashboard data...</p>
          <p className="mt-2 text-sm text-slate-500">Fetching CRS aggregates for Asia and the Pacific.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-base font-semibold text-slate-900">Dashboard data could not load</p>
          <p className="mt-2 text-sm text-slate-500">CRS facts request failed: {error}</p>
        </div>
      </div>
    );
  }

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
