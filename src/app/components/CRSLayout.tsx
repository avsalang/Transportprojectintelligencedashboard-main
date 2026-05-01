import { NavLink, Outlet } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { CRSFilterProvider } from '../context/CRSFilterContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', exact: true },
  { to: '/donor-profile', label: 'Donor Profile', exact: false },
  { to: '/recipient-profile', label: 'Recipient Profile', exact: false },
  { to: '/un-decade', label: 'UN Decade', exact: false },
  { to: '/about', label: 'About', exact: false },
];

const SUPPORT_LOGOS = [
  {
    src: 'adb-logo.svg',
    alt: 'Asian Development Bank',
    href: 'https://www.adb.org/',
    className: 'h-16 w-[315px]',
  },
  {
    src: 'fcdo-logo.svg',
    alt: 'Foreign, Commonwealth and Development Office',
    href: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office',
    className: 'h-16 w-[300px]',
  },
  {
    src: 'ccg-logo.png',
    alt: 'Climate Compatible Growth',
    href: 'https://climatecompatiblegrowth.com/',
    className: 'h-20 w-20',
  },
];

function SupportFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-10">
      <div className="mx-auto max-w-[1120px]">
        <p className="mb-8 text-center text-2xl font-bold text-[#002B6C]">Developed with the support of</p>
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
          {SUPPORT_LOGOS.map((logo) => (
            <a
              key={logo.src}
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${logo.alt}`}
              className="flex items-center justify-center rounded-lg p-2 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-4"
            >
              <img
                src={`${import.meta.env.BASE_URL}${logo.src}`}
                alt={logo.alt}
                className={`${logo.className} object-contain`}
              />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

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

          <div className="border-t border-white/10 px-5 py-4" aria-hidden="true" />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-5">
                <div className="flex h-16 w-48 flex-shrink-0 items-center justify-center">
                  <img
                    src={`${import.meta.env.BASE_URL}ato-observatory-logo.svg`}
                    alt="Asia and the Pacific Transport Observatory Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight text-slate-900 xl:text-xl">Asia and the Pacific Transport Development Finance Explorer</p>
                  <p className="mt-0.5 max-w-[780px] text-[12px] text-slate-500 xl:text-[13px]">
                    An ATO visualization and analysis of OECD CRS transport-related funding to Asia and the Pacific
                  </p>
                </div>
              </div>
              <div className="hidden min-h-10 min-w-[120px] lg:block" aria-label="Title bar action area" />
            </div>
          </div>
          <div className="flex min-h-[calc(100vh-81px)] flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <SupportFooter />
          </div>
        </main>
      </div>
    </CRSFilterProvider>
  );
}
