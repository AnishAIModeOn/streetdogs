import { useEffect, useMemo, useState } from 'react'
import { Crosshair, Loader2, MapPin, PawPrint } from 'lucide-react'
import { findMatchingAreaId, useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { DogCard } from './DogCard'
import { HeroImageCarousel } from './HeroImageCarousel'
import { SocietyPicker } from './SocietyPicker'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'

const LANDING_LOCATION_KEY = 'streetdog-landing-location'

const heroImages = [
  {
    src: '/landing/landing-dog-1.jpg',
    alt: 'Street dog resting calmly in warm afternoon light',
    name: 'Milo',
    location: 'Bandra West, Mumbai',
    summary: 'Local sightings and care updates help neighbours respond faster.',
    badges: ['Vaccinated', 'Friendly'],
  },
  {
    src: '/landing/landing-dog-2.jpg',
    alt: 'Puppy portrait with a warm, soft background',
    name: 'Luna',
    location: 'Koramangala, Bengaluru',
    summary: 'A clear local feed makes it easier to spot dogs that need food or follow-up.',
    badges: ['Needs Food'],
  },
  {
    src: '/landing/landing-dog-3.jpg',
    alt: 'Street dog looking toward nearby volunteers',
    name: 'Rocky',
    location: 'Adyar, Chennai',
    summary: 'Shared neighbourhood context keeps reports useful and actionable.',
    badges: ['Medical Attention'],
  },
]

function readStoredLocation() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LANDING_LOCATION_KEY)
    return raw ? JSON.parse(raw) : null
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
  const showingLabel = selectedArea || 'your community'
  const matchedAreaId = useMemo(
    () => findMatchingAreaId(areas, flow.areaContext.neighbourhood || flow.areaContext.areaLabel),
    [areas, flow.areaContext.areaLabel, flow.areaContext.neighbourhood],
  )

  useEffect(() => {
    let isMounted = true

    const loadLandingData = async () => {
      try {
        const params = new URLSearchParams()
        if (matchedAreaId) {
          params.set('areaId', matchedAreaId)
        }
        if (flow.areaContext.neighbourhood || flow.areaContext.areaLabel) {
          params.set('area', flow.areaContext.neighbourhood || flow.areaContext.areaLabel)
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
    flow.areaContext.areaLabel,
    flow.areaContext.neighbourhood,
    flow.areaContext.pincode,
    flow.areaContext.societyId,
    flow.areaContext.societyName,
  ])

  useEffect(() => {
    let isMounted = true

    const loadAreas = async () => {
      try {
        const areas = await listAreas()
        if (!isMounted) {
          return
        }

        setAreas(areas)
        setAreasById(
          areas.reduce((accumulator, area) => {
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
        areaLabel: selectedArea,
        pincode: flow.areaContext.pincode,
        selectedSociety: flow.selectedSociety,
      }),
    )
  }, [flow.areaContext.pincode, flow.selectedSociety, selectedArea])

  const filteredDogs = landingDogs

  const visibleNearbyDogs = filteredDogs.slice(0, 12)
  const attentionDogs = filteredDogs.filter(isNeedsAttentionDog).slice(0, 6)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
      <section className="rounded-[1.6rem] border border-white/70 bg-white/90 px-3 py-3 shadow-soft sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Badge className="bg-secondary/60 text-primary" variant="secondary">
              Your area
            </Badge>
            <div className="min-w-0 rounded-full bg-secondary/35 px-3 py-1.5 text-sm text-foreground">
              <span className="font-medium">Area:</span> {showingLabel}
            </div>
            {selectedSociety?.name ? (
              <div className="min-w-0 rounded-full bg-white px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
                <span className="font-medium text-foreground">Society:</span> {selectedSociety.name}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {flow.detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 text-primary" />}
            <span>{getLocationMessage(locationStatus, flow.detectedLabel, showingLabel, selectedSociety?.name)}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,300px)]">
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-2xl bg-secondary/45 shadow-sm"
            onClick={() => {
              setLocationStatus('detecting')
              flow.detectLocation()
            }}
          >
            {flow.detecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                Detect or change
              </>
            )}
          </Button>

          <div className="relative min-w-0">
            <Input
              value={flow.areaInput}
              placeholder="Type area"
              onChange={(event) => flow.setAreaInput(event.target.value)}
              onFocus={() => flow.setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => flow.setShowSuggestions(false), 150)}
              autoComplete="off"
              className="h-11 rounded-2xl border-white/70 bg-secondary/15 pr-10 shadow-sm"
            />
            {flow.isFetchingSuggestions ? (
              <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
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
                    <span className="flex-1">{suggestion.neighbourhood || suggestion.pincode}</span>
                    {suggestion.pincode ? (
                      <span className="text-xs text-muted-foreground">{suggestion.pincode}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 rounded-[1.1rem] border border-white/70 bg-secondary/18 p-2.5 shadow-sm">
            <SocietyPicker
              pincode={flow.areaContext.pincode}
              neighbourhood={flow.areaContext.neighbourhood}
              onSelect={flow.setSelectedSociety}
              deferCreate
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-hero-wash p-3 shadow-float sm:p-5 lg:p-6">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_72%)]" />
        <div className="absolute -right-10 top-1/3 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative grid gap-3 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-stretch">
          <div className="order-2 flex flex-col justify-center gap-4 rounded-[1.65rem] border border-white/80 bg-white/88 p-4 shadow-soft backdrop-blur-sm sm:gap-5 sm:rounded-[2rem] sm:p-7 lg:order-1 lg:p-8">
            <Badge className="w-fit bg-white/85 text-primary shadow-soft" variant="secondary">
              StreetDog App
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-xl text-3xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Help street dogs in your area
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                See dogs nearby, report sightings, and support local care.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="rounded-2xl shadow-float" onClick={() => onNavigate('/report-dog')}>
                Report a dog
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="rounded-2xl shadow-soft"
                onClick={() => onNavigate('/dogs')}
              >
                Browse dogs
              </Button>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-primary/10 bg-secondary/35 px-4 py-3 shadow-soft">
                Start with your location, then see dogs that matter nearby.
              </div>
              <div className="rounded-[1.25rem] border border-primary/10 bg-secondary/35 px-4 py-3 shadow-soft">
                Reports, sightings, and care notes stay grounded in place.
              </div>
            </div>
          </div>

          <HeroImageCarousel slides={heroImages} className="order-1 lg:order-2 lg:self-stretch" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <Badge variant="outline">Dogs near you</Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Dogs near you</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {selectedArea
                ? `Showing dogs that match ${selectedSociety?.name ? `${selectedSociety.name} and ` : ''}${showingLabel}.`
                : 'Pick an area above to load the most relevant dogs first.'}
            </p>
          </div>
          <div className="rounded-full bg-secondary/35 px-3 py-1.5 text-sm font-medium text-muted-foreground">
            {filteredDogs.length} match{filteredDogs.length === 1 ? '' : 'es'}
          </div>
        </div>

        {landingDogsError ? (
          <Card className="rounded-[1.25rem] border-amber-200/70 bg-amber-50/80 shadow-soft">
            <CardContent className="p-4 text-sm text-amber-800">
              {landingDogsError}
            </CardContent>
          </Card>
        ) : null}

        {isDogsLoading ? (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="min-w-[280px] rounded-[1.75rem] border-white/70 bg-white/90 shadow-soft">
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
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {visibleNearbyDogs.map((dog) => (
              <div key={dog.id} className="min-w-[280px] max-w-[320px] flex-1">
                <DogCard
                  dog={dog}
                  area={buildDogArea(dog, areasById)}
                  onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {!isDogsLoading && !visibleNearbyDogs.length ? (
          <Card className="rounded-[1.75rem] border-dashed border-border bg-white/80">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60 text-primary shadow-soft">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">No dogs matched this location yet</h3>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Try a nearby area, clear the society, or be the first to report a dog here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {attentionDogs.length ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <Badge variant="outline">Needs attention</Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Needs attention</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Dogs with urgent food or medical notes in the current location context.
            </p>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {attentionDogs.map((dog) => (
              <div key={dog.id} className="min-w-[280px] max-w-[320px] flex-1">
                <DogCard
                  dog={dog}
                  area={buildDogArea(dog, areasById)}
                  onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pb-6">
        <div className="space-y-2">
          <Badge variant="outline">Community snapshot</Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Community snapshot</h2>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 xl:grid-cols-4">
          <CompactMetric label="Total dogs" value={metrics.totalDogs} />
          <CompactMetric label="Vaccinated" value={metrics.vaccinatedDogs} />
          <CompactMetric
            label="Expenses raised"
            value={`Rs. ${Number(metrics.expensesRaised).toLocaleString()}`}
          />
          <CompactMetric label="Inventory fulfilled" value={metrics.inventoryFulfilled} />
        </div>
      </section>
    </main>
  )
}

function CompactMetric({ label, value }) {
  return (
    <Card className="min-w-[180px] rounded-[1.5rem] border-white/70 bg-white/90 shadow-soft sm:min-w-0">
      <CardContent className="space-y-1 p-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
      </CardContent>
    </Card>
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

function getLocationMessage(status, detectedLabel, showingLabel, societyName) {
  if (status === 'detecting') {
    return 'Detecting your location'
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
    return 'Using your saved area'
  }

  return 'Location is optional'
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
