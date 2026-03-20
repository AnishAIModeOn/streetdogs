import { useEffect, useMemo, useState } from 'react'
import { createSociety, searchNeighbourhoods } from '../lib/communityData'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

function extractComponents(addressComponents) {
  const get = (...types) => {
    const match = addressComponents.find((component) =>
      types.some((type) => component.types.includes(type)),
    )

    return match?.long_name ?? ''
  }

  return {
    pincode: get('postal_code'),
    neighbourhood:
      get('sublocality_level_1') ||
      get('neighborhood') ||
      get('sublocality') ||
      get('administrative_area_level_3'),
    city:
      get('locality') ||
      get('administrative_area_level_2') ||
      get('administrative_area_level_1'),
  }
}

async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_KEY) {
    return { pincode: '', neighbourhood: '', city: '' }
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
  const response = await fetch(url)
  const payload = await response.json()

  return extractComponents(payload?.results?.[0]?.address_components ?? [])
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ')
}

async function detectCurrentLocation({
  setPincode,
  setDetectedNeighbourhood,
  setDetectedLabel,
  setManual,
  setAreaInputState,
  setSelectedSociety,
  setDetecting,
}) {
  if (!navigator.geolocation) {
    setDetecting(false)
    setManual(true)
    return
  }

  setDetecting(true)

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { pincode: nextPincode, neighbourhood, city } = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          )

          if (nextPincode || neighbourhood) {
            setPincode(nextPincode)
            setDetectedNeighbourhood(neighbourhood)
            const parts = [neighbourhood, city].filter(Boolean)
            setDetectedLabel(parts.length ? parts.join(', ') : nextPincode)
            setAreaInputState(neighbourhood || '')
            setSelectedSociety(null)
            setManual(false)
          } else {
            setManual(true)
          }
        } catch {
          setManual(true)
        } finally {
          setDetecting(false)
          resolve()
        }
      },
      () => {
        setDetecting(false)
        setManual(true)
        resolve()
      },
      { timeout: 9000, maximumAge: 60_000 },
    )
  })
}

export function findMatchingAreaId(areas, areaLabel) {
  const normalizedLabel = normalizeComparable(areaLabel)

  if (!normalizedLabel) {
    return ''
  }

  const exactMatch = areas.find((area) => normalizeComparable(area.name) === normalizedLabel)
  if (exactMatch) {
    return exactMatch.id
  }

  const cityMatch = areas.find(
    (area) =>
      normalizeComparable(`${area.name}, ${area.city}`) === normalizedLabel ||
      normalizeComparable(`${area.city} - ${area.name}`) === normalizedLabel,
  )
  if (cityMatch) {
    return cityMatch.id
  }

  const partialMatch = areas.find(
    (area) =>
      normalizedLabel.includes(normalizeComparable(area.name)) ||
      normalizeComparable(area.name).includes(normalizedLabel),
  )

  return partialMatch?.id ?? ''
}

export function useAreaSocietyFlow(options = {}) {
  const {
    initialAreaLabel = '',
    initialPincode = '',
    initialSociety = null,
    autoDetect = true,
    deferSocietyCreate = false,
  } = options

  const [pincode, setPincode] = useState(initialPincode)
  const [detectedLabel, setDetectedLabel] = useState('')
  const [detectedNeighbourhood, setDetectedNeighbourhood] = useState('')
  const [detecting, setDetecting] = useState(autoDetect)
  const [manual, setManual] = useState(!autoDetect || Boolean(initialAreaLabel))
  const [areaInput, setAreaInputState] = useState(initialAreaLabel)
  const [areaSuggestions, setAreaSuggestions] = useState([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSociety, setSelectedSociety] = useState(initialSociety)

  useEffect(() => {
    if (!autoDetect) {
      setDetecting(false)
      return undefined
    }

    let isMounted = true

    detectCurrentLocation({
      setPincode: (value) => isMounted && setPincode(value),
      setDetectedNeighbourhood: (value) => isMounted && setDetectedNeighbourhood(value),
      setDetectedLabel: (value) => isMounted && setDetectedLabel(value),
      setManual: (value) => isMounted && setManual(value),
      setAreaInputState: (value) => isMounted && setAreaInputState(value),
      setSelectedSociety: (value) => isMounted && setSelectedSociety(value),
      setDetecting: (value) => isMounted && setDetecting(value),
    })

    return () => {
      isMounted = false
    }
  }, [autoDetect])

  useEffect(() => {
    if (!manual || normalizeText(areaInput).length < 2) {
      setAreaSuggestions([])
      return undefined
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsFetchingSuggestions(true)
        const results = await searchNeighbourhoods(areaInput)
        setAreaSuggestions(results)
      } catch {
        setAreaSuggestions([])
      } finally {
        setIsFetchingSuggestions(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [areaInput, manual])

  function setAreaInput(value) {
    setAreaInputState(value)
    setPincode('')
    setShowSuggestions(true)
    setSelectedSociety(null)
  }

  function selectSuggestion(suggestion) {
    const label = suggestion.neighbourhood || ''
    setAreaInputState(label)
    if (suggestion.pincode) {
      setPincode(suggestion.pincode)
    }
    setAreaSuggestions([])
    setShowSuggestions(false)
    setSelectedSociety(null)
  }

  function resetToManual() {
    setManual(true)
    setDetectedLabel('')
    setDetectedNeighbourhood('')
    setPincode('')
    setAreaInputState('')
    setSelectedSociety(null)
  }

  function detectLocation() {
    return detectCurrentLocation({
      setPincode,
      setDetectedNeighbourhood,
      setDetectedLabel,
      setManual,
      setAreaInputState,
      setSelectedSociety,
      setDetecting,
    })
  }

  async function resolveSelectedSociety() {
    if (!selectedSociety) {
      return null
    }

    if (!selectedSociety._pending || deferSocietyCreate) {
      return selectedSociety
    }

    const createdSociety = await createSociety({
      name: selectedSociety.name,
      pincode: selectedSociety.pincode,
      neighbourhood: selectedSociety.neighbourhood || null,
      coordinates: null,
    })

    setSelectedSociety(createdSociety)
    return createdSociety
  }

  const effectiveNeighbourhood = manual ? normalizeText(areaInput) : normalizeText(detectedNeighbourhood)
  const areaLabel = manual ? normalizeText(areaInput) : normalizeText(detectedLabel)

  const areaContext = useMemo(
    () => ({
      pincode: selectedSociety?.pincode || pincode || '',
      neighbourhood: selectedSociety?.neighbourhood || effectiveNeighbourhood || '',
      societyId: selectedSociety?._pending ? null : selectedSociety?.id ?? null,
      societyName: selectedSociety?.name ?? null,
      areaLabel,
    }),
    [areaLabel, effectiveNeighbourhood, pincode, selectedSociety],
  )

  return {
    pincode,
    detectedLabel,
    detecting,
    manual,
    areaInput,
    areaSuggestions,
    isFetchingSuggestions,
    showSuggestions,
    selectedSociety,
    effectiveNeighbourhood,
    areaLabel,
    areaContext,
    setManual: resetToManual,
    setAreaInput,
    setShowSuggestions,
    selectSuggestion,
    setSelectedSociety,
    detectLocation,
    resolveSelectedSociety,
  }
}
