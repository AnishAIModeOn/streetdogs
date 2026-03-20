import { useEffect, useMemo, useState } from 'react'
import { Crosshair, Loader2, MapPin, PawPrint } from 'lucide-react'
import { useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { useDogs } from '../hooks/use-dogs'
import { navigateTo } from '../lib/navigation'
import { DogCard } from './DogCard'
import { SocietyPicker } from './SocietyPicker'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'

const LANDING_LOCATION_KEY = 'streetdog-landing-location'

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

  const selectedArea = flow.effectiveNeighbourhood || flow.areaLabel
  const dogsQuery = useDogs(selectedArea ? { areaName: selectedArea } : {})

  useEffect(() => {
    let isMounted = true

    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/landing-metrics')
        const payload = await response.json()

        if (isMounted && response.ok && payload?.metrics) {
          setMetrics(payload.metrics)
        }
      } catch {
        // Keep the default snapshot if metrics are unavailable.
      }
    }

    loadMetrics()

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

    if (selectedArea) {
      setLocationStatus('manual')
      return
    }

    setLocationStatus('idle')
  }, [flow.detectedLabel, flow.detecting, flow.manual, selectedArea])

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

  const nearbyDogs = dogsQuery.data ?? []
  const attentionDogs = nearbyDogs.filter(isNeedsAttentionDog).slice(0, 6)
  const visibleNearbyDogs = nearbyDogs.slice(0, 12)
  const showingLabel = selectedArea || 'your community'

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit bg-secondary/60 text-primary" variant="secondary">
              Your area
            </Badge>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Your area</span>
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose a neighbourhood first so the homepage can show nearby dogs and the right local context.
              </p>
            </div>
          </div>

          <div className="rounded-full bg-secondary/45 px-3 py-1.5 text-sm font-medium text-muted-foreground">
            Showing dogs in <span className="text-foreground">{showingLabel}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,320px)]">
          <Button
            type="button"
            size="lg"
            className="h-12 justify-center rounded-2xl shadow-soft"
            onClick={() => {
              setLocationStatus('detecting')
              flow.detectLocation()
            }}
          >
            {flow.detecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting area
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                Detect location
              </>
            )}
          </Button>

          <div className="relative min-w-0">
            <Input
              value={flow.areaInput}
              placeholder="Type your area"
              onChange={(event) => flow.setAreaInput(event.target.value)}
              onFocus={() => flow.setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => flow.setShowSuggestions(false), 150)}
              autoComplete="off"
              className="h-12 rounded-2xl border-white/70 bg-secondary/15 pr-10 shadow-sm"
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

          <div className="min-w-0 rounded-[1.25rem] border border-white/70 bg-secondary/20 p-3 shadow-sm">
            <SocietyPicker
              pincode={flow.areaContext.pincode}
              neighbourhood={flow.areaContext.neighbourhood}
              onSelect={flow.setSelectedSociety}
              deferCreate={false}
            />
          </div>
        </div>

        <div className="mt-3 min-h-6 text-sm text-muted-foreground">
          {flow.detecting ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-4 w-40 rounded-full" />
            </div>
          ) : null}
          {!flow.detecting && locationStatus === 'detected' ? (
            <p>Detected area: {flow.detectedLabel}</p>
          ) : null}
          {!flow.detecting && locationStatus === 'manual' ? (
            <p>Showing dogs in {showingLabel}</p>
          ) : null}
          {!flow.detecting && locationStatus === 'saved' ? (
            <p>Using your last selected area to keep things fast.</p>
          ) : null}
          {!flow.detecting && locationStatus === 'idle' ? (
            <p>Location access is optional. You can type your neighbourhood anytime.</p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-hero-wash px-4 py-5 shadow-float sm:px-6 sm:py-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="space-y-4">
            <Badge className="w-fit bg-white/90 text-primary shadow-soft" variant="secondary">
              StreetDog App
            </Badge>
            <div className="space-y-2">
              <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
                Help street dogs in your area
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
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
          </div>

          <Card className="rounded-[1.75rem] border-white/70 bg-white/88 shadow-soft">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <PawPrint className="h-4 w-4" />
                Local action
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SnapshotTile label="Nearby dogs" value={visibleNearbyDogs.length} />
                <SnapshotTile label="Need attention" value={attentionDogs.length} />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Start with your location, then jump straight into dogs that need visibility nearby.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Badge variant="outline">Dogs near you</Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Dogs near you</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {selectedArea
              ? `Showing the latest dogs we have for ${showingLabel}.`
              : 'Pick an area above or browse recent dogs from the wider community.'}
          </p>
        </div>

        {dogsQuery.isLoading ? (
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

        {!dogsQuery.isLoading && visibleNearbyDogs.length ? (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {visibleNearbyDogs.map((dog) => (
              <div key={dog.id} className="min-w-[280px] max-w-[320px] flex-1">
                <DogCard
                  dog={dog}
                  area={{ city: dog.city || 'Unknown city', name: dog.area_name || 'Unknown area' }}
                  onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {!dogsQuery.isLoading && !visibleNearbyDogs.length ? (
          <Card className="rounded-[1.75rem] border-dashed border-border bg-white/80">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/60 text-primary shadow-soft">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">No dogs in this area yet</h3>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Try another neighbourhood or be the first to report a dog here.
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
              Highlighting dogs with urgent food or medical notes in the current area.
            </p>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {attentionDogs.map((dog) => (
              <div key={dog.id} className="min-w-[280px] max-w-[320px] flex-1">
                <DogCard
                  dog={dog}
                  area={{ city: dog.city || 'Unknown city', name: dog.area_name || 'Unknown area' }}
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

function SnapshotTile({ label, value }) {
  return (
    <div className="rounded-[1.1rem] border border-primary/10 bg-secondary/35 p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
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
