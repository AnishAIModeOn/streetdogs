import { ensureSupabase } from './supabaseClient'
import {
  EXPENSE_APPROVED_STATUS,
  EXPENSE_PENDING_APPROVAL_STATUS,
  EXPENSE_REJECTED_STATUS,
  VISIBLE_EXPENSE_STATUSES,
} from './expense-status'

function toErrorMessage(error) {
  if (!error) {
    return 'Unknown Supabase error.'
  }

  const parts = [error.message]

  if (error.code) {
    parts.push(`Code: ${error.code}`)
  }

  if (error.details) {
    parts.push(`Details: ${error.details}`)
  }

  if (error.hint) {
    parts.push(`Hint: ${error.hint}`)
  }

  return parts.filter(Boolean).join(' ')
}

function unwrap(result) {
  const { data, error } = result

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  return data
}

// ── Societies ────────────────────────────────────────────────

/**
 * Search societies by pincode and/or a name/neighbourhood fragment.
 *
 * When a pincode is supplied, results are restricted to that pincode first,
 * then filtered by the search term.
 *
 * When only a search term is supplied (manual area-name entry), results match
 * any society whose name OR neighbourhood contains the term — so typing
 * "Bellandur" surfaces every society tagged to that neighbourhood regardless
 * of its display name.
 *
 * Returns up to 15 results ordered alphabetically.
 */
export async function searchSocieties(pincode, searchTerm = '', neighbourhood = '') {
  const client = ensureSupabase()
  let query = client.from('societies').select('*')
  const normalizedNeighbourhood = neighbourhood.trim()

  if (normalizedNeighbourhood) {
    query = query.ilike('neighbourhood', normalizedNeighbourhood)
  } else if (pincode) {
    query = query.eq('pincode', pincode)
  }

  const term = searchTerm.trim()
  if (term) {
    query = query.ilike('name', `%${term}%`)
  }

  return unwrap(await query.order('name', { ascending: true }).limit(15))
}

/**
 * Returns distinct neighbourhood names matching the search term.
 * Used to power the area typeahead in the auth flow.
 */
export async function searchNeighbourhoods(term) {
  const client = ensureSupabase()
  const t = term.trim()
  if (!t) {
    return []
  }
  const results = unwrap(
    await client
      .from('societies')
      .select('neighbourhood, pincode')
      .not('neighbourhood', 'is', null)
      .ilike('neighbourhood', `%${t}%`)
      .order('neighbourhood', { ascending: true, nullsFirst: false })
      .limit(30),
  )
  const seen = new Set()
  return results
    .map((r) => ({
      neighbourhood: r.neighbourhood?.trim() || '',
      pincode: r.pincode,
    }))
    .filter((r) => {
      const key = r.neighbourhood.toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
}

/**
 * Create a new society row, but first check for an exact case-insensitive
 * name+pincode match to avoid duplicates.  Returns the existing row if found.
 */
export async function createSociety({
  name,
  pincode,
  neighbourhood = null,
  coordinates = null,
  locality_id = null,
}) {
  const client = ensureSupabase()
  const trimmedName = name.trim()

  // Check for existing match (case-insensitive)
  const existing = unwrap(
    await client
      .from('societies')
      .select('*')
      .ilike('name', trimmedName)
      .eq('pincode', pincode)
      .maybeSingle(),
  )

  if (existing) return existing

  return unwrap(
    await client
      .from('societies')
      .insert({ name: trimmedName, pincode, neighbourhood, coordinates, locality_id })
      .select()
      .single(),
  )
}

/**
 * List dogs tagged by the current user outside their home society pincode.
 * Queries the `my_out_of_area_dogs` view (created by the migration).
 */
export async function listMyOutOfAreaDogs() {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('my_out_of_area_dogs')
      .select('*')
      .order('created_at', { ascending: false }),
  )
}

// ── Areas ────────────────────────────────────────────────────

export async function listActiveAreas() {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('areas')
      .select('*')
      .eq('status', 'active')
      .order('city', { ascending: true })
      .order('name', { ascending: true }),
  )
}

export async function listAreas() {
  const client = ensureSupabase()
  return unwrap(
    await client.from('areas').select('*').order('city', { ascending: true }).order('name'),
  )
}

export async function listLocalities() {
  const client = ensureSupabase()
  return unwrap(await client.from('localities').select('*'))
}

