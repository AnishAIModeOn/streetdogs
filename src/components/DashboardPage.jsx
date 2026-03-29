import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  HeartHandshake,
  MapPin,
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

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`

function buildDogDisplayLocation(dog) {
  return (
    dog?.locality_name ||
    dog?.tagged_area_neighbourhood ||
    dog?.society_name ||
    dog?.tagged_society_name ||
    dog?.location_description ||
    'Location unavailable'
  )
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
  const { data: dogs = [], isLoading: isDogsLoading, error: dogsError } = useDogs()
  const { data: expenses = [], isLoading: isExpensesLoading, error: expensesError } = useExpenses()
  const { data: areas = [], isLoading: isAreasLoading, error: areasError } = useQuery({
    queryKey: ['areas', 'active'],
    queryFn: listActiveAreas,
  })
  const { data: sightings = [], isLoading: isSightingsLoading, error: sightingsError } = useQuery({
    queryKey: ['dog-sightings'],
    queryFn: listDogSightings,
  })

  const areaMap = useMemo(
    () => areas.reduce((grouped, area) => ((grouped[area.id] = area), grouped), {}),
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
  const primaryLocationDog = dogs.find((dog) => buildDogDisplayLocation(dog) !== 'Location unavailable') || null
  const recentExpense = expenses[0] || null

  const urgentHighlights = [
    {
      label: 'Medical follow-up',
      sub: medicalDogs
        ? 'Dogs may need a volunteer check-in today.'
        : 'No urgent medical notes right now.',
      value: medicalDogs,
      icon: Stethoscope,
      tone: 'bg-primary/12 text-primary',
    },
    {
      label: 'Food support',
      sub: foodDogs
        ? 'Feeding-related notes are visible in active dog records.'
        : 'No feeding alerts are visible right now.',
      value: foodDogs,
      icon: UtensilsCrossed,
      tone: 'bg-secondary/18 text-secondary',
    },
  ]

  const recentActivity = [
    recentExpense
      ? {
          id: `expense-${recentExpense.id}`,
          icon: Wallet,
          label: 'Support update',
          title: recentExpense.expense_type || 'Community support request',
          meta: formatCurrency(recentExpense.total_amount || recentExpense.amount || 0),
          copy:
            recentExpense.description ||
            'An expense request is active and visible to supporters.',
        }
      : null,
    sightings[0]
      ? {
          id: `sighting-${sightings[0].id}`,
          icon: Activity,
          label: 'Community sighting',
          title: sightings[0].location_description || 'New street sighting added',
          meta: new Date(sightings[0].sighted_at).toLocaleDateString(),
          copy: sightings[0].notes || 'Someone in the community logged a fresh sighting.',
        }
      : null,
    recentDogs[0]
      ? {
          id: `dog-${recentDogs[0].id}`,
          icon: PawPrint,
          label: 'Dog record added',
          title:
            recentDogs[0].dog_name_or_temp_name || `Dog ${recentDogs[0].id.slice(0, 6)}`,
          meta: buildDogDisplayLocation(recentDogs[0]),
          copy:
            recentDogs[0].short_summary ||
            recentDogs[0].health_notes ||
            'A new dog record is now visible to the community.',
        }
      : null,
  ].filter(Boolean)

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

  const summaryStats = [
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
      color: 'text-secondary bg-secondary/14',
    },
    {
      label: 'Medical care',
      value: medicalDogs,
      copy: 'Records needing attention',
      icon: Stethoscope,
      color: 'text-primary bg-primary/12',
    },
    {
      label: 'Expenses raised',
      value: formatCurrency(expenseTotal),
      copy: 'Visible expense totals',
      icon: Wallet,
      color: 'text-secondary bg-accent/90',
    },
  ]

  const mobileQuickActions = [
    { label: 'Add Dog', icon: Plus, path: '/dogs/new' },
    { label: 'Dogs', icon: PawPrint, path: '/dogs' },
    {
      label: canManageInventory ? 'Inventory Admin' : 'Inventory',
      icon: canManageInventory ? ShieldPlus : HeartHandshake,
      path: canManageInventory ? '/inventory/admin' : '/inventory',
    },
  ]

  return (
    <section className="space-y-4 pb-24 sm:space-y-5 lg:pb-0">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(249,246,238,0.98)_48%,rgba(237,246,241,0.96))] p-4 shadow-float sm:rounded-[2rem] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,161,83,0.18),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(105,160,128,0.14),transparent_28%)]" />
        <div className="relative grid gap-3 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="order-2 overflow-hidden rounded-[1.7rem] border-white/65 bg-white/72 shadow-soft backdrop-blur-sm xl:order-1 xl:rounded-[1.9rem]">
            <CardContent className="space-y-4 p-4 sm:p-7">
              <div className="space-y-3">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[0.68rem]">
                  Community dashboard
                </Badge>
                <div className="space-y-2">
                  <h1 className="max-w-xl text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    Keep an eye on local dogs and the places that may need help next.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-[1.35rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,250,242,0.96),rgba(240,247,242,0.96))] px-3.5 py-3.5 shadow-soft sm:rounded-[1.5rem] sm:px-4 sm:py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary sm:h-11 sm:w-11 sm:rounded-2xl">
                    <MapPin className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Your area
                    </p>
                    <p className="text-sm font-semibold text-foreground sm:text-base">
                      {primaryLocationDog ? buildDogDisplayLocation(primaryLocationDog) : 'Your local area'}
                    </p>
                    <p className="hidden text-xs leading-5 text-muted-foreground sm:block">
                      Local updates and care signals are centered around this community first.
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden flex-wrap gap-3 sm:flex">
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
            </CardContent>
          </Card>

          <Card className="card-urgent order-1 overflow-hidden rounded-[1.75rem] border-orange-200/80 shadow-float xl:order-2 xl:rounded-[1.95rem]">
            <CardContent className="space-y-4 p-4 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Urgent needs
                  </p>
                  <h2 className="max-w-lg text-xl font-extrabold tracking-tight text-foreground sm:text-[1.7rem]">
                    {medicalDogs || foodDogs
                      ? `${medicalDogs + foodDogs} dogs may need timely care`
                      : 'No urgent follow-up is visible right now'}
                  </h2>
                  <p className="max-w-lg text-sm leading-5 text-muted-foreground sm:leading-6">
                    Use this section to focus on dogs that may need food, care, or volunteer attention first.
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-white/90 text-primary shadow-soft sm:h-14 sm:w-14 sm:rounded-[1.35rem]">
                  <HeartHandshake className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {urgentHighlights.map((highlight) => {
                  const Icon = highlight.icon
                  return (
                    <div
                      key={highlight.label}
                      className="rounded-[1.35rem] border border-white/75 bg-white/84 p-4 shadow-soft"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${highlight.tone}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-2xl font-extrabold text-foreground">{highlight.value}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">{highlight.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{highlight.sub}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
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
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden rounded-[1.9rem] border-white/65 bg-white/92 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle>Latest community activity</CardTitle>
                <CardDescription>
                  A simple feed of the newest support, sighting, and dog update visible in your workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 lg:mx-0 lg:grid lg:gap-3 lg:overflow-visible lg:px-0">
                {recentActivity.length ? (
                  recentActivity.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.id}
                        className="flex min-w-[260px] items-start gap-3 rounded-[1.45rem] border border-border/60 bg-secondary/15 p-4 lg:min-w-0"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/85 text-primary shadow-soft">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {item.label}
                            </p>
                            <span className="text-xs text-muted-foreground">{item.meta}</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.copy}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState
                    icon={Activity}
                    message="Community activity will appear here once sightings or support updates are added."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.9rem] border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,244,0.95))] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Simple next steps for today&apos;s field work.</CardDescription>
              </CardHeader>
              <CardContent className="-mx-6 flex gap-2.5 overflow-x-auto px-6 pb-1 lg:mx-0 lg:grid lg:overflow-visible lg:px-0">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.path}
                      onClick={() => navigateTo(action.path)}
                      className="flex min-w-[230px] items-center gap-3 rounded-[1.2rem] bg-secondary/18 px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-secondary/26 lg:min-w-0 lg:w-full"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 text-primary shadow-soft">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-4">
            {summaryStats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card
                  key={stat.label}
                  className="min-w-[200px] overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft sm:min-w-0"
                >
                  <CardContent className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{stat.copy}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden rounded-[1.9rem] border-white/65 bg-white/95 shadow-soft">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Recent dogs</CardTitle>
                    <CardDescription>
                      Newly visible dog records that help your area stay aware of care needs.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    className="hidden sm:inline-flex"
                    onClick={() => navigateTo('/dogs')}
                  >
                    See all dogs
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0">
                {recentDogs.length ? (
                  recentDogs.map((dog) => (
                    <div key={dog.id} className="min-w-[280px] lg:min-w-0">
                      <DogCard
                        dog={dog}
                        area={areaMap[dog.area_id]}
                        onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                      />
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={PawPrint}
                    message="No dogs are visible yet. Add the first record in your area to get started."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.9rem] border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,240,228,0.95))] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle>At a glance</CardTitle>
                <CardDescription>Small signals that help you decide where to look next.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <StatTile label="Areas covered" value={areasCovered} color="bg-secondary/16 text-foreground" />
                <StatTile
                  label="Pending contributions"
                  value={pendingContributions}
                  color="bg-accent/85 text-foreground"
                />
                <StatTile label="Recent sightings" value={sightings.length} color="bg-primary/10 text-primary" />
                <StatTile label="Sterilized dogs" value={sterilizedDogs} color="bg-secondary/24 text-foreground" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <Tabs defaultValue="food" className="space-y-4">
              <TabsList className="h-auto flex-wrap gap-1 rounded-2xl bg-white/80 p-1 shadow-soft">
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
                  Support
                </TabsTrigger>
              </TabsList>

              <TabsContent value="food">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Food support watchlist</CardTitle>
                    <CardDescription>Dogs whose notes mention feeding help or food needs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {foodDogs ? (
                      dogs
                        .filter((dog) => (dog.health_notes || '').toLowerCase().includes('food'))
                        .slice(0, 5)
                        .map((dog) => (
                          <DogListItem
                            key={dog.id}
                            dog={dog}
                            onClick={() => navigateTo(`/dogs/${dog.id}`)}
                          />
                        ))
                    ) : (
                      <EmptyState
                        icon={UtensilsCrossed}
                        message="No dogs are currently tagged with food-related notes."
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medical">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Medical focus</CardTitle>
                    <CardDescription>Dogs whose care notes suggest medical attention.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {medicalDogs ? (
                      dogs
                        .filter((dog) => (dog.health_notes || '').toLowerCase().includes('medical'))
                        .slice(0, 5)
                        .map((dog) => (
                          <DogListItem
                            key={dog.id}
                            dog={dog}
                            onClick={() => navigateTo(`/dogs/${dog.id}`)}
                          />
                        ))
                    ) : (
                      <EmptyState
                        icon={Stethoscope}
                        message="No visible dogs are currently flagged for medical follow-up."
                      />
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
                    <StatTile label="Vaccinated dogs" value={vaccinatedDogs} color="bg-secondary/16 text-foreground" />
                    <StatTile label="Sterilized dogs" value={sterilizedDogs} color="bg-accent/85 text-foreground" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contributions">
                <Card className="overflow-hidden rounded-3xl border-white/65 bg-white/95 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle>Support summary</CardTitle>
                    <CardDescription>A snapshot of visible support activity across the app.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <StatTile label="Expenses raised" value={formatCurrency(expenseTotal)} color="bg-accent/85 text-foreground" />
                    <StatTile label="Recent sightings" value={sightings.length} color="bg-primary/10 text-primary" />
                    <StatTile label="Pending contributions" value={pendingContributions} color="bg-secondary/16 text-foreground" />
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/16 p-4 text-sm leading-6 text-muted-foreground md:col-span-3">
                      Contributor detail lives inside each dog expense card so this dashboard stays easy to scan on mobile.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <Card className="overflow-hidden rounded-3xl border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,240,228,0.95))] shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle>Care priorities</CardTitle>
                  <CardDescription>Today&apos;s most important support needs at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2.5">
                  {[
                    { label: 'Food support', sub: 'Dogs with feeding notes', value: foodDogs, dot: 'bg-primary' },
                    { label: 'Medical follow-up', sub: 'Records needing care', value: medicalDogs, dot: 'bg-primary/80' },
                    { label: 'Vaccinated', sub: 'Already marked safe', value: vaccinatedDogs, dot: 'bg-secondary' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-[1.4rem] bg-secondary/18 px-4 py-3"
                    >
                      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                      <span className="text-lg font-extrabold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
        <Card className="border-white/80 bg-white/92 shadow-float backdrop-blur-md">
          <CardContent className="grid grid-cols-3 gap-2 p-2">
            {mobileQuickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => navigateTo(action.path)}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.2rem] bg-secondary/20 px-2 py-2 text-center transition-all hover:bg-secondary/30"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[0.72rem] font-semibold leading-4 text-foreground">{action.label}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>
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




