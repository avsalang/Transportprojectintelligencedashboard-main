import { useMemo, useState } from 'react';
import { MapPin, DollarSign, TrendingUp, Flame, Orbit, Globe } from 'lucide-react';
import { MDB_COLORS, MODE_COLORS, Project, fmt } from '../data/mockData';
import { useDashboardFilters } from '../context/DashboardFilterContext';
import { StyledProjectMap } from '../components/StyledProjectMap';
import { ProjectDrawer } from '../components/ProjectDrawer';

type MapView = 'points' | 'heatmap';

export function Geography() {
  const { filteredProjects } = useDashboardFilters();
  const [mapView, setMapView] = useState<MapView>('points');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const countrySummaries = useMemo(() => {
    const countryMap = new Map<string, { country: string; count: number; financing: number }>();
    filteredProjects.forEach((project) => {
      const key = project.country || 'Unknown';
      if (!countryMap.has(key)) countryMap.set(key, { country: key, count: 0, financing: 0 });
      const entry = countryMap.get(key)!;
      entry.count += 1;
      entry.financing += (project.amount ?? 0) / 1_000_000_000;
    });
    return [...countryMap.values()].sort((a, b) => b.count - a.count);
  }, [filteredProjects]);

  const selectedCountryProjects = useMemo(
    () => (selectedCountry ? filteredProjects.filter((project) => project.country === selectedCountry) : []),
    [filteredProjects, selectedCountry]
  );

  const selectedCountryStats = useMemo(() => {
    if (!selectedCountry) return null;
    const modeMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    selectedCountryProjects.forEach((project) => {
      modeMap.set(project.transport_mode_category, (modeMap.get(project.transport_mode_category) ?? 0) + 1);
      sourceMap.set(project.funding_source, (sourceMap.get(project.funding_source) ?? 0) + 1);
    });
    return {
      modes: [...modeMap.entries()].sort((a, b) => b[1] - a[1]),
      sources: [...sourceMap.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [selectedCountry, selectedCountryProjects]);

  const titleText =
    mapView === 'heatmap'
      ? 'Heatmap surfaces clusters of mapped projects weighted by financing.'
      : 'Point view lets you hover and click individual mapped projects.';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 text-xl font-semibold">Map Explorer</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            A proper interactive map for exploring project distribution, density, and country profiles.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setMapView('points')}
            className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 ${mapView === 'points' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            <Orbit size={12} />
            Project points
          </button>
          <button
            onClick={() => setMapView('heatmap')}
            className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 ${mapView === 'heatmap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            <Flame size={12} />
            Heatmap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-slate-900 text-sm font-semibold">Geocoded Transport Project Footprint</p>
            <p className="text-slate-400 text-xs mt-0.5">{titleText}</p>
          </div>
          <StyledProjectMap projects={filteredProjects} viewMode={mapView} height={560} onProjectSelect={setSelectedProject} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <p className="text-slate-800 text-sm font-semibold">Country Rankings</p>
              <p className="text-slate-400 text-xs mt-0.5">Click to profile a recipient country</p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {countrySummaries.slice(0, 25).map((country, index) => {
                const isSelected = selectedCountry === country.country;
                const pct = (country.count / Math.max(countrySummaries[0]?.count || 1, 1)) * 100;
                return (
                  <button
                    key={country.country}
                    onClick={() => setSelectedCountry((prev) => (prev === country.country ? null : country.country))}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <span className="text-slate-400 text-xs w-5 text-right flex-shrink-0">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-700'}`}>
                        {country.country}
                      </p>
                      <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: isSelected ? '#2563EB' : '#94A3B8' }} />
                      </div>
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                      {country.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-800 text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe size={14} className="text-blue-500" />
              Country Profile
            </p>
            {!selectedCountry ? (
              <p className="text-slate-400 text-sm leading-relaxed">
                Select a country from the ranking list to see its financing, dominant modes, and MDB mix.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-900 text-base font-semibold">{selectedCountry}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><TrendingUp size={11} />{selectedCountryProjects.length} projects</span>
                    <span className="inline-flex items-center gap-1"><DollarSign size={11} />${(selectedCountryProjects.reduce((sum, p) => sum + ((p.amount ?? 0) / 1_000_000_000), 0)).toFixed(1)}B</span>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Mode mix</p>
                  <div className="space-y-2">
                    {selectedCountryStats?.modes.slice(0, 5).map(([mode, count]) => (
                      <div key={mode}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">{mode}</span>
                          <span className="text-slate-800 font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(count / Math.max(selectedCountryProjects.length, 1)) * 100}%`, backgroundColor: MODE_COLORS[mode] ?? '#94A3B8' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">MDB split</p>
                  <div className="space-y-2">
                    {selectedCountryStats?.sources.map(([source, count]) => (
                      <div key={source}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600 inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MDB_COLORS[source as keyof typeof MDB_COLORS] }} />
                            {source}
                          </span>
                          <span className="text-slate-800 font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(count / Math.max(selectedCountryProjects.length, 1)) * 100}%`, backgroundColor: MDB_COLORS[source as keyof typeof MDB_COLORS] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Featured projects</p>
                  <div className="space-y-2.5">
                    {selectedCountryProjects.slice(0, 4).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="w-full text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50"
                      >
                        <p className="text-slate-700 text-xs font-medium leading-snug">{project.project_name}</p>
                        <p className="text-slate-400 text-[11px] mt-1">
                          {project.approval_year ?? '—'} · {project.transport_mode_category}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProjectDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