export async function listSocietiesByLocality(localityId) {
  const client = ensureSupabase()

  if (!localityId) {
    return []
  }

  return unwrap(
    await client
      .from('societies')
      .select('*')
      .eq('locality_id', localityId)
      .order('name', { ascending: true }),
  )
}

export async function getProfile(userId) {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('profiles')
      .select('*, societies(id, name, pincode, neighbourhood)')
      .eq('id', userId)
      .maybeSingle(),
  )
}

export async function updateProfile(userId, payload) {
  const client = ensureSupabase()
  return unwrap(await client.from('profiles').update(payload).eq('id', userId).select().single())
}

export async function listProfilesForAdmin() {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('profiles')
      .select(
        `
          id,
          full_name,
          role,
          status,
          primary_area_id,
          home_locality_id,
          society_id,
          created_at,
          home_locality:localities!profiles_home_locality_id_fkey (*),
          society:societies!profiles_society_id_fkey (
            id,
            name,
            locality_id,
            neighbourhood,
            pincode
          )
        `,
      )
      .order('created_at', { ascending: false }),
  )
}

export async function countPendingContributions() {
  const client = ensureSupabase()
  const { count, error } = await client
    .from('contributions')
    .select('id', { count: 'exact', head: true })
    .eq('payment_status', 'pending')

  if (error) {
    throw new Error(toErrorMessage(error))
  }

  return count ?? 0
}

export async function updateUserRole(userId, role) {
  const client = ensureSupabase()
  return unwrap(await client.from('profiles').update({ role }).eq('id', userId).select().single())
}

export async function updateUserAdminSettings(userId, payload) {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('profiles')
      .update({
        role: payload.role,
        primary_area_id: payload.primary_area_id ?? null,
        home_locality_id: payload.home_locality_id ?? null,
        society_id: payload.society_id ?? null,
      })
      .eq('id', userId)
      .select(
        `
          id,
          full_name,
          role,
          status,
          primary_area_id,
          home_locality_id,
          society_id,
          created_at,
          home_locality:localities!profiles_home_locality_id_fkey (*),
          society:societies!profiles_society_id_fkey (
            id,
            name,
            locality_id,
            neighbourhood,
            pincode
          )
        `,
      )
      .single(),
  )
}

export async function listInventoryRequestsForArea(areaId) {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('inventory_requests')
      .select(
        `
          id,
          title,
          description,
          status,
          created_at,
          created_by_profile:profiles!inventory_requests_created_by_user_id_fkey (
            full_name
          ),
          inventory_request_items (
            id,
            item_name,
            category,
            quantity_required,
            quantity_committed,
            quantity_remaining,
            unit,
            inventory_commitments (
              id,
              committed_by_user_id,
              quantity,
              status,
              notes,
              created_at
            )
          )
        `,
      )
      .eq('area_id', areaId)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  )
}

export async function listInventoryRequestsForReporting({ areaId = null, includeAllAreas = false }) {
  const client = ensureSupabase()
  let query = client
    .from('inventory_requests')
    .select(
      `
        id,
        title,
        description,
        status,
        created_at,
        area:areas!inventory_requests_area_id_fkey (
          id,
          name,
          city
        ),
        created_by_profile:profiles!inventory_requests_created_by_user_id_fkey (
          id,
          full_name
        ),
        inventory_request_items (
          id,
          item_name,
          category,
          quantity_required,
          quantity_committed,
          quantity_remaining,
          unit,
          inventory_commitments (
            id,
            committed_by_user_id,
            quantity,
            status,
            notes,
            created_at,
            committed_by_profile:profiles!inventory_commitments_committed_by_user_id_fkey (
              full_name
            )
          )
        )
      `,
    )
    .order('created_at', { ascending: false })

  if (!includeAllAreas && areaId) {
    query = query.eq('area_id', areaId)
  }

  return unwrap(await query)
}

export async function createInventoryRequest(payload) {
  const client = ensureSupabase()
  return unwrap(await client.from('inventory_requests').insert(payload).select().single())
}

export async function updateInventoryRequestStatus(requestId, status) {
  const client = ensureSupabase()
  return unwrap(
    await client.from('inventory_requests').update({ status }).eq('id', requestId).select().single(),
  )
}

export async function createInventoryRequestItems(items) {
  const client = ensureSupabase()
  return unwrap(await client.from('inventory_request_items').insert(items).select())
}

