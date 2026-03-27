import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Building2,
  UsersRound,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/new-delivery', label: 'New Delivery', icon: Truck },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/owners', label: 'Truck Owners', icon: UsersRound },
  { to: '/deliveries', label: 'All Records', icon: ClipboardList },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const pageTitle = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname)
    if (match) return match.label
    if (location.pathname.startsWith('/companies')) return 'Company Details'
    if (location.pathname.startsWith('/owners')) return 'Owner Details'
    return 'Purvi Roadlines'
  }, [location.pathname])

  const today = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 rounded-xl bg-white/80 p-2 text-slate-900 shadow-lg backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative h-full w-72 glass p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white">
                  Logo
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Purvi Roadlines</p>
                  <p className="text-xs text-slate-200">Transport Ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-full p-2 text-white/80 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                )}
              )}
            </nav>
          </aside>
        </div>
      )}

      <aside className="fixed hidden h-full w-72 flex-col gap-8 glass p-6 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white">
            Logo
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Purvi Roadlines</p>
            <p className="text-xs text-slate-200">Transport Ledger</p>
          </div>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )}
          )}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/10 p-4 text-xs text-slate-200">
          Track company ↔ owner hisaab, advances, balances, and trips with clarity.
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4 pt-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Purvi Roadlines</p>
            <h1 className="text-2xl font-semibold text-white text-shadow">{pageTitle}</h1>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm text-slate-200">{today}</div>
        </header>
        <main className="px-6 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
