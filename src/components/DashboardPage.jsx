import { useEffect, useMemo, useState } from 'react'
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
import { listActiveAreas, listDogSightings, listDogs, listExpensesForDog } from '../lib/communityData'
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
  const [dogs, setDogs] = useState([])
  const [areas, setAreas] = useState([])
  const [sightings, setSightings] = useState([])
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setErrorMessage('')
        const [nextDogs, nextAreas, nextSightings] = await Promise.all([
          listDogs(),
          listActiveAreas(),
          listDogSightings(),
        ])

        if (!isMounted) {
          return
        }

        setDogs(nextDogs)
        setAreas(nextAreas)
        setSightings(nextSightings)

        const expenseResults = await Promise.all(
          nextDogs.slice(0, 12).map(async (dog) => {
            try {
              return await listExpensesForDog(dog.id)
            } catch {
              return []
            }
          }),
        )

        if (!isMounted) {
          return
        }

        const totalRaised = expenseResults
          .flat()
          .reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0)

        setExpenseTotal(totalRaised)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load the dashboard.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const areaMap = useMemo(
    () =>
      areas.reduce((grouped, area) => {
        grouped[area.id] = area
        return grouped
      }, {}),
    [areas],
  )

  const vaccinatedDogs = dogs.filter((dog) => dog.vaccination_status === 'vaccinated').length
  const medicalDogs = dogs.filter((dog) =>
    (dog.health_notes || '').toLowerCase().includes('medical'),
  ).length
  const foodDogs = dogs.filter((dog) => (dog.health_notes || '').toLowerCase().includes('food')).length
  const sterilizedDogs = dogs.filter((dog) => dog.sterilization_status === 'sterilized').length
  const recentDogs = dogs.slice(0, 4)
  const recentSightings = sightings.slice(0, 4)
  const canManageInventory =
    profile?.role === 'inventory_admin' || profile?.role === 'superadmin'

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Volunteer dashboard
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Welcome back to StreetDog App
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Keep neighborhood dog care moving with one calm workspace for records, support,
              supplies, and follow-up.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo('/dogs/new')}>
              <Plus className="h-4 w-4" />
              Add Dog
            </Button>
            <Button variant="secondary" onClick={() => navigateTo('/dogs')}>
              <PawPrint className="h-4 w-4" />
              Browse Dogs
            </Button>
            {canManageInventory ? (
              <Button variant="outline" onClick={() => navigateTo('/inventory/admin')}>
                <ShieldPlus className="h-4 w-4" />
                Open inventory admin
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigateTo('/inventory')}>
                <HeartHandshake className="h-4 w-4" />
                View inventory requests
              </Button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Choose the next helpful thing without digging through menus.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="secondary" className="justify-between" onClick={() => navigateTo('/report-dog')}>
              Guest report flow
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" className="justify-between" onClick={() => navigateTo('/inventory')}>
              Community inventory
              <ArrowRight className="h-4 w-4" />
            </Button>
            {canManageInventory ? (
              <Button variant="secondary" className="justify-between" onClick={() => navigateTo('/inventory/new')}>
                New inventory request
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
            {profile?.role === 'superadmin' ? (
              <Button variant="secondary" className="justify-between" onClick={() => navigateTo('/admin/users')}>
                Manage user roles
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </CardContent>
        </Card>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <Card key={stat.label} className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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

          <Tabs defaultValue="dogs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dogs">Dogs</TabsTrigger>
              <TabsTrigger value="food">Food</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="vaccination">Vaccination</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
            </TabsList>

            <TabsContent value="dogs">
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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
              <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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
                    { label: 'Active areas', value: areas.length.toString() },
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

          <Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90">
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
