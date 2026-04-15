import { Link, NavLink, Outlet } from 'react-router';
import {
  Globe,
  BarChart3,
  Map,
  Table2,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { PORTFOLIO_STATS, fmt } from '../data/mockData';
import { DashboardFilterProvider } from '../context/DashboardFilterContext';
import { GlobalFilters } from './GlobalFilters';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: TrendingUp, exact: true },
  { to: '/geography', label: 'Geography', icon: Map, exact: false },
  { to: '/mdb-comparison', label: 'MDB Comparison', icon: BarChart3, exact: false },
  { to: '/projects', label: 'Project Explorer', icon: Table2, exact: false },
];

export function Layout() {
  return (
    <DashboardFilterProvider>
      <div className="flex h-screen bg-[#F0F4F8] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-[#0D1B2A] flex flex-col">
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Transport Intel</p>
              <p className="text-slate-400 text-[11px] leading-tight">ADB · AIIB · World Bank</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                  isActive
                    ? 'bg-blue-600/20 text-white border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}
                  />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={12} className="ml-auto text-blue-400/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer meta */}
        <div className="px-5 py-4 border-t border-white/10">
          <Link
            to="/crs"
            className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-500/15 mb-3"
          >
            <span>Open CRS flows dashboard</span>
            <ChevronRight size={12} className="text-emerald-300/80" />
          </Link>
          <p className="text-slate-500 text-[11px]">
            {fmt.num(PORTFOLIO_STATS.totalProjects)} projects · {fmt.num(PORTFOLIO_STATS.countriesCount)} economies
          </p>
          <p className="text-slate-600 text-[10px] mt-0.5">Data: ADB · AIIB · World Bank</p>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <GlobalFilters />
          <Outlet />
        </main>
      </div>
    </DashboardFilterProvider>
  );
}
