import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PawPrint,
  PlusCircle,
  User,
  Users,
} from 'lucide-react'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'

const NAV_ICON_MAP = {
  '/dashboard': LayoutDashboard,
  '/dogs': PawPrint,
  '/dogs/new': PlusCircle,
  '/inventory': Package,
  '/inventory/admin': ClipboardCheck,
  '/admin/users': Users,
  '/profile': User,
}

function NavButton({ label, icon: Icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-soft'
          : 'text-foreground/70 hover:bg-white/70 hover:text-foreground',
      ].join(' ')}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {label}
    </button>
  )
}

function MobileNavButton({ label, icon: Icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/80 hover:bg-secondary/60 hover:text-foreground',
      ].join(' ')}
    >
      {Icon ? (
        <div
          className={[
            'flex h-8 w-8 items-center justify-center rounded-xl',
            isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-foreground/60',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      {label}
    </button>
  )
}

export function AppLayout({ user, profile, currentPath, onNavigate, onSignOut, children }) {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', visible: true },
    { label: 'Dogs', path: '/dogs', visible: true },
    { label: 'Add Dog', path: '/dogs/new', visible: true },
    { label: 'Inventory', path: '/inventory', visible: true },
    {
      label: 'Inventory Admin',
      path: '/inventory/admin',
      visible: profile?.role === 'inventory_admin' || profile?.role === 'superadmin',
    },
    {
      label: 'Manage Users',
      path: '/admin/users',
      visible: profile?.role === 'superadmin',
    },
  ].filter((item) => item.visible)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(244,176,93,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(83,156,142,0.12),transparent_26%),linear-gradient(180deg,#faf5ea_0%,#f7f2e6_40%,#f5f2ec_100%)]">
      {/* subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,rgba(255,252,240,0.75),transparent_65%)]" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/55 bg-[rgba(250,245,234,0.82)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand */}
          <button
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
            onClick={() => onNavigate('/dashboard')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-soft">
              <PawPrint className="h-4.5 w-4.5" strokeWidth={2.2} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[0.9rem] font-bold tracking-tight text-primary leading-tight">
                StreetDog App
              </p>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent leading-tight">
                Community Care
              </p>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2 py-1.5 shadow-soft lg:flex">
            {navItems.map((item) => (
              <NavButton
                key={item.path}
                label={item.label}
                icon={NAV_ICON_MAP[item.path]}
                isActive={currentPath === item.path}
                onClick={() => onNavigate(item.path)}
              />
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={() => onNavigate('/profile')}
              className={[
                'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200',
                currentPath === '/profile'
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/70 hover:bg-white/70 hover:text-foreground',
              ].join(' ')}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground/80 text-xs font-bold uppercase">
                {(profile?.full_name || user.email || '?')[0]}
              </div>
              <span className="max-w-[120px] truncate">
                {profile?.full_name?.split(' ')[0] || 'Profile'}
              </span>
            </button>
            <Button size="sm" variant="outline" onClick={onSignOut} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Open navigation"
                  className="bg-white/70 shadow-soft"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-72 border-l border-white/60 bg-[rgba(250,246,238,0.97)] backdrop-blur-2xl p-0"
              >
                {/* Mobile sheet header */}
                <div className="border-b border-border/40 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm uppercase">
                      {(profile?.full_name || user.email || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {profile?.full_name || 'Volunteer'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile?.role?.replaceAll('_', ' ') || 'end user'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile nav items */}
                <div className="space-y-1 p-3">
                  {navItems.map((item) => (
                    <MobileNavButton
                      key={item.path}
                      label={item.label}
                      icon={NAV_ICON_MAP[item.path]}
                      isActive={currentPath === item.path}
                      onClick={() => onNavigate(item.path)}
                    />
                  ))}
                  <MobileNavButton
                    label="Profile"
                    icon={NAV_ICON_MAP['/profile']}
                    isActive={currentPath === '/profile'}
                    onClick={() => onNavigate('/profile')}
                  />
                </div>

                {/* Mobile sign out */}
                <div className="border-t border-border/40 p-3">
                  <button
                    onClick={onSignOut}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500">
                      <LogOut className="h-4 w-4" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-0 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
