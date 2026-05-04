import { useMemo, useState } from 'react';
import { Search, MapPin, MapPinOff, ChevronUp, ChevronDown, AlertCircle, X } from 'lucide-react';
import { PROJECTS, Project, fmt } from '../data/mockData';
import { ProjectDrawer } from '../components/ProjectDrawer';
import { SourceBadge } from '../components/SourceBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ModePill } from '../components/ModePill';
import { useDashboardFilters } from '../context/DashboardFilterContext';

type SortKey =
  | 'project_name'
  | 'country'
  | 'funding_source'
  | 'approval_year'
  | 'amount'
  | 'mode_ato_umbrella'
  | 'project_status';
type SortDir = 'asc' | 'desc';

export function ProjectExplorer() {
  const { filteredProjects } = useDashboardFilters();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('approval_year');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    let data = [...filteredProjects];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.project_name.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.transport_mode_category.toLowerCase().includes(q) ||
          p.transport_mode_detail.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredProjects, search, sortDir, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'approval_year' || key === 'amount' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-slate-600" />
    ) : (
      <ChevronDown size={12} className="text-slate-600" />
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-4">
        <div>
          <h1 className="text-slate-900 text-xl font-semibold">Project Explorer</h1>
          <p className="text-slate-500 text-base mt-0.5">
            Search inside the current portfolio view. Global filters above control the project universe.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name, country, ID, description, or mode…"
              className="w-full pl-9 pr-10 py-2 text-base border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 text-base text-slate-500">
            <span className="font-medium text-slate-800">{filtered.length}</span>
            <span>of {filteredProjects.length} projects in current view</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {(
                  [
                    ['project_name', 'Project Name'],
                    ['country', 'Country'],
                    ['funding_source', 'MDB'],
                    ['mode_ato_umbrella', 'ATO Mode'],
                    ['project_status', 'Status'],
                    ['approval_year', 'Year'],
                    ['amount', 'Amount'],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    className="text-left px-4 py-3 text-[15px] font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700 whitespace-nowrap"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[15px] font-semibold text-slate-500 text-center">
                  Map
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-base">
                    No projects match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  onClick={() => setSelectedProject(project)}
                >
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="text-slate-800 font-medium leading-snug truncate group-hover:text-blue-700">
                      {project.project_name}
                    </p>
                    <p className="text-slate-500 text-[15px] mt-0.5 font-mono">{project.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <span className="text-[15px]">{project.country.replace("People's Republic of ", '')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={project.funding_source} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <ModePill mode={project.mode_ato_umbrella || project.transport_mode_category} />
                      <p className="text-[15px] text-slate-400">{project.mode_ato_detail || project.transport_mode_detail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.project_status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums text-[15px] whitespace-nowrap">
                    {project.approval_year ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700 tabular-nums text-[15px] whitespace-nowrap font-medium">
                    {fmt.usd(project.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {project.has_coordinates ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} className="text-emerald-500" />
                        {project.low_precision && (
                          <AlertCircle size={11} className="text-amber-400" title="Low precision" />
                        )}
                      </span>
                    ) : (
                      <MapPinOff size={13} className="text-slate-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <p className="text-slate-500 text-[15px] mt-3 text-center">
            Showing {filtered.length} projects from the active portfolio view
          </p>
        )}
      </div>

      <ProjectDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
