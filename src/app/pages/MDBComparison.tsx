import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import {
  MDB_COLORS,
  MODE_COLORS,
  Project,
} from '../data/mockData';
import { useMemo } from 'react';
import { useDashboardFilters } from '../context/DashboardFilterContext';

const MDB_KEYS = ['World Bank', 'ADB', 'AIIB'] as const;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-slate-400 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

export function MDBComparison() {
  const { filteredProjects } = useDashboardFilters();

  const bySource = useMemo(() => {
    const seed: Record<(typeof MDB_KEYS)[number], Project[]> = {
      'World Bank': [],
      ADB: [],
      AIIB: [],
    };
    filteredProjects.forEach((project) => {
      seed[project.funding_source].push(project);
    });
    return seed;
  }, [filteredProjects]);

  const yearTrend = useMemo(() => {
    const byYear = new Map<number, { year: number; 'World Bank': number; ADB: number; AIIB: number }>();
    filteredProjects.forEach((project) => {
      if (!project.approval_year || project.approval_year < 2000) return;
      if (!byYear.has(project.approval_year)) {
        byYear.set(project.approval_year, { year: project.approval_year, 'World Bank': 0, ADB: 0, AIIB: 0 });
      }
      byYear.get(project.approval_year)![project.funding_source] += 1;
    });
    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [filteredProjects]);

  const allModes = useMemo(
    () => [...new Set(filteredProjects.map((p) => p.transport_mode_category || 'Other / unspecified'))].sort(),
    [filteredProjects]
  );

  const modeRadar = useMemo(() => {
    return allModes.slice(0, 7).map((mode) => {
      const result: Record<string, string | number> = { mode };
      MDB_KEYS.forEach((mdb) => {
        const sourceProjects = bySource[mdb];
        const total = sourceProjects.length || 1;
        const count = sourceProjects.filter((p) => (p.transport_mode_category || 'Other / unspecified') === mode).length;
        result[mdb] = Math.round((count / total) * 100);
      });
      return result as { mode: string; 'World Bank': number; ADB: number; AIIB: number };
    });
  }, [allModes, bySource]);

  const financingData = MDB_KEYS.map((mdb) => ({
    name: mdb,
    value: bySource[mdb].reduce((sum, p) => sum + ((p.amount ?? 0) / 1_000_000_000), 0),
    color: MDB_COLORS[mdb],
  }));

  const mappedShareData = MDB_KEYS.map((mdb) => {
    const total = bySource[mdb].length || 1;
    const mapped = bySource[mdb].filter((p) => p.has_coordinates).length;
    return {
      name: mdb,
      mapped: Math.round((mapped / total) * 100),
      unmapped: 100 - Math.round((mapped / total) * 100),
    };
  });

  const topCountriesBySource = useMemo(() => {
    const makeTop = (projects: Project[]) => {
      const countryMap = new Map<string, { country: string; count: number }>();
      projects.forEach((project) => {
        const key = project.country || 'Unknown';
        if (!countryMap.has(key)) countryMap.set(key, { country: key, count: 0 });
        countryMap.get(key)!.count += 1;
      });
      return [...countryMap.values()].sort((a, b) => b.count - a.count).slice(0, 8);
    };
    return {
      'World Bank': makeTop(bySource['World Bank']),
      ADB: makeTop(bySource['ADB']),
      AIIB: makeTop(bySource['AIIB']),
    };
  }, [bySource]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 text-xl font-semibold">MDB Comparison</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Portfolio comparison across the Asian Development Bank, AIIB, and World Bank
        </p>
      </div>

      {/* MDB profile cards */}
      <div className="grid grid-cols-3 gap-4">
        {MDB_KEYS.map((mdb) => {
          const color = MDB_COLORS[mdb];
          const count = bySource[mdb].length;
          const financing = financingData.find((item) => item.name === mdb)?.value ?? 0;
          const mapped = bySource[mdb].filter((p) => p.has_coordinates).length;
          const mappedPct = count ? Math.round((mapped / count) * 100) : 0;
          const topCountry = topCountriesBySource[mdb][0];
          const topMode = (() => {
            const modeMap = new Map<string, number>();
              bySource[mdb].forEach((project) => {
              const key = project.transport_mode_category || 'Other / unspecified';
              modeMap.set(key, (modeMap.get(key) ?? 0) + 1);
            });
            return [...modeMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
          })();

          return (
            <div
              key={mdb}
              className="bg-white rounded-xl border shadow-sm overflow-hidden"
              style={{ borderColor: `${color}40` }}
            >
              <div className="px-5 py-4" style={{ backgroundColor: `${color}0D` }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h2 className="text-slate-900 text-sm font-bold">{mdb}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Projects" value={count.toLocaleString()} />
                  <StatCard label="Financing" value={`$${financing.toFixed(1)}B`} />
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Mapped coverage</span>
                  <span className="font-medium text-slate-700">{mappedPct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${mappedPct}%`, backgroundColor: color }}
                  />
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-500">Top country</span>
                  <span className="font-medium text-slate-700 max-w-[120px] text-right leading-snug break-words">
                    {(topCountry?.country ?? '—').replace("People's Republic of ", '')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Top mode</span>
                  <span
                    className="font-medium px-1.5 py-0.5 rounded text-[11px]"
                    style={{
                      backgroundColor: `${MODE_COLORS[topMode]}20`,
                      color: MODE_COLORS[topMode],
                    }}
                  >
                    {topMode}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Approval trend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-slate-800 text-sm font-semibold mb-1">Approval Trend by MDB</h2>
          <p className="text-slate-400 text-xs mb-4">Annual project approvals · 2000–2024</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={yearTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {MDB_KEYS.map((mdb) => (
                <Line
                  key={mdb}
                  type="monotone"
                  dataKey={mdb}
                  stroke={MDB_COLORS[mdb]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Financing comparison */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-slate-800 text-sm font-semibold mb-1">Total Financing Comparison</h2>
          <p className="text-slate-400 text-xs mb-4">Nominal USD billions · entire portfolio</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={financingData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}B`}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(v: number) => [`$${v.toFixed(1)}B`, 'Financing']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {financingData.map((d, i) => (
                  <Cell key={i} fill={d.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mode mix radar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-slate-800 text-sm font-semibold mb-1">Transport Mode Mix</h2>
          <p className="text-slate-400 text-xs mb-2">Portfolio share by mode (%) per MDB</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={modeRadar}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis
                dataKey="mode"
                tick={{ fontSize: 10, fill: '#64748B' }}
              />
              {MDB_KEYS.map((mdb) => (
                <Radar
                  key={mdb}
                  name={mdb}
                  dataKey={mdb}
                  stroke={MDB_COLORS[mdb]}
                  fill={MDB_COLORS[mdb]}
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                />
              ))}
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(v: number) => [`${v}%`, 'Share']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Mapped coverage */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-slate-800 text-sm font-semibold mb-1">Geocoding Coverage</h2>
          <p className="text-slate-400 text-xs mb-4">Share of projects with final coordinates</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mappedShareData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(v: number) => [`${v}%`]}
              />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="mapped" name="Mapped" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={60}>
                {mappedShareData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={MDB_COLORS[d.name as keyof typeof MDB_COLORS]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
              <Bar dataKey="unmapped" name="Unmapped" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={60} fill="#E2E8F0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top countries per MDB */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { mdb: 'World Bank', data: topCountriesBySource['World Bank'] },
          { mdb: 'ADB', data: topCountriesBySource['ADB'] },
          { mdb: 'AIIB', data: topCountriesBySource['AIIB'] },
        ].map(({ mdb, data }) => {
          const color = MDB_COLORS[mdb as keyof typeof MDB_COLORS];
          const maxCount = data[0]?.count ?? 1;
          return (
            <div key={mdb} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-slate-800 text-sm font-semibold mb-1">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
                {mdb} – Top Recipients
              </h2>
              <p className="text-slate-400 text-xs mb-4">By project count</p>
              <div className="space-y-2.5">
                {data.map((c, i) => (
                  <div key={c.country} className="flex items-center gap-2.5">
                    <span className="text-slate-400 text-xs w-4 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-600 max-w-[120px] leading-snug break-words">
                          {c.country.replace("People's Republic of ", '')}
                        </span>
                        <span className="text-slate-800 font-medium">{c.count}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.count / maxCount) * 100}%`,
                            backgroundColor: color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