export async function recordInventoryCommitment(itemId, quantity, notes) {
  const client = ensureSupabase()
  return unwrap(
    await client.rpc('record_inventory_commitment', {
      request_item_row_id: itemId,
      commitment_quantity: quantity,
      commitment_notes: notes ?? null,
    }),
  )
}

export async function listDogs() {
  const client = ensureSupabase()
  return unwrap(await client.from('dogs').select('*').order('created_at', { ascending: false }))
}

export async function getDog(dogId) {
  const client = ensureSupabase()
  return unwrap(await client.from('dogs').select('*').eq('id', dogId).maybeSingle())
}

export async function createDog(payload) {
  const client = ensureSupabase()
  const safePayload = {
    dog_name_or_temp_name: payload.dog_name_or_temp_name ?? null,
    area_id: payload.area_id,
    added_by_user_id: payload.added_by_user_id ?? null,
    added_by_guest: Boolean(payload.added_by_guest),
    guest_contact: payload.guest_contact ?? null,
    photo_url: payload.photo_url ?? null,
    location_description: payload.location_description ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    gender: payload.gender ?? 'unknown',
    approx_age: payload.approx_age ?? null,
    vaccination_status: payload.vaccination_status ?? 'unknown',
    sterilization_status: payload.sterilization_status ?? 'unknown',
    health_notes: payload.health_notes ?? null,
    temperament: payload.temperament ?? null,
    visibility_type: payload.visibility_type ?? 'normal_area_visible',
    status: payload.status ?? 'active',
    // Area-tagging: written at create time so RLS pincode scoping works correctly.
    // tagged_by_user_id lets the user always see their own dogs regardless of area.
    tagged_by_user_id: payload.tagged_by_user_id ?? null,
    tagged_society_id: payload.tagged_society_id ?? null,
    tagged_society_name: payload.tagged_society_name ?? null,
    society_status: payload.society_status ?? null,
    tagged_area_pincode: payload.tagged_area_pincode ?? null,
    tagged_area_neighbourhood: payload.tagged_area_neighbourhood ?? null,
    ai_summary: payload.ai_summary ?? null,
    ai_condition: payload.ai_condition ?? null,
    ai_urgency: payload.ai_urgency ?? null,
    ai_breed_guess: payload.ai_breed_guess ?? null,
    ai_color: payload.ai_color ?? null,
    ai_age_band: payload.ai_age_band ?? null,
    ai_injuries: payload.ai_injuries ?? null,
    ai_raw_json: payload.ai_raw_json ?? null,
    ai_processed_at: payload.ai_processed_at ?? null,
  }

  return unwrap(await client.from('dogs').insert(safePayload).select().single())
}

export async function listPendingSocietyDogsForReview({ areaId = null, includeAllAreas = false }) {
  const client = ensureSupabase()
  let query = client
    .from('dogs')
    .select(
      `
        id,
        dog_name_or_temp_name,
        location_description,
        tagged_society_id,
        tagged_society_name,
        society_status,
        tagged_area_pincode,
        tagged_area_neighbourhood,
        created_at,
        area:areas!dogs_area_id_fkey (
          id,
          name,
          city
        )
      `,
    )
    .eq('society_status', 'pending')
    .order('created_at', { ascending: false })

  if (!includeAllAreas && areaId) {
    query = query.eq('area_id', areaId)
  }

  return unwrap(await query)
}

export async function reviewPendingSocietyDog({ dogId, action }) {
  const client = ensureSupabase()
  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.access_token) {
    throw new Error('You must be signed in to review pending societies.')
  }

  const response = await fetch('/api/admin/pending-societies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      dogId,
      action,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.ok || !payload?.dog) {
    throw new Error(payload?.error || 'Unable to review pending society right now.')
  }

  return payload.dog
}

export async function listDogSightings() {
  const client = ensureSupabase()
  return unwrap(
    await client.from('dog_sightings').select('*').order('sighted_at', { ascending: false }),
  )
}

export async function listDogSightingsForDog(dogId) {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('dog_sightings')
      .select('*')
      .eq('dog_id', dogId)
      .order('sighted_at', { ascending: false }),
  )
}

