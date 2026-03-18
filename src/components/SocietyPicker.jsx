/**
 * SocietyPicker
 *
 * Self-contained society selection combobox for the auth flow.
 *
 * Flow:
 *  1. Mount → try navigator.geolocation
 *  2. Success → reverse-geocode (Google Maps) → extract pincode + neighbourhood
 *  3. Denied  → show Alert + manual pincode <Input>
 *  4. Active pincode present → fetch societies from Supabase (ilike search)
 *  5. User types → debounced re-fetch
 *  6. "Add '[name]'" option at bottom if no exact match found
 *  7. Creating → inserts into societies table (dedup-safe), selects it
 *  8. onSelect(society | null) fires on every change
 *
 * No external dependencies beyond what's already in the project.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { createSociety, searchSocieties } from '../lib/communityData'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'

// ─── helpers ────────────────────────────────────────────────

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''
const GEO_TIMEOUT_MS = 9_000

async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_KEY) return { pincode: '', neighbourhood: '' }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
  const res = await fetch(url)
  const json = await res.json()

  const components = json?.results?.[0]?.address_components ?? []

  const get = (...types) => {
    const match = components.find((c) => types.some((t) => c.types.includes(t)))
    return match?.long_name ?? ''
  }

  return {
    pincode: get('postal_code'),
    neighbourhood:
      get('sublocality_level_1') ||
      get('neighborhood') ||
      get('sublocality') ||
      get('administrative_area_level_3'),
  }
}

function useDebouncedValue(value, delay = 280) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── main component ─────────────────────────────────────────

/**
 * @param {{ onSelect: (society: object | null) => void }} props
 */
