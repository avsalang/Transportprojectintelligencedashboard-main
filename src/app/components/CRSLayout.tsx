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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40 p-1">
                <img src={`${import.meta.env.BASE_URL}ATO_logo.jpg`} alt="ATO Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <p className="text-white text-base font-semibold leading-tight tracking-tight">CRS Dashboard</p>
                <p className="text-blue-300 text-[10px] font-semibold tracking-wider leading-snug mt-1 max-w-[140px]">
                   Visualization and Analysis by the Asian Transport Observatory (ATO)
                </p>
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
                   `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] transition-all group ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                      : 'text-blue-100/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={isActive ? 'text-[#00ADEF]' : 'text-blue-300/40 group-hover:text-blue-200'} />
                    <span className="font-medium">{label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-blue-400/60" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-slate-400 text-[13px]">
              {crsFmt.num(CRS_OVERVIEW_STATS.recipientCount)} economies · {crsFmt.num(CRS_OVERVIEW_STATS.donorCount)} donors
            </p>
            <p className="text-slate-500 text-[12px] mt-0.5">
              ${crsFmt.usdM(CRS_OVERVIEW_STATS.totalCommitment)} commitments
            </p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[11px] font-semibold text-blue-300/40 uppercase tracking-widest mb-1.5">Data Source</p>
              <a 
                href="https://data-explorer.oecd.org/vis?lc=en&tm=crs&pg=0&snb=25&df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_CRS%40DF_CRS&df[ag]=OECD.DCD.FSD&df[vs]=1.6&dq=DAC..1000.100._T._T.D.Q._T..&lom=LASTNPERIODS&lo=5&to[TIME_PERIOD]=false"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-blue-200/60 hover:text-[#00ADEF] transition-colors font-medium flex items-center gap-1.5 underline decoration-blue-500/30 underline-offset-4"
              >
                OECD Credit Reporting System (CRS)
              </a>
            </div>
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
