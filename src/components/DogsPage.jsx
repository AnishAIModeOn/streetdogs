import { useEffect, useMemo, useState } from 'react'
import { Filter, PawPrint } from 'lucide-react'
import { useDogs } from '../hooks/use-dogs'
import { findMatchingAreaId, normalizeAreaLabel } from '../hooks/use-area-society-flow'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { DogFilters } from './DogFilters'
import { DogCard } from './DogCard'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

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

export function DogsPage({ currentUser = null }) {
  const [areas, setAreas] = useState([])
  const [areasById, setAreasById] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [toggles, setToggles] = useState({
    recent: false,
    needsHelp: false,
    withPhoto: false,
  })
  const persistedLocation = useMemo(() => readStoredLocation(), [])
  const normalizedAreaLabel = normalizeAreaLabel(persistedLocation?.areaLabel)

  useEffect(() => {
    let isMounted = true

    const loadAreas = async () => {
      try {
        setErrorMessage('')
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
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load dog listing.')
        }
      }
    }

    loadAreas()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setSelectedSociety(persistedLocation?.selectedSociety ?? null)
  }, [persistedLocation])

  const matchedAreaId = useMemo(
    () => findMatchingAreaId(areas, normalizedAreaLabel),
    [areas, normalizedAreaLabel],
  )
  const canonicalArea = matchedAreaId ? areasById[matchedAreaId] : null
  const areaLabel = canonicalArea?.name || normalizedAreaLabel || 'All visible dogs'
  const areaNeighbourhood = canonicalArea?.name || normalizedAreaLabel || ''
  const areaPincode = persistedLocation?.pincode || ''

  const queryFilters = useMemo(
    () => ({
      areaName: normalizedAreaLabel || undefined,
      pincode: areaPincode || undefined,
      societyId: selectedSociety?.id || undefined,
      societyName: selectedSociety?._pending ? selectedSociety.name : undefined,
    }),
    [areaPincode, normalizedAreaLabel, selectedSociety],
  )

  const {
    data: dogs = [],
    isLoading,
    error,
  } = useDogs(queryFilters)

  const filteredDogs = useMemo(
    () =>
      dogs.filter((dog) => {
        const notes = `${dog.health_notes || ''} ${dog.notes || ''} ${dog.ai_injuries || ''}`.toLowerCase()
        const isRecentlyAdded =
          dog.created_at ? Date.now() - new Date(dog.created_at).getTime() <= 1000 * 60 * 60 * 24 * 14 : false

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && (dog.status || dog.dog_status || 'active') === 'active') ||
          (statusFilter === 'vaccinated' && dog.vaccination_status === 'vaccinated') ||
          (statusFilter === 'neutered' && dog.sterilization_status === 'sterilized') ||
          (statusFilter === 'injured' &&
            (dog.health_status === 'medical_attention' ||
              notes.includes('injur') ||
              notes.includes('medical') ||
              notes.includes('wound')))

        const matchesNeedsHelp =
          !toggles.needsHelp ||
          dog.health_status === 'needs_food' ||
          dog.health_status === 'medical_attention' ||
          notes.includes('help') ||
          notes.includes('food') ||
          notes.includes('injur') ||
          notes.includes('medical')

        const matchesPhoto = !toggles.withPhoto || Boolean(dog.photo_url)
        const matchesRecent = !toggles.recent || isRecentlyAdded

        return matchesStatus && matchesNeedsHelp && matchesPhoto && matchesRecent
      }),
    [dogs, statusFilter, toggles],
  )

  const activeErrorMessage =
    errorMessage ||
    (error instanceof Error ? error.message : error ? 'Unable to load dog listing.' : '')

  return (
    <section className="space-y-5">
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-5 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <Badge className="w-fit bg-white/85 text-primary shadow-soft" variant="secondary">
            Dog directory
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Dogs around {areaLabel}
            </h1>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">
              Explore the full local feed with quick filters for care status, recent additions,
              and dogs that need help.
            </p>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,233,0.95))] p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/55 text-primary">
              <Filter className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">View all dogs</p>
              <p className="text-xs text-muted-foreground">
                Compact cards, smarter filters, and no horizontal scroll.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DogFilters
        areaLabel={areaLabel}
        pincode={areaPincode}
        neighbourhood={areaNeighbourhood}
        selectedSociety={selectedSociety}
        onSocietyChange={setSelectedSociety}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        toggles={toggles}
        onToggleChange={(key, value) =>
          setToggles((current) => ({
            ...current,
            [key]: value,
          }))
        }
      />

      {activeErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700">
          {activeErrorMessage}
        </div>
      ) : null}

      {!isLoading ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredDogs.length}</span> dog
            {filteredDogs.length === 1 ? '' : 's'}
          </p>
          <Button
            type="button"
            variant="ghost"
            className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-primary hover:bg-transparent"
            onClick={() => {
              setSelectedSociety(persistedLocation?.selectedSociety ?? null)
              setStatusFilter('all')
              setToggles({ recent: false, needsHelp: false, withPhoto: false })
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[0.82] animate-pulse rounded-[1.75rem] border border-border/50 bg-white/65"
            />
          ))}
        </div>
      ) : filteredDogs.length ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDogs.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              area={areasById[dog.area_id]}
              compact
              onViewDetails={() => navigateTo(currentUser ? `/dogs/${dog.id}` : '/signin')}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-border bg-white/80 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
            <PawPrint className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-foreground">No dogs match these filters</h3>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Try another status or clear the optional filters to see more dogs in this area.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setStatusFilter('all')}>
            Show all dogs
          </Button>
        </div>
      )}
    </section>
  )
}