export function SocietyPicker({ onSelect }) {
  // geo state
  const [geoStatus, setGeoStatus] = useState('detecting') // detecting | resolved | denied | error | no-api
  const [geoError, setGeoError] = useState('')
  const [detectedPincode, setDetectedPincode] = useState('')
  const [detectedNeighbourhood, setDetectedNeighbourhood] = useState('')

  // manual fallback (when geo denied)
  const [manualPincode, setManualPincode] = useState('')

  // combobox state
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [societies, setSocieties] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selected, setSelected] = useState(null)

  // keyboard nav
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // active pincode is either auto-detected or user-typed
  const activePincode =
    geoStatus === 'resolved' ? detectedPincode : manualPincode.trim()

  const debouncedSearch = useDebouncedValue(searchTerm)
  const debouncedPincode = useDebouncedValue(activePincode, 400)

  // ── Geolocation on mount ──────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('no-api')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { pincode, neighbourhood } = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          )
          setDetectedPincode(pincode)
          setDetectedNeighbourhood(neighbourhood)
          setGeoStatus(pincode ? 'resolved' : 'no-api')
        } catch {
          // reverse geocode failed → treat as no-api so user can proceed
          setGeoStatus('no-api')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied')
        } else {
          setGeoError(err.message || 'Location unavailable.')
          setGeoStatus('error')
        }
      },
      { timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
    )
  }, [])

  // ── Fetch societies whenever active pincode or search changes ──
  const fetchSocieties = useCallback(async (pincode, term) => {
    if (!pincode && !term) {
      setSocieties([])
      return
    }
    try {
      setIsFetching(true)
      setFetchError('')
      const results = await searchSocieties(pincode, term)
      setSocieties(results)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to load societies.')
      setSocieties([])
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedPincode || debouncedSearch) {
      fetchSocieties(debouncedPincode, debouncedSearch)
    } else {
      setSocieties([])
    }
  }, [debouncedPincode, debouncedSearch, fetchSocieties])

  // ── Click-outside to close ────────────────────────────────
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── Keyboard navigation ───────────────────────────────────
  const allOptions = buildOptions(societies, searchTerm, activePincode)

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, allOptions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && allOptions[activeIndex]) {
          handleOptionClick(allOptions[activeIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  // ── Select / create handlers ──────────────────────────────
  function handleOptionClick(option) {
    if (option.type === 'create') {
      handleCreate(option.label)
    } else {
      commitSelection(option.society)
    }
  }

  async function handleCreate(name) {
    try {
      setIsCreating(true)
      setFetchError('')
      const coords = null // coordinates can be added later if GPS is available
      const newSociety = await createSociety({
        name,
        pincode: activePincode,
        neighbourhood: detectedNeighbourhood || null,
        coordinates: coords,
      })
      commitSelection(newSociety)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to create society.')
    } finally {
      setIsCreating(false)
    }
  }

  function commitSelection(society) {
    setSelected(society)
    setSearchTerm('')
    setIsOpen(false)
    setActiveIndex(-1)
    onSelect(society)
  }

  function clearSelection() {
    setSelected(null)
    setSearchTerm('')
    onSelect(null)
  }

  // ── Scroll active item into view ──────────────────────────
  useEffect(() => {
    if (!listRef.current || activeIndex < 0) return
    const item = listRef.current.children[activeIndex]
    item?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  // ─── Render ──────────────────────────────────────────────

  const isDetecting = geoStatus === 'detecting'
  const isDenied = geoStatus === 'denied'
  const isError = geoStatus === 'error'
  const isNoApi = geoStatus === 'no-api'
  const needsManualPincode = isDenied || isError || isNoApi
  const canSearch = Boolean(activePincode) || Boolean(debouncedSearch)

  return (
    <div className="space-y-3">
      {/* ── Section label ───────────────────────────── */}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary/70" />
        <p className="text-sm font-semibold text-foreground">Society</p>
        <span className="ml-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Optional
        </span>
      </div>

      {/* ── Detecting skeleton ──────────────────────── */}
      {isDetecting && (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Detecting your location…
          </div>
        </div>
      )}

      {/* ── Geo denied / error Alert ────────────────── */}
      {(isDenied || isError) && (
        <Alert variant="warning">
          <AlertTitle>
            {isDenied ? 'Location access denied' : 'Location unavailable'}
          </AlertTitle>
          <AlertDescription>
            {isDenied
              ? 'Enter your PIN code below to search for societies in your area.'
              : geoError || 'Could not determine your location. Enter your PIN code manually.'}
          </AlertDescription>
        </Alert>
      )}

      {/* ── No Maps API key info ─────────────────────── */}
      {isNoApi && !GOOGLE_MAPS_KEY && (
        <Alert variant="default">
          <AlertDescription>
            Auto-detect is unavailable. Enter your PIN code below to find your society.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Manual pincode input ─────────────────────── */}
      {(needsManualPincode || isNoApi) && !isDetecting && (
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Enter PIN code (e.g. 560001)"
            maxLength={6}
            value={manualPincode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              setManualPincode(v)
              // Reset selection when pincode changes
              if (selected) clearSelection()
            }}
          />
        </div>
      )}

      {/* ── Detected location banner ─────────────────── */}
      {geoStatus === 'resolved' && detectedPincode && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            Detected: <strong>{detectedNeighbourhood || detectedPincode}</strong>
            {detectedNeighbourhood ? ` · ${detectedPincode}` : ''}
          </span>
        </div>
      )}

      {/* ── Combobox (shown once we have a pincode or user just wants to search) */}
      {!isDetecting && (
        <div ref={containerRef} className="relative">
          {/* Trigger button / selected display */}
          {selected ? (
            <div className="flex h-11 w-full items-center justify-between rounded-2xl border border-input bg-white/90 px-4 shadow-sm">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary/70" />
                {selected.name}
                <span className="font-normal text-muted-foreground">· {selected.pincode}</span>
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm transition-all hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => {
                setIsOpen((o) => !o)
                setTimeout(() => inputRef.current?.focus(), 10)
              }}
              disabled={!canSearch && !activePincode && geoStatus !== 'resolved'}
            >
              <span className="text-muted-foreground">
                {canSearch ? 'Search for your society…' : 'Enter PIN code to search'}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Dropdown */}
          {isOpen && !selected && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
              {/* Search input inside dropdown */}
              <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={
                    activePincode
                      ? `Search in ${activePincode}…`
                      : 'Type society name…'
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setActiveIndex(-1)
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* List area */}
              <div
                ref={listRef}
                className="max-h-[240px] overflow-y-auto overflow-x-hidden p-2"
                role="listbox"
              >
                {isFetching && (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching…
                  </div>
                )}

                {fetchError && !isFetching && (
                  <p className="px-3 py-3 text-xs text-red-600">{fetchError}</p>
                )}

                {!isFetching && !fetchError && allOptions.length === 0 && canSearch && !searchTerm && (
                  <p className="px-3 py-3 text-xs text-muted-foreground">
                    No societies found for this PIN code yet.
                  </p>
                )}

                {!isFetching &&
                  allOptions.map((option, i) => (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      className={[
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        i === activeIndex
                          ? 'bg-secondary/60 text-foreground'
                          : 'text-foreground/80 hover:bg-secondary/40',
                      ].join(' ')}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => handleOptionClick(option)}
                      disabled={isCreating && option.type === 'create'}
                    >
                      {option.type === 'create' ? (
                        <>
                          {isCreating ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-primary" />
                          )}
                          <span>
                            Add{' '}
                            <strong className="font-semibold">&ldquo;{option.label}&rdquo;</strong>{' '}
                            as a new society
                          </span>
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 font-medium">{option.society.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.society.pincode}
                          </span>
                          {selected?.id === option.society.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </>
                      )}
                    </button>
                  ))}

                {/* Prompt to type if no pincode and no search yet */}
                {!isFetching && !fetchError && !canSearch && !searchTerm && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    Start typing a society name to search…
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Skip helper text ─────────────────────────── */}
      {!selected && (
        <p className="text-[0.72rem] leading-4 text-muted-foreground">
          You can skip this and add your society from your profile later.
        </p>
      )}
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────

/**
 * Build the flat option list shown in the dropdown.
 * Appends an "Add as new society" item when:
 *  - the user has typed something
 *  - there is no exact case-insensitive name match in results
 *  - there is an active pincode to attach it to
 */
function buildOptions(societies, searchTerm, activePincode) {
  const societyOptions = societies.map((s) => ({
    key: s.id,
    type: 'existing',
    society: s,
  }))

  const trimmed = searchTerm.trim()
  const hasExactMatch = societies.some(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
  )

  if (trimmed.length >= 2 && !hasExactMatch && activePincode) {
    societyOptions.push({
      key: `create-${trimmed}`,
      type: 'create',
      label: trimmed,
    })
  }

  return societyOptions
}
