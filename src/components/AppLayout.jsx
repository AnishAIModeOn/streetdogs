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
        'flex min-h-11 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-soft'
          : 'text-foreground/72 hover:bg-white/85 hover:text-foreground hover:shadow-soft',
      ].join(' ')}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={2.1} /> : null}
      {label}
    </button>
  )
}

function MobileNavButton({ label, icon: Icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex min-h-14 w-full items-center gap-3 rounded-[1.4rem] px-4 py-3.5 text-sm font-semibold transition-all duration-200',
        isActive
          ? 'bg-primary/12 text-primary shadow-soft'
          : 'text-foreground/80 hover:bg-white/85 hover:text-foreground',
      ].join(' ')}
    >
      {Icon ? (
        <div
          className={[
            'flex h-9 w-9 items-center justify-center rounded-[1rem]',
            isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-secondary/18 text-foreground/60',
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
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(244,176,93,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(83,156,142,0.1),transparent_24%),linear-gradient(180deg,#fbf7ef_0%,#f7f1e6_36%,#f4efe7_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,rgba(255,252,240,0.82),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-32 -z-10 h-64 bg-[radial-gradient(circle,rgba(244,176,93,0.08),transparent_58%)]" />

      <header className="sticky top-0 z-40 border-b border-white/60 bg-[linear-gradient(180deg,rgba(251,247,238,0.94),rgba(248,242,232,0.84))] shadow-[0_10px_30px_rgba(117,100,71,0.06)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <button
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
            onClick={() => onNavigate('/dashboard')}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,hsl(28_88%_59%),hsl(24_89%_64%))] text-primary-foreground shadow-soft transition-transform duration-300 group-hover:-translate-y-0.5">
              <PawPrint className="h-4.5 w-4.5" strokeWidth={2.2} />
            </div>
            <div className="hidden sm:block sm:min-w-0">
              <p className="text-[0.98rem] font-extrabold tracking-tight text-foreground leading-tight">
                StreetDog App
              </p>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-primary/90 leading-tight">
                Community Care
              </p>
            </div>
          </button>

          <nav className="hidden items-center gap-1.5 rounded-full border border-white/70 bg-white/72 px-2.5 py-2 shadow-soft lg:flex">
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

          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={() => onNavigate('/profile')}
              className={[
                'flex min-h-11 items-center gap-2 rounded-full border border-white/65 bg-white/60 px-3 py-2 text-sm font-semibold transition-all duration-200',
                currentPath === '/profile'
                  ? 'border-primary/20 bg-primary/10 text-primary shadow-soft'
                  : 'text-foreground/70 hover:bg-white/85 hover:text-foreground hover:shadow-soft',
              ].join(' ')}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/18 text-secondary text-xs font-bold uppercase">
                {(profile?.full_name || user.email || '?')[0]}
              </div>
              <span className="max-w-[120px] truncate">
                {profile?.full_name?.split(' ')[0] || 'Profile'}
              </span>
            </button>
            <Button size="sm" variant="outline" onClick={onSignOut} className="gap-1.5 border-white/70 bg-white/72">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>

          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Open navigation"
                  className="border-white/70 bg-white/78 shadow-soft"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-72 border-l border-white/60 bg-[linear-gradient(180deg,rgba(251,247,239,0.98),rgba(244,239,229,0.97))] p-0 backdrop-blur-2xl"
              >
                <div className="border-b border-white/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary text-primary-foreground font-bold text-sm uppercase shadow-soft">
                      {(profile?.full_name || user.email || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {profile?.full_name || 'Volunteer'}
                      </p>
                      <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary/85">
                        {profile?.role?.replaceAll('_', ' ') || 'end user'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3">
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

                <div className="border-t border-white/60 p-3">
                  <button
                    onClick={onSignOut}
                    className="flex min-h-14 w-full items-center gap-3 rounded-[1.4rem] border border-white/60 bg-white/72 px-4 py-3.5 text-sm font-semibold text-foreground/80 transition-all duration-200 hover:bg-white/92 hover:text-foreground hover:shadow-soft"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[1rem] bg-primary/12 text-primary">
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

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}
