import { useEffect, useMemo, useState } from 'react'
import { PawPrint, Search } from 'lucide-react'
import { useDogs } from '../hooks/use-dogs'
import { listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { DogCard } from './DogCard'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
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

        if (!isMounted) {
          return
        }

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

    return () => {
      isMounted = false
    }
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
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <Badge className="w-fit" variant="secondary">
            Dog directory
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Dogs visible to your StreetDog App account
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Browse community records, scan location notes, and open the full dog profile when you
            are ready to help.
          </p>
        </div>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Find a dog faster</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Search by name, location, health notes, or area.
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-11"
                placeholder="Search dogs, area, or notes"
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
            <Button variant="outline" onClick={() => navigateTo('/dogs/new')}>
              Add a new dog record
            </Button>
          </CardContent>
        </Card>
      </div>

      {activeErrorMessage ? (
        <Card className="rounded-3xl border-red-200 bg-red-50/80">
          <CardContent className="p-5 text-sm text-red-700">{activeErrorMessage}</CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[340px] animate-pulse rounded-3xl border border-border/70 bg-white/70"
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
            <Card className="rounded-3xl border-dashed border-border bg-white/80 sm:col-span-2 xl:col-span-3">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                  <PawPrint className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {dogs.length === 0 ? 'No dogs visible yet' : 'No matches for that search'}
                </h3>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  {dogs.length === 0
                    ? 'Add the first dog in your area or wait for visible records to appear.'
                    : 'Try a broader search by area, location, or health notes.'}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </section>
  )
}
