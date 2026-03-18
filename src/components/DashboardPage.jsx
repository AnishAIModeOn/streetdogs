import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  HeartHandshake,
  Package,
  PawPrint,
  Plus,
  ShieldPlus,
  Stethoscope,
  Syringe,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useDogs } from '../hooks/use-dogs'
import { useExpenses } from '../hooks/use-expenses'
import { listActiveAreas, listDogSightings } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { DogCard } from './DogCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl border border-border/50 bg-white/60"
          />
        ))}
      </div>
      <div className="h-[360px] animate-pulse rounded-3xl border border-border/50 bg-white/60" />
    </div>
  )
}

export function DashboardPage({ profile }) {
  const {
    data: dogs = [],
    isLoading: isDogsLoading,
    error: dogsError,
  } = useDogs()
  const {
    data: expenses = [],
    isLoading: isExpensesLoading,
    error: expensesError,
  } = useExpenses()
  const {
    data: areas = [],
    isLoading: isAreasLoading,
    error: areasError,
  } = useQuery({
    queryKey: ['areas', 'active'],
    queryFn: listActiveAreas,
  })
  const {
    data: sightings = [],
    isLoading: isSightingsLoading,
    error: sightingsError,
  } = useQuery({
    queryKey: ['dog-sightings'],
    queryFn: listDogSightings,
  })

  const areaMap = useMemo(
    () =>
      areas.reduce((grouped, area) => {
        grouped[area.id] = area
        return grouped
      }, {}),
    [areas],
  )

  const isLoading = isDogsLoading || isExpensesLoading || isAreasLoading || isSightingsLoading
  const errorMessage =
    (dogsError instanceof Error && dogsError.message) ||
    (expensesError instanceof Error && expensesError.message) ||
    (areasError instanceof Error && areasError.message) ||
    (sightingsError instanceof Error && sightingsError.message) ||
    ''

  const vaccinatedDogs = dogs.filter((dog) => dog.vaccination_status === 'vaccinated').length
  const medicalDogs = dogs.filter((dog) =>
    (dog.health_notes || '').toLowerCase().includes('medical'),
  ).length
  const foodDogs = dogs.filter((dog) => (dog.health_notes || '').toLowerCase().includes('food')).length
  const sterilizedDogs = dogs.filter((dog) => dog.sterilization_status === 'sterilized').length
  const recentDogs = dogs.slice(0, 4)
  const recentSightings = sightings.slice(0, 4)
  const expenseTotal = expenses.reduce(
    (sum, expense) => sum + Number(expense.total_amount || expense.amount || 0),
    0,
  )
  const areasCovered = new Set(dogs.map((dog) => dog.area_id).filter(Boolean)).size
  const pendingContributions = expenses.reduce(
    (sum, expense) =>
      sum +
      (expense.contributions ?? []).filter(
        (contribution) => contribution.payment_status === 'pending',
      ).length,
    0,
  )
  const canManageInventory =
    profile?.role === 'inventory_admin' || profile?.role === 'superadmin'

  const quickActions = [
    {
      label: 'Guest report flow',
      description: 'Share a dog sighting without signing in',
      icon: PawPrint,
      path: '/report-dog',
    },
    {
      label: 'Community inventory',
      description: 'See supply needs and commit to help',
      icon: Package,
      path: '/inventory',
    },
    ...(canManageInventory
      ? [
          {
            label: 'New inventory request',
            description: 'Create a supply need for your area',
            icon: ClipboardCheck,
            path: '/inventory/new',
          },
        ]
      : []),
    ...(profile?.role === 'superadmin'
      ? [
          {
            label: 'Manage user roles',
            description: 'Review and update community access',
            icon: ShieldPlus,
            path: '/admin/users',
          },
        ]
      : []),
  ]

  return (
    <section className="space-y-5">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/65 bg-[linear-gradient(140deg,rgba(255,255,255,0.94),rgba(249,244,232,0.97)_45%,rgba(235,246,240,0.96))] p-6 shadow-float sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(243,174,87,0.15),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(78,128,109,0.13),transparent_44%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* Left: welcome copy */}
          <div className="space-y-5">
            <Badge variant="secondary" className="w-fit text-xs">
              Volunteer dashboard
            </Badge>
            <div className="space-y-2">
              <h1 className="max-w-xl text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
              </h1>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
                One calm workspace for dog records, support requests, supplies, and field follow-up.
              </p>
            </div>

            {/* Metrics row */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Dogs tracked', value: dogs.length, sub: 'Visible to your account' },
                { label: 'Areas covered', value: areasCovered, sub: 'Active neighborhoods' },
                { label: 'Support raised', value: formatCurrency(expenseTotal), sub: 'Expenses so far' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.5rem] border border-white/65 bg-white/75 p-4 shadow-soft"
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="shadow-soft" onClick={() => navigateTo('/dogs/new')}>
                <Plus className="h-4 w-4" />
                Add Dog
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigateTo('/dogs')}>
                <PawPrint className="h-4 w-4" />
                Browse Dogs
              </Button>
              {canManageInventory ? (
                <Button size="lg" variant="outline" onClick={() => navigateTo('/inventory/admin')}>
                  <ShieldPlus className="h-4 w-4" />
                  Inventory Admin
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={() => navigateTo('/inventory')}>
                  <HeartHandshake className="h-4 w-4" />
                  View Inventory
                </Button>
              )}
            </div>
          </div>

          {/* Right: today's snapshot + quick actions */}
          <div className="grid gap-4 content-start">
            {/* Snapshot */}
            <div className="rounded-[1.65rem] border border-white/65 bg-white/85 p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Today&apos;s snapshot
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-secondary/45 p-3">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="mt-1 text-xl font-extrabold text-foreground">{pendingContributions}</p>
                </div>
                <div className="rounded-xl bg-secondary/45 p-3">
                  <p className="text-xs text-muted-foreground">Sightings</p>
                  <p className="mt-1 text-xl font-extrabold text-foreground">{sightings.length}</p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-[1.65rem] border border-white/65 bg-white/85 p-4 shadow-soft">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Quick actions
              </p>
              <div className="grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.path}
                      onClick={() => navigateTo(action.path)}
                      className="flex w-full items-center gap-3 rounded-xl bg-secondary/30 px-3 py-2.5 text-left transition-all hover:bg-secondary/55 hover:-translate-y-0.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-primary shadow-soft">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">{action.label}</p>
                        <p className="truncate text-[0.68rem] text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Visible dogs',
                value: dogs.length,
                copy: 'Dogs in your workspace',
                icon: PawPrint,
                color: 'text-primary bg-primary/10',
              },
              {
                label: 'Vaccinated',
                value: vaccinatedDogs,
                copy: 'Updated vaccination status',
                icon: Syringe,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                label: 'Medical care',
                value: medicalDogs,
                copy: 'Records needing attention',
                icon: Stethoscope,
                color: 'text-rose-500 bg-rose-50',
              },
              {
                label: 'Expenses raised',
                value: formatCurrency(expenseTotal),
                copy: 'Visible expense totals',
                icon: Wallet,
                color: 'text-amber-600 bg-amber-50',
              },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <Card
                  key={stat.label}
                  className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft"
                >
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-foreground">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{stat.copy}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Care priorities + Tabs */}
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            {/* Tabs section */}
            <Tabs defaultValue="dogs" className="space-y-4">
              <TabsList className="h-auto flex-wrap gap-1 rounded-2xl bg-white/80 p-1 shadow-soft">
                <TabsTrigger value="dogs" className="flex items-center gap-1.5 rounded-xl">
                  <PawPrint className="h-3.5 w-3.5" />
                  Dogs
                </TabsTrigger>
                <TabsTrigger value="food" className="flex items-center gap-1.5 rounded-xl">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Food
                </TabsTrigger>
                <TabsTrigger value="medical" className="flex items-center gap-1.5 rounded-xl">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Medical
                </TabsTrigger>
                <TabsTrigger value="vaccination" className="flex items-center gap-1.5 rounded-xl">
                  <Syringe className="h-3.5 w-3.5" />
                  Vaccination
                </TabsTrigger>
                <TabsTrigger value="contributions" className="flex items-center gap-1.5 rounded-xl">
                  <Wallet className="h-3.5 w-3.5" />
                  Contributions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dogs">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Recently visible dogs</CardTitle>
                    <CardDescription>
                      A friendly overview of dogs that need local attention.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    {recentDogs.length ? (
                      recentDogs.map((dog) => {
                        const area = areaMap[dog.area_id]
                        return (
                          <DogCard
                            key={dog.id}
                            dog={dog}
                            area={area}
                            onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                          />
                        )
                      })
                    ) : (
                      <EmptyState icon={PawPrint} message="No dogs are visible yet. Add the first record in your area to get started." />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="food">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Food support watchlist</CardTitle>
                    <CardDescription>
                      Dogs whose notes mention feeding help or food needs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {foodDogs ? (
                      dogs
                        .filter((dog) => (dog.health_notes || '').toLowerCase().includes('food'))
                        .slice(0, 5)
                        .map((dog) => (
                          <DogListItem key={dog.id} dog={dog} onClick={() => navigateTo(`/dogs/${dog.id}`)} />
                        ))
                    ) : (
                      <EmptyState icon={UtensilsCrossed} message="No dogs are currently tagged with food-related notes." />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medical">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Medical focus</CardTitle>
                    <CardDescription>
                      Dogs whose care notes suggest medical attention.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {medicalDogs ? (
                      dogs
                        .filter((dog) => (dog.health_notes || '').toLowerCase().includes('medical'))
                        .slice(0, 5)
                        .map((dog) => (
                          <DogListItem key={dog.id} dog={dog} onClick={() => navigateTo(`/dogs/${dog.id}`)} />
                        ))
                    ) : (
                      <EmptyState icon={Stethoscope} message="No visible dogs are currently flagged for medical follow-up." />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vaccination">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Vaccination progress</CardTitle>
                    <CardDescription>Keep immunization visibility simple for field volunteers.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <StatTile label="Vaccinated dogs" value={vaccinatedDogs} color="bg-emerald-50 text-emerald-700" />
                    <StatTile label="Sterilized dogs" value={sterilizedDogs} color="bg-blue-50 text-blue-700" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contributions">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Contribution summary</CardTitle>
                    <CardDescription>
                      A snapshot of visible support activity across the app.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <StatTile label="Expenses raised" value={formatCurrency(expenseTotal)} />
                    <StatTile label="Recent sightings" value={sightings.length} />
                    <StatTile label="Pending contributions" value={pendingContributions} />
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground md:col-span-3">
                      Contributor detail lives inside each dog expense card so this dashboard stays
                      easy to scan on mobile.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Care priorities sidebar */}
            <div className="space-y-4">
              <Card className="overflow-hidden rounded-3xl border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,240,228,0.95))] shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle>Care priorities</CardTitle>
                  <CardDescription>Today&apos;s most important support needs at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2.5">
                  {[
                    {
                      label: 'Food support',
                      sub: 'Dogs with feeding notes',
                      value: foodDogs,
                      dot: 'bg-amber-400',
                    },
                    {
                      label: 'Medical follow-up',
                      sub: 'Records needing care',
                      value: medicalDogs,
                      dot: 'bg-rose-400',
                    },
                    {
                      label: 'Vaccinated',
                      sub: 'Already marked safe',
                      value: vaccinatedDogs,
                      dot: 'bg-emerald-400',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-[1.4rem] bg-secondary/40 px-4 py-3"
                    >
                      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                      <span className="text-lg font-extrabold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent sightings mini */}
              <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle>Recent sightings</CardTitle>
                  <CardDescription>Fresh field activity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {recentSightings.length ? (
                    recentSightings.map((sighting) => (
                      <div
                        key={sighting.id}
                        className="rounded-[1.3rem] border border-border/60 bg-secondary/25 p-3"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Activity className="h-3 w-3 text-accent" />
                          {new Date(sighting.sighted_at).toLocaleDateString()}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {sighting.notes ||
                            sighting.location_description ||
                            'Sighting added without notes.'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent sightings yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function DogListItem({ dog, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-[1.4rem] border border-white/55 bg-secondary/30 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-primary shadow-soft">
        <PawPrint className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {dog.health_notes || 'No additional notes.'}
        </p>
      </div>
      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    </button>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  )
}

function StatTile({ label, value, color = 'bg-secondary/40 text-foreground' }) {
  return (
    <div className={`rounded-[1.4rem] p-5 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}
