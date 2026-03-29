import { useEffect, useMemo, useState } from 'react'
import { searchNeighbourhoods } from '../lib/communityData'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ')
}

function extractFromGoogle(addressComponents) {
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

function extractFromBigDataCloud(payload) {
  return {
    pincode: payload?.postcode ?? '',
    neighbourhood:
      payload?.locality ||
      payload?.principalSubdivision ||
      payload?.cityDistrict ||
      payload?.neighbourhood ||
      '',
    city: payload?.city || payload?.principalSubdivision || payload?.localityInfo?.administrative?.[1]?.name || '',
  }
}

function extractFromNominatim(payload) {
  const address = payload?.address ?? {}

  return {
    pincode: address.postcode ?? '',
    neighbourhood:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      address.town ||
      '',
    city: address.city || address.town || address.state_district || address.state || '',
  }
}

async function reverseGeocodeWithGoogle(lat, lng) {
  if (!GOOGLE_MAPS_KEY) {
    throw new Error('Google Maps key missing')
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
  const response = await fetch(url)
  const payload = await response.json()

  if (!response.ok || payload?.status !== 'OK') {
    throw new Error('Google reverse geocode failed')
  }

  return extractFromGoogle(payload?.results?.[0]?.address_components ?? [])
}

async function reverseGeocodeWithBigDataCloud(lat, lng) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  const response = await fetch(url)
  const payload = await response.json()

  if (!response.ok) {
    throw new Error('BigDataCloud reverse geocode failed')
  }

  return extractFromBigDataCloud(payload)
}

async function reverseGeocodeWithNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error('Nominatim reverse geocode failed')
  }

  return extractFromNominatim(payload)
}

async function reverseGeocode(lat, lng) {
  const resolvers = [reverseGeocodeWithGoogle, reverseGeocodeWithBigDataCloud, reverseGeocodeWithNominatim]

  for (const resolver of resolvers) {
    try {
      const result = await resolver(lat, lng)
      if (result?.pincode || result?.neighbourhood || result?.city) {
        return result
      }
    } catch {
      // Try the next resolver.
    }
  }

  return { pincode: '', neighbourhood: '', city: '' }
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
    return { ok: false, reason: 'unsupported' }
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

          if (nextPincode || neighbourhood || city) {
            const nextNeighbourhood = neighbourhood || city || ''
            const parts = [nextNeighbourhood, city && city !== nextNeighbourhood ? city : ''].filter(Boolean)

            setPincode(nextPincode)
            setDetectedNeighbourhood(nextNeighbourhood)
            setDetectedLabel(parts.join(', ') || nextPincode)
            setAreaInputState(nextNeighbourhood)
            setSelectedSociety(null)
            setManual(false)
            resolve({ ok: true })
            return
          }

          setManual(true)
          resolve({ ok: false, reason: 'no-match' })
        } catch {
          setManual(true)
          resolve({ ok: false, reason: 'reverse-geocode-failed' })
        } finally {
          setDetecting(false)
        }
      },
      () => {
        setDetecting(false)
        setManual(true)
        resolve({ ok: false, reason: 'permission-denied' })
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 300_000 },
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
  const [societyDraftName, setSocietyDraftName] = useState('')

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
    if (normalizeText(areaInput).length < 2) {
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
    }, 250)

    return () => window.clearTimeout(timer)
  }, [areaInput])

  function setAreaInput(value) {
    setManual(true)
    setAreaInputState(value)
    setDetectedLabel('')
    setDetectedNeighbourhood('')
    setPincode('')
    setShowSuggestions(true)
    setSelectedSociety(null)
    setSocietyDraftName('')
  }

  function selectSuggestion(suggestion) {
    const label = suggestion.neighbourhood || ''
    setManual(true)
    setAreaInputState(label)
    setDetectedLabel('')
    setDetectedNeighbourhood('')
    if (suggestion.pincode) {
      setPincode(suggestion.pincode)
    }
    setAreaSuggestions([])
    setShowSuggestions(false)
    setSelectedSociety(null)
    setSocietyDraftName('')
  }

  function resetToManual() {
    setManual(true)
    setDetectedLabel('')
    setDetectedNeighbourhood('')
    setPincode('')
    setAreaInputState('')
    setSelectedSociety(null)
    setSocietyDraftName('')
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

    return selectedSociety
  }

  const normalizedAreaInput = normalizeText(areaInput)
  const normalizedDetectedLabel = normalizeText(detectedLabel)
  const normalizedDetectedNeighbourhood = normalizeText(detectedNeighbourhood)
  const selectedSocietyNeighbourhood = normalizeText(selectedSociety?.neighbourhood)
  const fallbackAreaLabel = manual
    ? normalizedAreaInput
    : normalizedDetectedLabel || normalizedDetectedNeighbourhood
  const effectiveNeighbourhood =
    selectedSocietyNeighbourhood || normalizedAreaInput || normalizedDetectedNeighbourhood
  const areaLabel = selectedSocietyNeighbourhood || fallbackAreaLabel

  const areaContext = useMemo(
    () => ({
      pincode: selectedSociety?.pincode || pincode || '',
      neighbourhood: effectiveNeighbourhood || '',
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
    societyDraftName,
    setSocietyDraftName,
    detectLocation,
    resolveSelectedSociety,
  }
}
