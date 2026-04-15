import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { PROJECTS, FundingSource, Project } from '../data/mockData';

export type DashboardFilters = {
  sources: FundingSource[];
  regions: string[];
  modes: string[];
  statuses: string[];
  mappedOnly: boolean;
  includeLowPrecision: boolean;
  yearMin: string;
  yearMax: string;
};

type DashboardFilterContextValue = {
  filters: DashboardFilters;
  setFilters: (updater: (prev: DashboardFilters) => DashboardFilters) => void;
  resetFilters: () => void;
  filteredProjects: Project[];
  regions: string[];
  modes: string[];
  statuses: string[];
};

const DEFAULT_FILTERS: DashboardFilters = {
  sources: [],
  regions: [],
  modes: [],
  statuses: [],
  mappedOnly: false,
  includeLowPrecision: true,
  yearMin: '',
  yearMax: '',
};

const DashboardFilterContext = createContext<DashboardFilterContextValue | null>(null);

function applyFilters(projects: Project[], filters: DashboardFilters): Project[] {
  return projects.filter((project) => {
    if (filters.sources.length && !filters.sources.includes(project.funding_source)) return false;
    if (filters.regions.length && !filters.regions.includes(project.region || 'Unknown')) return false;
    if (filters.modes.length && !filters.modes.includes(project.mode_ato_umbrella || project.transport_mode_category || 'Other')) return false;
    if (filters.statuses.length && !filters.statuses.includes(project.project_status || 'Unknown')) return false;
    if (filters.mappedOnly && !project.has_coordinates) return false;
    if (!filters.includeLowPrecision && project.low_precision) return false;
    if (filters.yearMin) {
      const minYear = parseInt(filters.yearMin, 10);
      if (!Number.isNaN(minYear) && (project.approval_year === null || project.approval_year < minYear)) return false;
    }
    if (filters.yearMax) {
      const maxYear = parseInt(filters.yearMax, 10);
      if (!Number.isNaN(maxYear) && (project.approval_year === null || project.approval_year > maxYear)) return false;
    }
    return true;
  });
}

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const value = useMemo<DashboardFilterContextValue>(() => {
    const filteredProjects = applyFilters(PROJECTS, filters);
    const regions = [...new Set(PROJECTS.map((p) => p.region || 'Unknown').filter(Boolean))].sort();
    const modes = [...new Set(PROJECTS.map((p) => p.mode_ato_umbrella || p.transport_mode_category || 'Other').filter(Boolean))].sort();
    const statuses = [...new Set(PROJECTS.map((p) => p.project_status || 'Unknown').filter(Boolean))].sort();

    return {
      filters,
      setFilters: (updater) => setFiltersState((prev) => updater(prev)),
      resetFilters: () => setFiltersState(DEFAULT_FILTERS),
      filteredProjects,
      regions,
      modes,
      statuses,
    };
  }, [filters]);

  return <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>;
}

export function useDashboardFilters() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within DashboardFilterProvider');
  }
  return context;
}
