import { NavLink, Outlet } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { CRSFilterProvider } from '../context/CRSFilterContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', exact: true },
  { to: '/donor-profile', label: 'Donor Profile', exact: false },
  { to: '/recipient-profile', label: 'Recipient Profile', exact: false },
  { to: '/un-decade', label: 'UN Decade', exact: false },
];

export function CRSLayout() {
  return (
    <CRSFilterProvider>
      <div className="flex h-screen bg-[#F0F4F8] overflow-hidden">
        <aside className="w-60 flex-shrink-0 bg-[#002147] flex flex-col border-r border-white/5">
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300/60">Navigation</p>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ to, label, exact }) => (
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
                    <span className="font-medium">{label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-blue-400/60" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="px-5 py-4 border-t border-white/10">
            <div>
              <p className="text-[11px] text-blue-300/40 mb-1.5">Data source</p>
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
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
                  <img src={`${import.meta.env.BASE_URL}ATO_logo.jpg`} alt="ATO Logo" className="h-full w-full rounded-full object-contain" />
                </div>
                <div>
                  <p className="text-xl font-semibold tracking-tight text-slate-900">OECD CRS Transport Funding</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    An ATO visualization and analysis of OECD CRS transport-related funding
                  </p>
                </div>
              </div>
              <div className="min-h-10 min-w-[220px]" aria-label="Title bar action area" />
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </CRSFilterProvider>
  );
}