export async function listExpensesForDog(dogId) {
  const client = ensureSupabase()
  return unwrap(
    await client
    .from('expenses')
    .select(
      `
        *,
        raised_by_profile:profiles!expenses_raised_by_user_id_fkey (
          full_name,
          upi_id
        ),
        expense_receipts (
          id,
          file_url,
          uploaded_at
        ),
        contributions (
          id,
          contributor_user_id,
          amount,
          payment_status,
          contributed_at,
          contributor_profile:profiles!contributions_contributor_user_id_fkey (
            full_name
          )
        )
      `,
    )
    .eq('dog_id', dogId)
    .in('status', VISIBLE_EXPENSE_STATUSES)
    .order('created_at', { ascending: false }),
  )
}

export async function listPendingExpensesForDogByUser(dogId, userId) {
  const client = ensureSupabase()

  if (!dogId || !userId) {
    return []
  }

  return unwrap(
    await client
      .from('expenses')
      .select(
        `
          *,
          expense_receipts (
            id,
            file_url,
            uploaded_at
          )
        `,
      )
      .eq('dog_id', dogId)
      .eq('raised_by_user_id', userId)
      .eq('status', EXPENSE_PENDING_APPROVAL_STATUS)
      .order('created_at', { ascending: false }),
  )
}

export async function createExpense(payload) {
  const client = ensureSupabase()
  const safePayload = {
    dog_id: payload.dog_id ?? null,
    raised_by_user_id: payload.raised_by_user_id,
    area_id: payload.area_id,
    target_scope: payload.target_scope ?? (payload.dog_id ? 'dog' : 'area'),
    target_society_id: payload.target_society_id ?? null,
    target_society_name: payload.target_society_name ?? null,
    expense_type: payload.expense_type,
    description: payload.description ?? null,
    total_amount: payload.total_amount,
    amount_contributed: payload.amount_contributed ?? 0,
    amount_pending: payload.amount_pending,
    disclaimer_accepted: Boolean(payload.disclaimer_accepted),
    status: payload.status ?? EXPENSE_PENDING_APPROVAL_STATUS,
  }

  return unwrap(await client.from('expenses').insert(safePayload).select().single())
}

export async function listPendingExpenseApprovals({ areaId = null, includeAllAreas = false } = {}) {
  const client = ensureSupabase()
  let query = client
    .from('expenses')
    .select(
      `
        *,
        area:areas!expenses_area_id_fkey (
          id,
          name,
          city
        ),
        raised_by_profile:profiles!expenses_raised_by_user_id_fkey (
          full_name,
          upi_id
        ),
        expense_receipts (
          id,
          file_url,
          uploaded_at
        )
      `,
    )
    .eq('status', EXPENSE_PENDING_APPROVAL_STATUS)
    .order('created_at', { ascending: false })

  if (!includeAllAreas && areaId) {
    query = query.eq('area_id', areaId)
  }

  return unwrap(await query)
}

export async function approveExpense(expenseId, approvedByUserId) {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('expenses')
      .update({
        status: EXPENSE_APPROVED_STATUS,
        approved_by: approvedByUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .eq('status', EXPENSE_PENDING_APPROVAL_STATUS)
      .select()
      .single(),
  )
}

export async function rejectExpense(expenseId) {
  const client = ensureSupabase()
  return unwrap(
    await client
      .from('expenses')
      .update({
        status: EXPENSE_REJECTED_STATUS,
        approved_by: null,
        approved_at: null,
      })
      .eq('id', expenseId)
      .eq('status', EXPENSE_PENDING_APPROVAL_STATUS)
      .select()
      .single(),
  )
}

export async function createExpenseReceipt(payload) {
  const client = ensureSupabase()
  const safePayload = {
    expense_id: payload.expense_id,
    uploaded_by_user_id: payload.uploaded_by_user_id,
    file_url: payload.file_url,
  }

  return unwrap(await client.from('expense_receipts').insert(safePayload).select().single())
}

export async function createContribution(payload) {
  const client = ensureSupabase()
  const safePayload = {
    expense_id: payload.expense_id,
    contributor_user_id: payload.contributor_user_id,
    amount: payload.amount,
    payment_method: payload.payment_method ?? 'upi',
    payment_status: payload.payment_status ?? 'confirmed',
    notes: payload.notes ?? null,
  }

  return unwrap(await client.from('contributions').insert(safePayload).select().single())
}

export async function recordContribution(expenseId, contributionAmount, notes) {
  const client = ensureSupabase()
  return unwrap(
    await client.rpc('record_contribution', {
      expense_row_id: expenseId,
      contribution_amount: contributionAmount,
      contribution_notes: notes ?? null,
    }),
  )
}
