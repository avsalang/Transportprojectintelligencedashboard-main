import { NavLink, Outlet } from 'react-router';
import { ChevronRight, Globe, Map, Network, PieChart, TrendingUp } from 'lucide-react';
import { CRS_OVERVIEW_STATS, crsFmt } from '../data/crsData';
import { CRSFilterProvider } from '../context/CRSFilterContext';
import { CRSGlobalFilters } from './CRSGlobalFilters';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: TrendingUp, exact: true },
  { to: '/insights', label: 'Strategic Insights', icon: Network, exact: false },
  { to: '/profiles', label: 'Deep Dive', icon: PieChart, exact: false },
];

export function CRSLayout() {
  return (
    <CRSFilterProvider>
      <div className="flex h-screen bg-[#F0F4F8] overflow-hidden">
        <aside className="w-60 flex-shrink-0 bg-[#002147] flex flex-col border-r border-white/5">
          <div className="px-5 pt-6 pb-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00ADEF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <Globe size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight tracking-tight">CRS Dashboard</p>
                <p className="text-blue-300 text-[9px] font-black uppercase tracking-widest leading-tight">Institutional Portal</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                   `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                      : 'text-blue-100/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={isActive ? 'text-[#00ADEF]' : 'text-blue-300/40 group-hover:text-blue-200'} />
                    <span className="font-semibold">{label}</span>
                    {isActive && <ChevronRight size={12} className="ml-auto text-blue-400/60" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-slate-500 text-[11px]">
              {crsFmt.num(CRS_OVERVIEW_STATS.recipientCount)} countries · {crsFmt.num(CRS_OVERVIEW_STATS.donorCount)} donors
            </p>
            <p className="text-slate-600 text-[10px] mt-0.5">
              ${crsFmt.usdM(CRS_OVERVIEW_STATS.totalCommitment)} commitments
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <CRSGlobalFilters />
          <Outlet />
        </main>
      </div>
    </CRSFilterProvider>
  );
}
