import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  HeartHandshake,
  PawPrint,
  Plus,
  ShieldPlus,
  Syringe,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { findMatchingAreaId, normalizeAreaLabel, useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { useDogs } from '../hooks/use-dogs'
import { useExpenses } from '../hooks/use-expenses'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { DashboardActionGrid } from './DashboardActionGrid'
import { DashboardHeader } from './DashboardHeader'
import { RecentDogs } from './RecentDogs'
import { UrgentNeeds } from './UrgentNeeds'
import { Card, CardContent } from './ui/card'

const DASHBOARD_LOCATION_KEY = 'streetdog-landing-location'

function readStoredLocation() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_LOCATION_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return {
      ...parsed,
      areaLabel: normalizeAreaLabel(parsed?.areaLabel),
    }
  } catch {
    return null
  }
}

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

function normalizeComparable(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

function matchesAreaSelection(dog, selection) {
  if (!selection.hasSelection) {
    return true
  }

  if (selection.selectedSocietyName) {
    const dogSocietyLabels = [dog.society_name, dog.tagged_society_name]
      .map(normalizeComparable)
      .filter(Boolean)

    if (dogSocietyLabels.includes(selection.selectedSocietyName)) {
      return true
    }
  }

  if (selection.matchedAreaId && dog.area_id === selection.matchedAreaId) {
    return true
  }

  const dogAreaLabels = [
    dog.area_name,
    dog.locality_name,
    dog.tagged_area_neighbourhood,
    dog.location_description,
  ]
    .map(normalizeComparable)
    .filter(Boolean)

  if (selection.areaLabel && dogAreaLabels.some((label) => label.includes(selection.areaLabel))) {
    return true
  }

  return Boolean(selection.pincode && dog.tagged_area_pincode === selection.pincode)
}

function buildActivityItems({ dogs, expenses, selectedAreaLabel }) {
  const items = []
  const latestDog = dogs[0]
  const vaccinatedDog = dogs.find((dog) => dog.vaccination_status === 'vaccinated')
  const latestExpense = expenses[0]

  if (latestDog) {
    items.push({
      id: `dog-${latestDog.id}`,
      icon: PawPrint,
      text: `${latestDog.dog_name_or_temp_name || 'Dog record'} added in ${buildDogDisplayLocation(latestDog)}`,
    })
  }

  if (latestExpense) {
    items.push({
      id: `expense-${latestExpense.id}`,
      icon: Wallet,
      text: 'Expense raised for community support',
    })
  }

  if (vaccinatedDog) {
    items.push({
      id: `vaccinated-${vaccinatedDog.id}`,
      icon: Syringe,
      text: `${vaccinatedDog.dog_name_or_temp_name || 'Dog'} marked vaccinated`,
    })
  }

  if (!items.length) {
    items.push(
      { id: 'activity-dog', icon: PawPrint, text: `Dog added in ${selectedAreaLabel}` },
      { id: 'activity-expense', icon: Wallet, text: 'Expense raised' },
      { id: 'activity-vaccination', icon: Syringe, text: 'Dog vaccinated' },
    )
  }

  return items.slice(0, 3)
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 animate-pulse rounded-[1.6rem] border border-white/70 bg-white/70" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-[1.35rem] border border-white/70 bg-white/70"
          />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-[1.5rem] border border-white/70 bg-white/70" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-[1.5rem] border border-white/70 bg-white/70"
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardPage({ profile }) {
  const persistedLocation = useMemo(() => readStoredLocation(), [])
  const flow = useAreaSocietyFlow({
    initialAreaLabel: persistedLocation?.areaLabel ?? '',
    initialPincode: persistedLocation?.pincode ?? '',
    initialSociety: persistedLocation?.selectedSociety ?? null,
    autoDetect: !persistedLocation?.areaLabel,
  })
  const { data: dogs = [], isLoading: isDogsLoading, error: dogsError } = useDogs()
  const { data: expenses = [], isLoading: isExpensesLoading, error: expensesError } = useExpenses()
  const { data: areas = [], isLoading: isAreasLoading, error: areasError } = useQuery({
    queryKey: ['areas'],
    queryFn: listAreas,
  })
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationModalKey, setLocationModalKey] = useState(0)

  const matchedAreaId = useMemo(
    () => findMatchingAreaId(areas, flow.areaContext.neighbourhood || flow.areaContext.areaLabel),
    [areas, flow.areaContext.areaLabel, flow.areaContext.neighbourhood],
  )

  const areasById = useMemo(
    () => Object.fromEntries(areas.map((area) => [area.id, area])),
    [areas],
  )

  const selectedAreaLabel =
    (matchedAreaId ? areasById[matchedAreaId]?.name : '') ||
    normalizeAreaLabel(flow.areaContext.neighbourhood || flow.areaContext.areaLabel) ||
    'Select area'

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!flow.areaContext.areaLabel && !flow.selectedSociety?.name) {
      window.localStorage.removeItem(DASHBOARD_LOCATION_KEY)
      return
    }

    window.localStorage.setItem(
      DASHBOARD_LOCATION_KEY,
      JSON.stringify({
        areaLabel: selectedAreaLabel,
        pincode: flow.areaContext.pincode,
        selectedSociety: flow.selectedSociety,
      }),
    )
  }, [flow.areaContext.areaLabel, flow.areaContext.pincode, flow.selectedSociety, selectedAreaLabel])

  const selection = useMemo(
    () => ({
      hasSelection: Boolean(
        matchedAreaId ||
          flow.areaContext.areaLabel ||
          flow.areaContext.neighbourhood ||
          flow.selectedSociety?.name,
      ),
      matchedAreaId,
      areaLabel: normalizeComparable(selectedAreaLabel),
      pincode: flow.areaContext.pincode,
      selectedSocietyName: normalizeComparable(flow.selectedSociety?.name),
    }),
    [
      flow.areaContext.areaLabel,
      flow.areaContext.neighbourhood,
      flow.areaContext.pincode,
      flow.selectedSociety?.name,
      matchedAreaId,
      selectedAreaLabel,
    ],
  )

  const filteredDogs = useMemo(
    () => dogs.filter((dog) => matchesAreaSelection(dog, selection)),
    [dogs, selection],
  )
  const filteredDogIds = useMemo(() => new Set(filteredDogs.map((dog) => dog.id)), [filteredDogs])
  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        if (
          selection.selectedSocietyName &&
          normalizeComparable(expense.target_society_name).includes(selection.selectedSocietyName)
        ) {
          return true
        }

        if (selection.matchedAreaId && expense.area_id === selection.matchedAreaId) {
          return true
        }

        return filteredDogIds.has(expense.dog_id)
      }),
    [expenses, filteredDogIds, selection.matchedAreaId],
  )

  const urgentCounts = useMemo(() => {
    const medical = filteredDogs.filter((dog) => (dog.health_notes || '').toLowerCase().includes('medical')).length
    const food = filteredDogs.filter((dog) => (dog.health_notes || '').toLowerCase().includes('food')).length
    const vaccination = filteredDogs.filter((dog) => dog.vaccination_status !== 'vaccinated').length
    const support = filteredExpenses.filter((expense) => Number(expense.amount_pending || 0) > 0).length

    return { medical, food, vaccination, support }
  }, [filteredDogs, filteredExpenses])

  const urgentItems = [
    {
      label: 'Medical',
      count: urgentCounts.medical,
      icon: Activity,
      path: '/dogs',
      tone: 'bg-[linear-gradient(180deg,rgba(255,244,238,0.98),rgba(255,255,255,0.95))] text-foreground',
      iconClassName: 'bg-primary/12 text-primary',
    },
    {
      label: 'Food',
      count: urgentCounts.food,
      icon: UtensilsCrossed,
      path: '/inventory',
      tone: 'bg-[linear-gradient(180deg,rgba(250,244,233,0.98),rgba(255,255,255,0.95))] text-foreground',
      iconClassName: 'bg-secondary/55 text-primary',
    },
    {
      label: 'Vaccination',
      count: urgentCounts.vaccination,
      icon: Syringe,
      path: '/dogs',
      tone: 'bg-[linear-gradient(180deg,rgba(241,248,243,0.98),rgba(255,255,255,0.95))] text-foreground',
      iconClassName: 'bg-secondary/60 text-primary',
    },
    {
      label: 'Support',
      count: urgentCounts.support,
      icon: HeartHandshake,
      path: '/inventory',
      tone: 'bg-[linear-gradient(180deg,rgba(247,241,233,0.98),rgba(255,255,255,0.95))] text-foreground',
      iconClassName: 'bg-secondary/55 text-primary',
    },
  ]

  const recentDogs = filteredDogs.slice(0, 4)
  const latestActivity = buildActivityItems({
    dogs: filteredDogs,
    expenses: filteredExpenses,
    selectedAreaLabel,
  })
  const isLoading = isDogsLoading || isExpensesLoading || isAreasLoading
  const errorMessage =
    (dogsError instanceof Error && dogsError.message) ||
    (expensesError instanceof Error && expensesError.message) ||
    (areasError instanceof Error && areasError.message) ||
    ''

  const mobileQuickActions = [
    { label: 'Add Dog', icon: Plus, path: '/dogs/new' },
    { label: 'Dogs', icon: PawPrint, path: '/dogs' },
    {
      label: 'Inventory',
      icon: profile?.role === 'inventory_admin' || profile?.role === 'superadmin' ? ShieldPlus : HeartHandshake,
      path: '/inventory',
    },
  ]

  return (
    <section className="space-y-4 pb-24 sm:space-y-5 lg:pb-0">
      <DashboardHeader
        areaLabel={selectedAreaLabel}
        societyName={flow.selectedSociety?.name ?? ''}
        locationModalOpen={locationModalOpen}
        locationModalKey={locationModalKey}
        initialLocation={{
          areaInput: flow.areaInput,
          pincode: flow.pincode,
          selectedSociety: flow.selectedSociety,
          manual: flow.manual,
          detectedLabel: flow.detectedLabel,
          detectedNeighbourhood: flow.effectiveNeighbourhood,
          societyDraftName: flow.societyDraftName,
        }}
        onOpenLocation={() => {
          setLocationModalKey((current) => current + 1)
          setLocationModalOpen(true)
        }}
        onCloseLocation={() => setLocationModalOpen(false)}
        onApplyLocation={(snapshot) => {
          flow.applySnapshot(snapshot)
          setLocationModalOpen(false)
        }}
      />

      {errorMessage ? (
        <div className="rounded-[1.4rem] border border-red-200 bg-red-50/85 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardActionGrid />
          <UrgentNeeds items={urgentItems} />
          <RecentDogs dogs={recentDogs} areaMap={areasById} />

          <Card className="overflow-hidden rounded-[1.6rem] border-white/70 bg-white/92 shadow-soft">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="space-y-1">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary/80">
                  Latest activity
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Latest activity</h2>
              </div>

              <div className="space-y-2">
                {latestActivity.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-[1.1rem] bg-secondary/18 px-3 py-3"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-foreground">{item.text}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
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
