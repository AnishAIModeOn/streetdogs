import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  ClipboardPlus,
  ChevronDown,
  Heart,
  HeartHandshake,
  House,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PawPrint,
  Syringe,
  User,
  Wallet,
} from 'lucide-react'
import { findMatchingAreaId, normalizeAreaLabel, useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { CommunityStats } from './CommunityStats'
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
  const [locationModalKey, setLocationModalKey] = useState(0)
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
  const locationDraft = useMemo(
    () => ({
      areaInput: flow.areaInput,
      pincode: flow.pincode,
      selectedSociety: flow.selectedSociety,
      manual: flow.manual,
      detectedLabel: flow.detectedLabel,
      detectedNeighbourhood: flow.effectiveNeighbourhood,
      societyDraftName: flow.societyDraftName,
    }),
    [
      flow.areaInput,
      flow.detectedLabel,
      flow.effectiveNeighbourhood,
      flow.manual,
      flow.pincode,
      flow.selectedSociety,
      flow.societyDraftName,
    ],
  )

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

  const visibleNearbyDogs = landingDogs.slice(0, 4)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-3 py-2 pb-28 sm:px-4 sm:py-3 sm:pb-32">
      <section className="sticky top-2 z-30">
        <button
          type="button"
          onClick={() => {
            setLocationModalKey((current) => current + 1)
            setIsLocationModalOpen(true)
          }}
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

      {isLocationModalOpen ? (
        <LocationSelectionModal
          key={locationModalKey}
          open={isLocationModalOpen}
          initialLocation={locationDraft}
          onClose={() => setIsLocationModalOpen(false)}
          onApply={(snapshot) => {
            flow.applySnapshot(snapshot)
            setIsLocationModalOpen(false)
          }}
        />
      ) : null}

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
          <HeroActionGrid onNavigate={onNavigate} />
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
          {landingDogs.length > 4 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-primary hover:bg-transparent"
              onClick={() => onNavigate('/dogs')}
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {landingDogsError ? (
          <Card className="rounded-[1.4rem] border-amber-200/70 bg-amber-50/80 shadow-soft">
            <CardContent className="p-4 text-sm text-amber-800">{landingDogsError}</CardContent>
          </Card>
        ) : null}

        {isDogsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-[1.75rem] border-white/70 bg-white/90 shadow-soft">
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
          <div className="grid grid-cols-2 gap-3">
            {visibleNearbyDogs.map((dog) => (
              <div key={dog.id}>
                <DogCard
                  dog={dog}
                  area={buildDogArea(dog, areasById)}
                  compact
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

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary/80">
            Community Snapshot
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Quick stats</h2>
        </div>

        <CommunityStats
          stats={[
            { icon: PawPrint, label: 'Dogs', value: metrics.totalDogs },
            { icon: Syringe, label: 'Vaccinated', value: metrics.vaccinatedDogs },
            { icon: Wallet, label: 'Raised', value: `Rs. ${Number(metrics.expensesRaised).toLocaleString()}` },
            { icon: ClipboardPlus, label: 'Tasks', value: metrics.inventoryFulfilled },
          ]}
        />
      </section>

      <LandingBottomNav onNavigate={onNavigate} />
    </main>
  )
}

function HeroActionGrid({ onNavigate }) {
  const actions = [
    {
      label: 'Report Dog',
      icon: PawPrint,
      onClick: () => onNavigate('/report-dog'),
      className:
        'border-primary/15 bg-[linear-gradient(180deg,rgba(244,176,93,0.18),rgba(255,255,255,0.96))] text-foreground',
      iconClassName: 'bg-primary text-primary-foreground shadow-soft',
    },
    {
      label: 'Raise Expense',
      icon: Wallet,
      onClick: () => onNavigate('/signin'),
      className:
        'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,244,236,0.96))] text-foreground',
      iconClassName: 'bg-secondary/70 text-primary',
    },
    {
      label: 'Contribute',
      icon: HeartHandshake,
      onClick: () => onNavigate('/signin'),
      className:
        'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,230,0.96))] text-foreground',
      iconClassName: 'bg-secondary/70 text-primary',
    },
    {
      label: 'Adopt / Help',
      icon: Heart,
      onClick: () => onNavigate('/signin'),
      className:
        'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,243,235,0.96))] text-foreground',
      iconClassName: 'bg-secondary/70 text-primary',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {actions.map((action) => {
        const Icon = action.icon

        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={[
              'aspect-square w-full rounded-2xl border p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 active:scale-[0.98]',
              'flex flex-col justify-between gap-3',
              action.className,
            ].join(' ')}
          >
            <span
              className={[
                'flex h-11 w-11 items-center justify-center rounded-2xl',
                action.iconClassName,
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold leading-5 text-foreground sm:text-[0.95rem]">
              {action.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LocationSelectionModal({ open, initialLocation, onClose, onApply }) {
  const [isConfirmDetectOpen, setIsConfirmDetectOpen] = useState(false)
  const scrollViewportRef = useRef(null)
  const draftFlow = useAreaSocietyFlow({
    initialAreaLabel: initialLocation?.areaInput ?? '',
    initialPincode: initialLocation?.pincode ?? '',
    initialSociety: initialLocation?.selectedSociety ?? null,
    autoDetect: false,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    window.setTimeout(() => {
      scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 60)
  }, [open])

  const draftSelectedArea = draftFlow.areaContext.neighbourhood || draftFlow.areaContext.areaLabel
  const hasDraftSelection = Boolean(draftSelectedArea || draftFlow.selectedSociety?.name)
  const draftShowingLabel = normalizeAreaLabel(draftSelectedArea) || 'Select area'
  const draftStatus = getDraftLocationStatus(draftFlow)

  async function handleDetectLocation() {
    setIsConfirmDetectOpen(false)
    await draftFlow.detectLocation()
    scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function requestDetectLocation() {
    if (hasDraftSelection) {
      setIsConfirmDetectOpen(true)
      return
    }

    handleDetectLocation()
  }

  function applyLocationChanges() {
    onApply({
      areaInput: draftFlow.areaInput,
      pincode: draftFlow.pincode,
      selectedSociety: draftFlow.selectedSociety,
      manual: draftFlow.manual,
      detectedLabel: draftFlow.detectedLabel,
      detectedNeighbourhood: draftFlow.effectiveNeighbourhood,
      societyDraftName: draftFlow.societyDraftName,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="inset-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border sm:p-0">
          <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(251,247,238,0.98),rgba(255,255,255,0.98))] sm:max-h-[90vh] sm:rounded-[2rem]">
            <DialogHeader className="border-b border-white/70 px-4 pb-4 pt-6 pr-14 sm:px-6">
              <DialogTitle>Choose location</DialogTitle>
              <DialogDescription>
                Pick your area, optionally add your society, then apply the change.
              </DialogDescription>
            </DialogHeader>

            <div
              ref={scrollViewportRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:px-6 sm:pb-24"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full bg-secondary/45 px-2.5 py-1 text-[0.68rem]">
                    {getLocationMessage(
                      draftStatus,
                      draftFlow.detectedLabel,
                      draftShowingLabel,
                      draftFlow.selectedSociety?.name,
                    )}
                  </Badge>
                  {draftFlow.selectedSociety?.name ? (
                    <span className="truncate rounded-full bg-white/75 px-2.5 py-1">
                      Society: {draftFlow.selectedSociety.name}
                    </span>
                  ) : null}
                </div>

                <div className="rounded-[1.35rem] border border-white/75 bg-secondary/15 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary/80" />
                    <p className="text-sm font-semibold text-foreground">Area</p>
                  </div>
                  <div className="relative min-w-0">
                    <Input
                      value={draftFlow.areaInput}
                      placeholder="Select area"
                      onChange={(event) => draftFlow.setAreaInput(event.target.value)}
                      onFocus={() => draftFlow.setShowSuggestions(true)}
                      onBlur={() => window.setTimeout(() => draftFlow.setShowSuggestions(false), 150)}
                      autoComplete="off"
                      className="h-11 rounded-2xl border-white/75 bg-white/92 pr-10 text-sm shadow-none"
                    />
                    {draftFlow.isFetchingSuggestions ? (
                      <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}
                    {draftFlow.showSuggestions && draftFlow.areaSuggestions.length > 0 ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
                        {draftFlow.areaSuggestions.map((suggestion, index) => (
                          <button
                            key={`${suggestion.neighbourhood}-${suggestion.pincode || index}`}
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/35"
                            onMouseDown={() => draftFlow.selectSuggestion(suggestion)}
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
                    pincode={draftFlow.areaContext.pincode}
                    neighbourhood={draftFlow.areaContext.neighbourhood}
                    onSelect={draftFlow.setSelectedSociety}
                    draftName={draftFlow.societyDraftName}
                    onDraftChange={draftFlow.setSocietyDraftName}
                    deferCreate
                    dropdownPosition="top"
                    scrollOnOpen
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-2xl"
                  onClick={requestDetectLocation}
                >
                  {draftFlow.detecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting location
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      Detect location
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border-t border-white/75 bg-white/92 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1 rounded-2xl" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1 rounded-2xl" onClick={applyLocationChanges}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDetectOpen} onOpenChange={setIsConfirmDetectOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-[1.75rem] p-5">
          <DialogHeader className="pr-8">
            <DialogTitle>Replace current selection?</DialogTitle>
            <DialogDescription>
              Detecting your location will replace the area and clear the current society selection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 rounded-2xl"
              onClick={() => setIsConfirmDetectOpen(false)}
            >
              Keep current
            </Button>
            <Button type="button" className="flex-1 rounded-2xl" onClick={handleDetectLocation}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

function getDraftLocationStatus(flow) {
  if (flow.detecting) {
    return 'detecting'
  }

  if (flow.detectedLabel && !flow.manual) {
    return 'detected'
  }

  if (flow.selectedSociety?.name) {
    return 'society'
  }

  if (flow.areaContext.neighbourhood || flow.areaContext.areaLabel) {
    return 'manual'
  }

  return 'idle'
}
