import { useEffect, useMemo, useState } from 'react'
import {
  Crosshair,
  ClipboardPlus,
  ChevronDown,
  House,
  Loader2,
  MapPin,
  Package,
  PawPrint,
  ShieldAlert,
  Syringe,
  User,
  Wallet,
} from 'lucide-react'
import { findMatchingAreaId, normalizeAreaLabel, useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { DogCard } from './DogCard'
import { SocietyPicker } from './SocietyPicker'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'

const LANDING_LOCATION_KEY = 'streetdog-landing-location'

function readStoredLocation() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LANDING_LOCATION_KEY)
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

export function LandingPage({ onNavigate }) {
  const [metrics, setMetrics] = useState({
    totalDogs: 0,
    vaccinatedDogs: 0,
    expensesRaised: 0,
    inventoryFulfilled: 0,
  })
  const [areas, setAreas] = useState([])
  const [areasById, setAreasById] = useState({})
  const [landingDogs, setLandingDogs] = useState([])
  const [isDogsLoading, setIsDogsLoading] = useState(true)
  const [landingDogsError, setLandingDogsError] = useState('')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const persistedLocation = useMemo(() => readStoredLocation(), [])
  const [locationStatus, setLocationStatus] = useState(
    persistedLocation?.areaLabel ? 'saved' : 'detecting',
  )

  const flow = useAreaSocietyFlow({
    initialAreaLabel: persistedLocation?.areaLabel ?? '',
    initialPincode: persistedLocation?.pincode ?? '',
    initialSociety: persistedLocation?.selectedSociety ?? null,
    autoDetect: !persistedLocation?.areaLabel,
  })

  const selectedArea = flow.areaContext.neighbourhood || flow.areaContext.areaLabel
  const selectedSociety = flow.selectedSociety
  const matchedAreaId = useMemo(
    () => findMatchingAreaId(areas, flow.areaContext.neighbourhood || flow.areaContext.areaLabel),
    [areas, flow.areaContext.areaLabel, flow.areaContext.neighbourhood],
  )
  const canonicalAreaLabel =
    (matchedAreaId ? areasById[matchedAreaId]?.name : '') || normalizeAreaLabel(selectedArea)
  const showingLabel = canonicalAreaLabel || 'your community'
  const headerAreaLabel = canonicalAreaLabel || 'Select area'

  useEffect(() => {
    let isMounted = true

    const loadLandingData = async () => {
      try {
        const params = new URLSearchParams()
        if (matchedAreaId) {
          params.set('areaId', matchedAreaId)
        }
        if (canonicalAreaLabel) {
          params.set('area', canonicalAreaLabel)
        }
        if (flow.areaContext.pincode) {
          params.set('pincode', flow.areaContext.pincode)
        }
        if (flow.areaContext.societyId) {
          params.set('societyId', flow.areaContext.societyId)
        }
        if (flow.areaContext.societyName) {
          params.set('societyName', flow.areaContext.societyName)
        }

        setIsDogsLoading(true)
        setLandingDogsError('')
        const response = await fetch(`/api/landing-metrics${params.toString() ? `?${params}` : ''}`)
        const payload = await response.json()

        if (isMounted && response.ok && payload?.metrics) {
          setMetrics(payload.metrics)
          setLandingDogs(payload.matchedDogs ?? payload.featuredDogs ?? [])
          return
        }

        if (isMounted) {
          setLandingDogs([])
          setLandingDogsError(payload?.error || 'Unable to load dogs for the homepage right now.')
        }
      } catch {
        if (isMounted) {
          setLandingDogs([])
          setLandingDogsError('Unable to load dogs for the homepage right now.')
        }
      } finally {
        if (isMounted) {
          setIsDogsLoading(false)
        }
      }
    }

    loadLandingData()

    return () => {
      isMounted = false
    }
  }, [
    matchedAreaId,
    flow.areaContext.neighbourhood,
    flow.areaContext.pincode,
    flow.areaContext.societyId,
    flow.areaContext.societyName,
    canonicalAreaLabel,
  ])

  useEffect(() => {
    let isMounted = true

    const loadAreas = async () => {
      try {
        const nextAreas = await listAreas()
        if (!isMounted) {
          return
        }

        setAreas(nextAreas)
        setAreasById(
          nextAreas.reduce((accumulator, area) => {
            accumulator[area.id] = area
            return accumulator
          }, {}),
        )
      } catch {
        if (isMounted) {
          setAreas([])
          setAreasById({})
        }
      }
    }

    loadAreas()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (flow.detecting) {
      setLocationStatus('detecting')
      return
    }

    if (flow.detectedLabel && !flow.manual) {
      setLocationStatus('detected')
      return
    }

    if (selectedSociety?.name) {
      setLocationStatus('society')
      return
    }

    if (selectedArea) {
      setLocationStatus('manual')
      return
    }

    setLocationStatus('idle')
  }, [flow.detectedLabel, flow.detecting, flow.manual, selectedArea, selectedSociety])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!selectedArea) {
      window.localStorage.removeItem(LANDING_LOCATION_KEY)
      return
    }

    window.localStorage.setItem(
      LANDING_LOCATION_KEY,
      JSON.stringify({
        areaLabel: canonicalAreaLabel,
        pincode: flow.areaContext.pincode,
        selectedSociety: flow.selectedSociety,
      }),
    )
  }, [canonicalAreaLabel, flow.areaContext.pincode, flow.selectedSociety, selectedArea])

  const visibleNearbyDogs = landingDogs.slice(0, 10)
  const urgentDog = landingDogs.find(isNeedsAttentionDog) || null

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-3 py-2 pb-28 sm:px-4 sm:py-3 sm:pb-32">
      <section className="sticky top-2 z-30">
        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-[1.2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(251,247,238,0.96),rgba(255,255,255,0.92))] px-3 py-2.5 shadow-[0_12px_30px_rgba(104,85,58,0.1)] backdrop-blur-xl transition-colors hover:bg-[linear-gradient(180deg,rgba(255,250,244,0.98),rgba(255,255,255,0.95))]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <span className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-secondary/45 px-2.5 py-1 text-xs font-semibold text-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{headerAreaLabel}</span>
            </span>
            {selectedSociety?.name ? (
              <span className="min-w-0 max-w-[48%] truncate rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {selectedSociety.name}
              </span>
            ) : null}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </section>

      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="top-auto bottom-0 w-[calc(100%-1rem)] max-w-none translate-x-[-50%] translate-y-0 rounded-b-none rounded-t-[2rem] border-x-0 border-b-0 p-4 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-y-1/2 sm:rounded-b-[2rem] sm:border-x sm:border-b sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Choose location</DialogTitle>
            <DialogDescription>
              Pick your area, optionally add your society, or use location detection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-white/75 bg-secondary/15 p-3">
              <div className="relative min-w-0">
                <Input
                  value={flow.areaInput}
                  placeholder="Select area"
                  onChange={(event) => flow.setAreaInput(event.target.value)}
                  onFocus={() => flow.setShowSuggestions(true)}
                  onBlur={() => window.setTimeout(() => flow.setShowSuggestions(false), 150)}
                  autoComplete="off"
                  className="h-11 rounded-2xl border-white/75 bg-white/90 pr-10 text-sm shadow-none"
                />
                {flow.isFetchingSuggestions ? (
                  <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
                {flow.showSuggestions && flow.areaSuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
                    {flow.areaSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.neighbourhood}-${suggestion.pincode || index}`}
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/35"
                        onMouseDown={() => flow.selectSuggestion(suggestion)}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <span className="flex-1 truncate">
                          {suggestion.neighbourhood || suggestion.pincode}
                        </span>
                        {suggestion.pincode ? (
                          <span className="text-xs text-muted-foreground">{suggestion.pincode}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-white/75 bg-secondary/15 px-3 py-2">
              <SocietyPicker
                pincode={flow.areaContext.pincode}
                neighbourhood={flow.areaContext.neighbourhood}
                onSelect={flow.setSelectedSociety}
                deferCreate
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-2xl"
                onClick={() => {
                  setLocationStatus('detecting')
                  flow.detectLocation()
                }}
              >
                {flow.detecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting location
                  </>
                ) : (
                  <>
                    <Crosshair className="h-4 w-4" />
                    Detect location
                  </>
                )}
              </Button>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-full bg-secondary/45 px-2.5 py-1 text-[0.68rem]">
                  {getLocationMessage(locationStatus, flow.detectedLabel, showingLabel, selectedSociety?.name)}
                </Badge>
                {selectedSociety?.name ? (
                  <span className="truncate rounded-full bg-white/75 px-2.5 py-1">
                    Society: {selectedSociety.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,250,243,0.98),rgba(246,239,228,0.94))] p-5 shadow-float">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(244,176,93,0.22),transparent_72%)]" />
        <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative space-y-4">
          <Badge className="w-fit bg-white/85 text-primary shadow-soft" variant="secondary">
            StreetDog App
          </Badge>
          <div className="space-y-2">
            <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Help street dogs nearby without the scroll maze.
            </h1>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">
              Report faster, browse local dogs, and keep care updates anchored to one area.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="rounded-2xl" onClick={() => onNavigate('/report-dog')}>
              Report Dog
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => onNavigate('/dogs')}
            >
              Browse Dogs
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary/80">
              Nearby Dogs
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {selectedArea ? `Dogs around ${showingLabel}` : 'Dogs near you'}
            </h2>
          </div>
          <div className="rounded-full bg-secondary/35 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {landingDogs.length}
          </div>
        </div>

        {landingDogsError ? (
          <Card className="rounded-[1.4rem] border-amber-200/70 bg-amber-50/80 shadow-soft">
            <CardContent className="p-4 text-sm text-amber-800">{landingDogsError}</CardContent>
          </Card>
        ) : null}

        {isDogsLoading ? (
          <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="min-w-[272px] rounded-[1.75rem] border-white/70 bg-white/90 shadow-soft">
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {!isDogsLoading && visibleNearbyDogs.length ? (
          <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            {visibleNearbyDogs.map((dog) => (
              <div key={dog.id} className="w-[272px] min-w-[272px] sm:w-[300px] sm:min-w-[300px]">
                <DogCard
                  dog={dog}
                  area={buildDogArea(dog, areasById)}
                  onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {!isDogsLoading && !visibleNearbyDogs.length && !landingDogsError ? (
          <Card className="rounded-[1.5rem] border-dashed border-border bg-white/80">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/60 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No nearby dogs yet</p>
                <p className="text-sm text-muted-foreground">
                  Try another area or be the first to report a dog here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {urgentDog ? (
        <section>
          <Card className="overflow-hidden rounded-[1.75rem] border-rose-200/70 bg-[linear-gradient(145deg,rgba(255,244,242,0.98),rgba(255,250,247,0.96))] shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-soft">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-white text-rose-700" variant="secondary">
                      Urgent Need
                    </Badge>
                    <span className="text-xs font-medium text-rose-700/80">
                      {buildDogDisplayLocation(urgentDog)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {urgentDog.dog_name_or_temp_name || 'Dog needs attention'}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {urgentDog.health_notes ||
                        urgentDog.location_description ||
                        'This dog has an urgent care or food-related update.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="rounded-2xl" onClick={() => navigateTo(`/dogs/${urgentDog.id}`)}>
                      View Dog
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl bg-white/80"
                      onClick={() => onNavigate('/report-dog')}
                    >
                      Report Dog
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary/80">
            Community Snapshot
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick stats</h2>
        </div>

        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          <InlineMetric icon={PawPrint} label="Dogs" value={metrics.totalDogs} />
          <InlineMetric icon={Syringe} label="Vaccinated" value={metrics.vaccinatedDogs} />
          <InlineMetric
            icon={Wallet}
            label="Raised"
            value={`Rs. ${Number(metrics.expensesRaised).toLocaleString()}`}
          />
          <InlineMetric icon={Package} label="Food" value={metrics.inventoryFulfilled} />
        </div>
      </section>

      <LandingBottomNav onNavigate={onNavigate} />
    </main>
  )
}

function InlineMetric({ icon: Icon, label, value }) {
  return (
    <Card className="min-w-[164px] rounded-[1.4rem] border-white/70 bg-white/92 shadow-soft sm:min-w-0">
      <CardContent className="flex items-center gap-3 p-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/45 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-base font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function LandingBottomNav({ onNavigate }) {
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname || '/'
  const items = [
    { label: 'Home', path: '/', icon: House },
    { label: 'Report', path: '/report-dog', icon: ClipboardPlus },
    { label: 'Dogs', path: '/dogs', icon: PawPrint },
    { label: 'Food', path: '/inventory', icon: Package },
    { label: 'Profile', path: '/profile', icon: User },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-[linear-gradient(180deg,rgba(251,247,238,0.94),rgba(247,240,228,0.98))] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-16px_40px_rgba(90,70,45,0.12)] backdrop-blur-2xl sm:px-4">
      <div className="mx-auto grid max-w-5xl grid-cols-5 gap-2 rounded-[1.6rem] border border-white/75 bg-white/70 p-2 shadow-soft">
        {items.map((item) => {
          const isActive = currentPath === item.path
          const Icon = item.icon

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={[
                'flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 py-2 text-[0.7rem] font-semibold transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-foreground/72 hover:bg-white/90 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function buildDogArea(dog, areasById) {
  const legacyArea = dog.area_id ? areasById[dog.area_id] : null

  return {
    city: dog.city || legacyArea?.city || dog.tagged_area_pincode || 'Unknown city',
    name:
      dog.area_name ||
      dog.tagged_area_neighbourhood ||
      legacyArea?.name ||
      dog.tagged_society_name ||
      'Unknown area',
  }
}

function buildDogDisplayLocation(dog) {
  return (
    dog.tagged_area_neighbourhood ||
    dog.tagged_society_name ||
    dog.location_description ||
    dog.area_name ||
    'Location unavailable'
  )
}

function getLocationMessage(status, detectedLabel, showingLabel, societyName) {
  if (status === 'detecting') {
    return 'Detecting location'
  }

  if (status === 'detected') {
    return `Detected ${detectedLabel || showingLabel}`
  }

  if (status === 'society') {
    return `Focused on ${societyName}`
  }

  if (status === 'manual') {
    return `Showing ${showingLabel}`
  }

  if (status === 'saved') {
    return 'Using saved area'
  }

  return 'Location optional'
}

function isNeedsAttentionDog(dog) {
  const notes = `${dog.health_notes || ''} ${dog.notes || ''}`.toLowerCase()

  return (
    dog.health_status === 'medical_attention' ||
    dog.health_status === 'needs_food' ||
    notes.includes('medical') ||
    notes.includes('injur') ||
    notes.includes('food')
  )
}
