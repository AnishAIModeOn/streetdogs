import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  HeartHandshake,
  PawPrint,
  Plus,
  ShieldPlus,
  Stethoscope,
  Syringe,
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
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl border border-border/70 bg-white/70"
          />
        ))}
      </div>
      <div className="h-[380px] animate-pulse rounded-3xl border border-border/70 bg-white/70" />
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

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.92),rgba(249,244,230,0.96)_45%,rgba(234,245,238,0.96))] p-6 shadow-float sm:p-7">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(243,174,87,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(78,128,109,0.16),transparent_42%)] lg:block" />
          <div className="relative space-y-5">
            <Badge className="w-fit" variant="secondary">
            Volunteer dashboard
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Welcome back to StreetDog App
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Keep neighborhood dog care moving with one calm workspace for records, support,
                supplies, and follow-up.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Dogs tracked
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {dogs.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Visible in your workspace</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Areas covered
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {areasCovered}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Neighborhoods currently active</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-soft">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Support moving
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(expenseTotal)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Expenses raised so far</p>
              </div>
            </div>

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
                  Open inventory admin
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={() => navigateTo('/inventory')}>
                  <HeartHandshake className="h-4 w-4" />
                  View inventory requests
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle>Today&apos;s momentum</CardTitle>
              <CardDescription>
                A quick community snapshot before you dive into the details.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-secondary/45 p-4">
                <p className="text-sm font-medium text-muted-foreground">Pending contributions</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{pendingContributions}</p>
              </div>
              <div className="rounded-[1.5rem] bg-secondary/45 p-4">
                <p className="text-sm font-medium text-muted-foreground">Recent sightings</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{sightings.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90 shadow-soft">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Choose the next helpful thing without digging through menus.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="secondary" className="justify-between rounded-2xl" onClick={() => navigateTo('/report-dog')}>
                Guest report flow
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" className="justify-between rounded-2xl" onClick={() => navigateTo('/inventory')}>
                Community inventory
                <ArrowRight className="h-4 w-4" />
              </Button>
              {canManageInventory ? (
                <Button variant="secondary" className="justify-between rounded-2xl" onClick={() => navigateTo('/inventory/new')}>
                  New inventory request
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {profile?.role === 'superadmin' ? (
                <Button variant="secondary" className="justify-between rounded-2xl" onClick={() => navigateTo('/admin/users')}>
                  Manage user roles
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {errorMessage ? (
        <Card className="rounded-3xl border-red-200 bg-red-50/80">
          <CardContent className="p-5 text-sm text-red-700">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {[
              {
                label: 'Visible dogs',
                value: dogs.length,
                copy: 'Dogs currently visible to your account',
                icon: PawPrint,
              },
              {
                label: 'Vaccinated',
                value: vaccinatedDogs,
                copy: 'Dogs with updated vaccination status',
                icon: Syringe,
              },
              {
                label: 'Need medical care',
                value: medicalDogs,
                copy: 'Records mentioning medical support',
                icon: Stethoscope,
              },
              {
                label: 'Expenses raised',
                value: formatCurrency(expenseTotal),
                copy: 'Recent visible expense totals',
                icon: Wallet,
              },
            ].map((stat) => {
              const Icon = stat.icon

              return (
                <Card key={stat.label} className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{stat.copy}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </div>

            <Card className="overflow-hidden rounded-3xl border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,239,227,0.94))] shadow-soft">
              <CardHeader>
                <CardTitle>Care priorities</CardTitle>
                <CardDescription>
                  Keep today&apos;s most important support needs easy to spot.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between rounded-[1.5rem] bg-secondary/45 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Food support</p>
                    <p className="text-sm text-muted-foreground">Dogs whose notes mention feeding help</p>
                  </div>
                  <Badge variant="secondary">{foodDogs}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] bg-secondary/45 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Medical follow-up</p>
                    <p className="text-sm text-muted-foreground">Records needing care attention</p>
                  </div>
                  <Badge variant="secondary">{medicalDogs}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] bg-secondary/45 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Vaccination progress</p>
                    <p className="text-sm text-muted-foreground">Dogs already marked vaccinated</p>
                  </div>
                  <Badge variant="secondary">{vaccinatedDogs}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="dogs" className="space-y-4">
            <TabsList className="h-auto flex-wrap rounded-2xl bg-white/80 p-1 shadow-soft">
              <TabsTrigger value="dogs">Dogs</TabsTrigger>
              <TabsTrigger value="food">Food</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="vaccination">Vaccination</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
            </TabsList>

            <TabsContent value="dogs">
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
                <CardHeader>
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
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                      No dogs are visible yet. Add the first record in your area to get started.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="food">
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
                <CardHeader>
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
                        <div key={dog.id} className="rounded-[1.5rem] border border-white/60 bg-secondary/35 p-4 text-sm shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
                          <p className="font-semibold text-foreground">
                            {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
                          </p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            {dog.health_notes || 'Food support requested.'}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                      No dogs are currently tagged with food-related notes.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical">
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
                <CardHeader>
                  <CardTitle>Medical focus</CardTitle>
                  <CardDescription>
                    Quickly spot dogs whose care notes suggest medical attention.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {medicalDogs ? (
                    dogs
                      .filter((dog) => (dog.health_notes || '').toLowerCase().includes('medical'))
                      .slice(0, 5)
                      .map((dog) => (
                        <div key={dog.id} className="rounded-[1.5rem] border border-white/60 bg-secondary/35 p-4 text-sm shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
                          <p className="font-semibold text-foreground">
                            {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
                          </p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            {dog.health_notes || 'Medical follow-up needed.'}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                      No visible dogs are currently flagged for medical follow-up.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vaccination">
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
                <CardHeader>
                  <CardTitle>Vaccination progress</CardTitle>
                  <CardDescription>
                    Keep immunization visibility simple for field volunteers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-secondary/40 p-5 shadow-soft">
                    <p className="text-sm font-medium text-muted-foreground">Vaccinated dogs</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{vaccinatedDogs}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-secondary/40 p-5 shadow-soft">
                    <p className="text-sm font-medium text-muted-foreground">Sterilized dogs</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{sterilizedDogs}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions">
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
                <CardHeader>
                  <CardTitle>Contribution summary</CardTitle>
                  <CardDescription>
                    A simple snapshot of visible support activity across the app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: 'Expenses raised', value: formatCurrency(expenseTotal) },
                    { label: 'Recent sightings', value: sightings.length.toString() },
                    {
                      label: 'Pending contributions',
                      value: pendingContributions.toString(),
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.5rem] bg-secondary/40 p-5 shadow-soft">
                      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-5 text-sm leading-6 text-muted-foreground md:col-span-3">
                    Contributor-level detail continues to live inside each dog expense card, so this
                    dashboard stays easy to scan on mobile.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-soft">
            <CardHeader>
              <CardTitle>Recent sightings</CardTitle>
              <CardDescription>
                Fresh field activity helps the whole neighborhood stay aligned.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {recentSightings.length ? (
                recentSightings.map((sighting) => (
                  <div key={sighting.id} className="rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4 shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Activity className="h-4 w-4 text-accent" />
                      {new Date(sighting.sighted_at).toLocaleString()}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {sighting.notes || sighting.location_description || 'Sighting added without notes.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                  No recent sightings are visible yet.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
