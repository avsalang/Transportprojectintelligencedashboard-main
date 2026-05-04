import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Globe, DollarSign, MapPin, Layers, Flame, Orbit } from 'lucide-react';
import { WrappedCategoryTick } from '../components/ChartTicks';
import { KPICard } from '../components/KPICard';
import { MDB_COLORS, MODE_COLORS, Project, fmt } from '../data/mockData';
import { useDashboardFilters } from '../context/DashboardFilterContext';
import { StyledProjectMap } from '../components/StyledProjectMap';
import { ProjectDrawer } from '../components/ProjectDrawer';

type MapView = 'points' | 'heatmap';

export function Overview() {
  const { filteredProjects } = useDashboardFilters();
  const [mapView, setMapView] = useState<MapView>('points');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const stats = useMemo(() => {
    const bySource = { 'World Bank': 0, ADB: 0, AIIB: 0 } as Record<'World Bank' | 'ADB' | 'AIIB', number>;
    const bySourceFinancing = { 'World Bank': 0, ADB: 0, AIIB: 0 } as Record<'World Bank' | 'ADB' | 'AIIB', number>;
    const countries = new Set<string>();
    let mappedProjects = 0;
    filteredProjects.forEach((project) => {
      bySource[project.funding_source] += 1;
      bySourceFinancing[project.funding_source] += (project.amount ?? 0) / 1_000_000_000;
      if (project.country) countries.add(project.country);
      if (project.has_coordinates) mappedProjects += 1;
    });
    return {
      totalProjects: filteredProjects.length,
      countriesCount: countries.size,
      mappedProjects,
      totalFinancing: filteredProjects.reduce((sum, p) => sum + ((p.amount ?? 0) / 1_000_000_000), 0),
      bySource,
      bySourceFinancing,
    };
  }, [filteredProjects]);

  const yearData = useMemo(() => {
    const byYear = new Map<number, { year: string; total: number }>();
    filteredProjects.forEach((project) => {
      if (!project.approval_year) return;
      if (!byYear.has(project.approval_year)) {
        byYear.set(project.approval_year, { year: String(project.approval_year), total: 0 });
      }
      byYear.get(project.approval_year)!.total += 1;
    });
    return [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year));
  }, [filteredProjects]);

  const modeData = useMemo(() => {
    const modeMap = new Map<string, { mode: string; count: number; financing: number }>();
    filteredProjects.forEach((project) => {
      const key = project.transport_mode_category || 'Other / unspecified';
      if (!modeMap.has(key)) {
        modeMap.set(key, { mode: key, count: 0, financing: 0 });
      }
      const entry = modeMap.get(key)!;
      entry.count += 1;
      entry.financing += (project.amount ?? 0) / 1_000_000_000;
    });
    return [...modeMap.values()].sort((a, b) => b.count - a.count);
  }, [filteredProjects]);

  const countryData = useMemo(() => {
    const countryMap = new Map<string, { country: string; count: number }>();
    filteredProjects.forEach((project) => {
      const key = project.country || 'Unknown';
      if (!countryMap.has(key)) {
        countryMap.set(key, { country: key, count: 0 });
      }
      countryMap.get(key)!.count += 1;
    });
    return [...countryMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredProjects]);

  const mapSubtitle =
    mapView === 'points'
      ? `${fmt.num(stats.mappedProjects)} mapped projects in the current portfolio view`
      : 'Heat intensity reflects geocoded project concentration weighted by financing';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 text-xl font-semibold">Portfolio Overview</h1>
          <p className="text-slate-500 text-base mt-0.5">
            A cleaner portfolio profile centered on projects, locations, financing, and timing.
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-[15px]">Current mode taxonomy</p>
          <p className="text-slate-700 text-base">Refined presentation categories</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Total Projects" value={fmt.num(stats.totalProjects)} sub={`across ${fmt.num(stats.countriesCount)} economies`} icon={<Layers size={15} />} accent="blue" />
        <KPICard label="Total Financing" value={`$${stats.totalFinancing.toFixed(1)}B`} sub="nominal amount" icon={<DollarSign size={15} />} accent="green" />
        <KPICard label="Economies Covered" value={fmt.num(stats.countriesCount)} sub="current filtered view" icon={<Globe size={15} />} accent="purple" />
        <KPICard label="Mapped Projects" value={fmt.num(stats.mappedProjects)} sub={stats.totalProjects ? `${((stats.mappedProjects / stats.totalProjects) * 100).toFixed(1)}% geocoded` : '0% geocoded'} icon={<MapPin size={15} />} accent="orange" />
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-900 text-lg font-semibold">Global Project Map</p>
              <p className="text-slate-500 text-[15px] mt-0.5">{mapSubtitle}</p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setMapView('points')}
                className={`px-3 py-1.5 text-[15px] font-medium rounded-lg flex items-center gap-1.5 ${mapView === 'points' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                <Orbit size={12} />
                Points
              </button>
              <button
                onClick={() => setMapView('heatmap')}
                className={`px-3 py-1.5 text-[15px] font-medium rounded-lg flex items-center gap-1.5 ${mapView === 'heatmap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                <Flame size={12} />
                Heatmap
              </button>
            </div>
          </div>
          <StyledProjectMap projects={filteredProjects} viewMode={mapView} height={460} onProjectSelect={setSelectedProject} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-900 text-lg font-semibold mb-3">Financing by MDB</p>
            <div className="space-y-3">
              {Object.entries(stats.bySourceFinancing).map(([source, value]) => {
                const pct = stats.totalFinancing ? (value / stats.totalFinancing) * 100 : 0;
                return (
                  <div key={source}>
                    <div className="flex justify-between text-[15px] mb-1">
                      <span className="text-slate-600">{source}</span>
                      <span className="text-slate-800 font-semibold">${value.toFixed(1)}B</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: MDB_COLORS[source as keyof typeof MDB_COLORS] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-slate-900 text-lg font-semibold mb-3">Mode Mix</p>
            <div className="space-y-2.5">
              {modeData.slice(0, 7).map((mode) => (
                <div key={mode.mode}>
                  <div className="flex justify-between text-[15px] mb-1">
                    <span className="text-slate-600">{mode.mode}</span>
                    <span className="text-slate-800 font-medium">{mode.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(mode.count / Math.max(modeData[0]?.count || 1, 1)) * 100}%`, backgroundColor: MODE_COLORS[mode.mode] ?? '#94A3B8' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-900 text-lg font-semibold mb-1">Approvals Over Time</p>
          <p className="text-slate-500 text-[15px] mb-4">Project approvals in the current portfolio view</p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={yearData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="approvalArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="year" tick={{ fontSize: 15, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 15, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 15, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Area type="monotone" dataKey="total" stroke="#2563EB" fill="url(#approvalArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-900 text-lg font-semibold mb-1">Top Recipient Economies</p>
          <p className="text-slate-500 text-[15px] mb-4">Current portfolio view by project count</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 15, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="country" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={170} interval={0} />
              <Tooltip contentStyle={{ fontSize: 15, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(v: number) => [v.toLocaleString(), 'Projects']} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={14}>
                {countryData.map((entry, i) => (
                  <Cell key={i} fill="#1D4ED8" fillOpacity={0.78} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ProjectDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
