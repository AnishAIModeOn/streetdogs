import { createClient } from '@supabase/supabase-js'

function createServerSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function tokens(value) {
  return normalize(value)
    .split(/[\s,/-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function looselyMatches(primary, target) {
  const left = normalize(primary)
  const right = normalize(target)

  if (!left || !right) {
    return false
  }

  if (left === right || left.includes(right) || right.includes(left)) {
    return true
  }

  const leftTokens = tokens(left)
  const rightTokens = tokens(right)

  if (!leftTokens.length || !rightTokens.length) {
    return false
  }

  return (
    leftTokens.every((token) => rightTokens.includes(token)) ||
    rightTokens.every((token) => leftTokens.includes(token))
  )
}

function filterDogsForLocation(dogs, { area = '', pincode = '', societyId = '', societyName = '' }) {
  const normalizedArea = normalize(area)
  const normalizedPincode = normalize(pincode)
  const normalizedSocietyId = normalize(societyId)
  const normalizedSocietyName = normalize(societyName)

  if (!normalizedArea && !normalizedPincode && !normalizedSocietyId && !normalizedSocietyName) {
    return dogs
  }

  return dogs
    .map((dog) => {
      const dogArea = normalize(dog.area_name)
      const dogNeighbourhood = normalize(dog.tagged_area_neighbourhood)
      const dogLegacyArea = normalize(dog.area?.name)
      const dogLocationDescription = normalize(dog.location_description)
      const dogPincode = normalize(dog.tagged_area_pincode)
      const dogSocietyId = normalize(dog.tagged_society_id)
      const dogSocietyName = normalize(dog.tagged_society_name)

      const matchesArea =
        !normalizedArea ||
        looselyMatches(normalizedArea, dogNeighbourhood) ||
        looselyMatches(normalizedArea, dogArea) ||
        looselyMatches(normalizedArea, dogLegacyArea) ||
        looselyMatches(normalizedArea, dogLocationDescription)
      const matchesPincode = !normalizedPincode || dogPincode === normalizedPincode
      const matchesSociety =
        !normalizedSocietyId && !normalizedSocietyName
          ? false
          : dogSocietyId === normalizedSocietyId ||
            looselyMatches(normalizedSocietyName, dogSocietyName)

      const passesPrimaryLocation = normalizedArea
        ? matchesArea
        : normalizedPincode
          ? matchesPincode
          : true
      const passesFallbackLocation =
        !passesPrimaryLocation && normalizedArea && normalizedPincode ? matchesPincode : false

      if (!passesPrimaryLocation && !passesFallbackLocation) {
        return null
      }

      return {
        ...dog,
        _score: matchesSociety ? 2 : matchesPincode ? 1 : 0,
      }
    })
    .filter(Boolean)
    .sort((left, right) => right._score - left._score)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Only GET is supported for this route.' })
  }

  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return res.status(200).json({
      ok: true,
      metrics: {
        totalDogs: 0,
        vaccinatedDogs: 0,
        expensesRaised: 0,
        inventoryFulfilled: 0,
      },
      featuredDogs: [],
    })
  }

  try {
    const selectedArea = normalize(req.query?.area)
    const selectedPincode = normalize(req.query?.pincode)
    const selectedSocietyId = normalize(req.query?.societyId)
    const selectedSocietyName = normalize(req.query?.societyName)

    const [
      totalDogsResult,
      vaccinatedDogsResult,
      expensesResult,
      inventoryItemsResult,
      featuredDogsResult,
      areasResult,
    ] = await Promise.all([
      supabase.from('dogs').select('id', { count: 'exact', head: true }),
      supabase
        .from('dogs')
        .select('id', { count: 'exact', head: true })
        .eq('vaccination_status', 'vaccinated'),
      supabase.from('expenses').select('total_amount'),
      supabase.from('inventory_request_items').select('quantity_required, quantity_committed'),
      supabase
        .from('dogs')
        .select(
          'id, dog_name_or_temp_name, photo_url, location_description, area_id, area_name, city, status, vaccination_status, health_notes, notes, health_status, tagged_area_neighbourhood, tagged_area_pincode, tagged_society_id, tagged_society_name, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(60),
      supabase.from('areas').select('id, name, city'),
    ])

    if (
      totalDogsResult.error ||
      vaccinatedDogsResult.error ||
      expensesResult.error ||
      inventoryItemsResult.error ||
      featuredDogsResult.error ||
      areasResult.error
    ) {
      throw new Error('Unable to load landing metrics.')
    }

    const expensesRaised = (expensesResult.data ?? []).reduce(
      (sum, expense) => sum + Number(expense.total_amount ?? 0),
      0,
    )
    const inventoryFulfilled = (inventoryItemsResult.data ?? []).filter(
      (item) =>
        Number(item.quantity_required ?? 0) > 0 &&
        Number(item.quantity_committed ?? 0) >= Number(item.quantity_required ?? 0),
    ).length
    const areaMap = Object.fromEntries((areasResult.data ?? []).map((area) => [area.id, area]))
    const dogsWithArea = (featuredDogsResult.data ?? []).map((dog) => ({
      ...dog,
      area: dog.area_id ? areaMap[dog.area_id] ?? null : null,
    }))
    const matchedDogs = filterDogsForLocation(dogsWithArea, {
      area: selectedArea,
      pincode: selectedPincode,
      societyId: selectedSocietyId,
      societyName: selectedSocietyName,
    })
    const featuredDogs = selectedArea || selectedPincode ? matchedDogs.slice(0, 12) : dogsWithArea.slice(0, 3)

    return res.status(200).json({
      ok: true,
      metrics: {
        totalDogs: totalDogsResult.count ?? 0,
        vaccinatedDogs: vaccinatedDogsResult.count ?? 0,
        expensesRaised,
        inventoryFulfilled,
      },
      featuredDogs,
      matchedDogs: matchedDogs.slice(0, 18),
    })
  } catch {
    return res.status(200).json({
      ok: true,
      metrics: {
        totalDogs: 0,
        vaccinatedDogs: 0,
        expensesRaised: 0,
        inventoryFulfilled: 0,
      },
      featuredDogs: [],
      matchedDogs: [],
    })
  }
}
