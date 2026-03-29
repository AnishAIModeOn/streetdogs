/**
 * SocietyPicker
 *
 * Society selection combobox. Pincode is passed in as a prop (detected/entered in AuthPage).
 * - Fetches societies filtered by pincode + optional name search
 * - "Add '[name]'" option when no exact match found
 * - deferCreate=true: skips DB insert, returns _pending object for post-auth creation
 * - onSelect(society | null) fires on every change
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { createSociety, searchSocieties } from '../lib/communityData'

function useDebouncedValue(value, delay = 280) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function SocietyPicker({ pincode = '', neighbourhood = '', onSelect, deferCreate = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [societies, setSocieties] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selected, setSelected] = useState(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [autoSelectSuppressedContext, setAutoSelectSuppressedContext] = useState('')

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const debouncedSearch = useDebouncedValue(searchTerm)
  const debouncedPincode = useDebouncedValue(pincode, 400)
  const debouncedNeighbourhood = useDebouncedValue(neighbourhood, 400)
  const areaContextKey = `${debouncedPincode}::${debouncedNeighbourhood.trim().toLowerCase()}`

  useEffect(() => {
    setSelected(null)
    onSelect(null)
    setSocieties([])
    setSearchTerm('')
    setAutoSelectSuppressedContext('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPincode, debouncedNeighbourhood])

  const fetchSocieties = useCallback(async (pc, nb, term) => {
    if (!pc && !nb && !term) {
      setSocieties([])
      return
    }

    try {
      setIsFetching(true)
      setFetchError('')
      const results = await searchSocieties(pc, term, nb)
      setSocieties(results)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to load societies.')
      setSocieties([])
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedPincode || debouncedNeighbourhood || debouncedSearch) {
      fetchSocieties(debouncedPincode, debouncedNeighbourhood, debouncedSearch)
    } else {
      setSocieties([])
    }
  }, [debouncedPincode, debouncedNeighbourhood, debouncedSearch, fetchSocieties])

  useEffect(() => {
    if (isFetching || fetchError) {
      return
    }

    if (societies.length !== 1) {
      return
    }

    if (selected?.id === societies[0]?.id) {
      return
    }

    if (!debouncedSearch.trim() && autoSelectSuppressedContext === areaContextKey) {
      return
    }

    commitSelection(societies[0])
  }, [
    areaContextKey,
    autoSelectSuppressedContext,
    debouncedSearch,
    fetchError,
    isFetching,
    selected?.id,
    societies,
  ])

  useEffect(() => {
    function onOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [])

  const allOptions = buildOptions(societies, searchTerm)

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

  function handleOptionClick(option) {
    if (option.type === 'create') {
      handleCreate(option.label)
    } else {
      commitSelection(option.society)
    }
  }

  async function handleCreate(name) {
    if (deferCreate) {
      commitSelection({
        id: null,
        name: name.trim(),
        pincode,
        neighbourhood: neighbourhood || null,
        _pending: true,
      })
      return
    }

    try {
      setIsCreating(true)
      setFetchError('')
      const newSociety = await createSociety({
        name,
        pincode,
        neighbourhood: neighbourhood || null,
        coordinates: null,
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
    setIsOpen(false)
    setActiveIndex(-1)
    setAutoSelectSuppressedContext(areaContextKey)
    onSelect(null)
  }

  useEffect(() => {
    if (!listRef.current || activeIndex < 0) return
    listRef.current.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary/70" />
        <p className="text-sm font-semibold text-foreground">Society</p>
        <span className="ml-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Optional
        </span>
      </div>

      <div ref={containerRef} className="relative min-w-0">
        {selected ? (
          <div className="flex min-h-12 w-full items-start justify-between gap-3 rounded-2xl border border-input bg-white/90 px-4 py-3 shadow-sm">
            <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
              <span className="flex min-w-0 items-start gap-2">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="min-w-0 break-words">{selected.name}</span>
              </span>
              {selected.pincode ? (
                <span className="mt-1 block break-words text-xs font-normal text-muted-foreground">
                  {selected.pincode}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                clearSelection()
              }}
              className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-input bg-white/90 px-4 py-3 text-left text-sm shadow-sm transition-all hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            onMouseDown={(e) => {
              e.preventDefault()
              setIsOpen((o) => !o)
              setTimeout(() => inputRef.current?.focus(), 10)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              setIsOpen((o) => !o)
              setTimeout(() => inputRef.current?.focus(), 10)
            }}
          >
            <span className="min-w-0 flex-1 break-words text-muted-foreground">
              {societies.length > 0
                ? `${societies.length} societ${societies.length === 1 ? 'y' : 'ies'} found - tap to select`
                : neighbourhood || pincode
                  ? `Search societies in ${neighbourhood || pincode}...`
                  : 'Search for your society...'}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}

        {isOpen && !selected ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={
                  neighbourhood || pincode
                    ? `Search in ${neighbourhood || pincode}...`
                    : 'Type society name...'
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setActiveIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setSearchTerm('')
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div ref={listRef} className="max-h-[240px] overflow-y-auto overflow-x-hidden p-2" role="listbox">
              {isFetching ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </div>
              ) : null}

              {fetchError && !isFetching ? (
                <p className="px-3 py-3 text-xs text-red-600">{fetchError}</p>
              ) : null}

              {!isFetching && !fetchError && allOptions.length === 0 && (pincode || neighbourhood) && !searchTerm ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  No societies found for this area yet. Type a name to add one.
                </p>
              ) : null}

              {!isFetching && !fetchError && !pincode && !neighbourhood && !searchTerm ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Type a society name to search...
                </p>
              ) : null}

              {!isFetching
                ? allOptions.map((option, i) => (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      className={[
                        'flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        i === activeIndex
                          ? 'bg-secondary/60 text-foreground'
                          : 'text-foreground/80 hover:bg-secondary/40',
                      ].join(' ')}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleOptionClick(option)
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        handleOptionClick(option)
                      }}
                      disabled={isCreating && option.type === 'create'}
                    >
                      {option.type === 'create' ? (
                        <>
                          {isCreating ? (
                            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                          ) : (
                            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          )}
                          <span className="min-w-0 break-words">
                            Add <strong className="font-semibold">&ldquo;{option.label}&rdquo;</strong> as a new
                            society
                          </span>
                        </>
                      ) : (
                        <>
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-medium">{option.society.name}</span>
                            {option.society.pincode ? (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {option.society.pincode}
                              </span>
                            ) : null}
                          </span>
                          {selected?.id === option.society.id ? (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          ) : null}
                        </>
                      )}
                    </button>
                  ))
                : null}
            </div>
          </div>
        ) : null}
      </div>

      {!selected ? (
        <p className="text-[0.72rem] leading-4 text-muted-foreground">
          You can skip this and add your society from your profile later.
        </p>
      ) : null}
    </div>
  )
}

function buildOptions(societies, searchTerm) {
  const societyOptions = societies.map((s) => ({
    key: s.id,
    type: 'existing',
    society: s,
  }))

  const trimmed = searchTerm.trim()
  const hasExactMatch = societies.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())

  if (trimmed.length >= 2 && !hasExactMatch) {
    societyOptions.push({
      key: `create-${trimmed}`,
      type: 'create',
      label: trimmed,
    })
  }

  return societyOptions
}
