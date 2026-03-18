import { useEffect, useMemo, useState } from 'react'
import { PawPrint, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useDogs } from '../hooks/use-dogs'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { DogCard } from './DogCard'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export function DogsPage() {
  const [areas, setAreas] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const {
    data: dogs = [],
    isLoading,
    error,
  } = useDogs()

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        setErrorMessage('')
        const nextAreas = await listAreas()
        if (!isMounted) return
        setAreas(
          nextAreas.reduce((grouped, area) => {
            grouped[area.id] = area
            return grouped
          }, {}),
        )
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load dog listing.')
        }
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [])

  const filteredDogs = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()
    return dogs.filter((dog) => {
      const area = areas[dog.area_id]
      const dogStatus = dog.status || dog.dog_status || 'active'
      const haystack = [
        dog.dog_name_or_temp_name,
        dog.location_description,
        dog.health_notes,
        dog.notes,
        area?.name,
        area?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesSearch = normalizedQuery ? haystack.includes(normalizedQuery) : true
      const matchesStatus = statusFilter === 'all' ? true : dogStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [areas, dogs, searchTerm, statusFilter])

  const activeErrorMessage =
    errorMessage || (error instanceof Error ? error.message : error ? 'Unable to load dog listing.' : '')

  return (
    <section className="space-y-6">
      {/* Page header */}
      <div className="grid gap-4 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <Badge className="w-fit" variant="secondary">
            Dog directory
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Dogs visible to your account
          </h1>
          <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
            Browse community records, scan location notes, and open the full dog profile when
            you&apos;re ready to help.
          </p>
        </div>

        {/* Search & filter card */}
        <div className="rounded-[1.75rem] border border-white/65 bg-white/92 p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Find a dog</p>
              <p className="text-xs text-muted-foreground">Search by name, area, or care notes</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search dogs, area, or notes…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="adopted">Adopted</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => navigateTo('/dogs/new')}>
              <Plus className="h-4 w-4" />
              Add a dog record
            </Button>
          </div>
        </div>
      </div>

      {activeErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700">
          {activeErrorMessage}
        </div>
      ) : null}

      {/* Results count */}
      {!isLoading && dogs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">{filteredDogs.length}</span>
            {filteredDogs.length !== dogs.length ? ` of ${dogs.length}` : ''} dog
            {filteredDogs.length !== 1 ? 's' : ''}
          </p>
          {searchTerm || statusFilter !== 'all' ? (
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => { setSearchTerm(''); setStatusFilter('all') }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}

      {/* Dog grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[320px] animate-pulse rounded-3xl border border-border/50 bg-white/65"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDogs.map((dog) => {
            const area = areas[dog.area_id]
            return (
              <DogCard
                key={dog.id}
                dog={dog}
                area={area}
                onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
              />
            )
          })}

          {filteredDogs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-border bg-white/80 p-12 text-center sm:col-span-2 xl:col-span-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
                <PawPrint className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">
                  {dogs.length === 0 ? 'No dogs visible yet' : 'No matches found'}
                </h3>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  {dogs.length === 0
                    ? 'Add the first dog in your area or wait for visible records to appear.'
                    : 'Try a broader search by area, location, or health notes.'}
                </p>
              </div>
              {dogs.length === 0 && (
                <Button onClick={() => navigateTo('/dogs/new')}>
                  <Plus className="h-4 w-4" />
                  Add first dog
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
