import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { CRSFilterProvider } from '../context/CRSFilterContext';

const NAV_ITEMS = [
  { to: '/', label: 'Regional Overview', exact: true },
  { to: '/donor-profile', label: 'Donor Profile', exact: false },
  { to: '/recipient-profile', label: 'Recipient Profile', exact: false },
  { to: '/un-decade', label: 'UN Decade', exact: false },
  { to: '/themes', label: 'Themes', exact: false },
  { to: '/about', label: 'About', exact: false },
];

const SUPPORT_LOGOS = [
  {
    src: 'adb-logo.svg',
    alt: 'Asian Development Bank',
    href: 'https://www.adb.org/',
    className: 'h-12 w-[240px] sm:h-16 sm:w-[315px]',
  },
  {
    src: 'fcdo-logo.svg',
    alt: 'Foreign, Commonwealth and Development Office',
    href: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office',
    className: 'h-12 w-[240px] sm:h-16 sm:w-[300px]',
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
    <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1120px]">
        <p className="mb-8 text-center text-xl font-bold text-[#002B6C] sm:text-2xl">Developed with the support of</p>
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

function PageFallback() {
  return (
    <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
      <div>
        <p className="text-base font-semibold text-slate-900">Loading view...</p>
        <p className="mt-2 text-sm text-slate-500">Preparing the selected dashboard section.</p>
      </div>
    </div>
  );
}

export function CRSLayout() {
  return (
    <CRSFilterProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[#F0F4F8] lg:flex-row">
        <aside className="flex w-full flex-shrink-0 flex-col border-b border-white/5 bg-[#002147] lg:w-60 lg:border-b-0 lg:border-r">
          <div className="px-4 py-3 border-b border-white/10 lg:px-5 lg:py-5">
            <p className="text-[12px] font-semibold text-blue-200/70">Navigation</p>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:gap-0 lg:space-y-0.5 lg:overflow-y-auto lg:py-4">
            {NAV_ITEMS.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                   `flex shrink-0 items-center gap-3 whitespace-nowrap px-3 py-2.5 rounded-lg text-[15px] transition-all group ${
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

          <div className="hidden border-t border-white/10 px-5 py-4 lg:block" aria-hidden="true" />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md sm:px-6">
            <div className="flex items-center justify-between gap-5">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                <div className="flex h-12 w-40 flex-shrink-0 items-center justify-center sm:h-16 sm:w-48">
                  <img
                    src={`${import.meta.env.BASE_URL}ato-observatory-logo.svg`}
                    alt="Asia and the Pacific Transport Observatory Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg xl:text-xl">Asia and the Pacific Transport Development Finance Explorer</p>
                  <p className="mt-0.5 text-[13px] italic text-slate-500">
                    Tracking finance for low-carbon, resilient, safe, and inclusive transport
                  </p>
                </div>
              </div>
              <div className="hidden min-h-10 min-w-[120px] lg:block" aria-label="Title bar action area" />
            </div>
          </div>
          <div className="flex min-h-[calc(100vh-81px)] flex-col">
            <div className="flex-1">
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </div>
            <SupportFooter />
          </div>
        </main>
      </div>
    </CRSFilterProvider>
  );
}
