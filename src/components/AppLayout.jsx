import { Menu, PawPrint } from 'lucide-react'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'

function NavButton({ label, isActive, onClick }) {
  return (
    <Button variant={isActive ? 'default' : 'ghost'} className="justify-start" onClick={onClick}>
      {label}
    </Button>
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(244,176,93,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(83,156,142,0.16),transparent_24%),linear-gradient(180deg,#faf4e8_0%,#f7f2e8_38%,#f6f3ed_100%)]">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),transparent_68%)]" />
      <header className="sticky top-0 z-40 border-b border-white/60 bg-background/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] bg-primary text-primary-foreground shadow-float">
              <PawPrint className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-base font-semibold tracking-tight text-primary">StreetDog App</p>
              <p className="text-xs uppercase tracking-[0.18em] text-accent">
                Community care, one area at a time
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name || user.email} | {profile?.role?.replaceAll('_', ' ') || 'end user'}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/65 p-2 shadow-soft lg:flex">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={currentPath === item.path ? 'default' : 'ghost'}
                onClick={() => onNavigate(item.path)}
              >
                {item.label}
              </Button>
            ))}
            <Button variant="outline" onClick={() => onNavigate('/profile')}>
              Profile
            </Button>
            <Button onClick={onSignOut}>Sign Out</Button>
          </div>

          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Open navigation"
                  className="bg-white/75 shadow-soft"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="space-y-6">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">StreetDog App</p>
                  <p className="text-sm text-muted-foreground">{profile?.full_name || user.email}</p>
                </div>
                <div className="grid gap-2">
                  {navItems.map((item) => (
                    <NavButton
                      key={item.path}
                      label={item.label}
                      isActive={currentPath === item.path}
                      onClick={() => onNavigate(item.path)}
                    />
                  ))}
                  <NavButton
                    label="Profile"
                    isActive={currentPath === '/profile'}
                    onClick={() => onNavigate('/profile')}
                  />
                  <Button className="mt-3" onClick={onSignOut}>
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/60 bg-white/36 p-3 shadow-[0_12px_40px_rgba(77,61,40,0.05)] backdrop-blur-[2px] sm:p-4">
          <div className="flex w-full flex-col gap-6 rounded-[1.65rem]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
