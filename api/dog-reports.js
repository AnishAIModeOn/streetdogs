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

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function sanitizeGuestDogPayload(input) {
  return {
    dog_name_or_temp_name: normalizeText(input?.dog_name_or_temp_name) || null,
    area_id: input?.area_id || null,
    added_by_guest: true,
    added_by_user_id: null,
    tagged_by_user_id: null,
    tagged_society_id: input?.tagged_society_id || null,
    tagged_society_name: normalizeText(input?.tagged_society_name) || null,
    society_status: normalizeText(input?.society_status) || null,
    tagged_area_pincode: normalizeText(input?.tagged_area_pincode) || null,
    tagged_area_neighbourhood: normalizeText(input?.tagged_area_neighbourhood) || null,
    guest_contact: normalizeText(input?.guest_contact) || null,
    photo_url: normalizeText(input?.photo_url) || null,
    location_description: normalizeText(input?.location_description) || null,
    latitude: input?.latitude ?? null,
    longitude: input?.longitude ?? null,
    gender: normalizeText(input?.gender) || 'unknown',
    approx_age: normalizeText(input?.approx_age) || null,
    vaccination_status: normalizeText(input?.vaccination_status) || 'unknown',
    sterilization_status: normalizeText(input?.sterilization_status) || 'unknown',
    health_notes: normalizeText(input?.health_notes) || null,
    temperament: normalizeText(input?.temperament) || null,
    visibility_type: normalizeText(input?.visibility_type) || 'normal_area_visible',
    status: normalizeText(input?.status) || 'active',
    ai_summary: normalizeText(input?.ai_summary) || null,
    ai_condition: normalizeText(input?.ai_condition) || null,
    ai_urgency: normalizeText(input?.ai_urgency) || null,
    ai_breed_guess: normalizeText(input?.ai_breed_guess) || null,
    ai_color: normalizeText(input?.ai_color) || null,
    ai_age_band: normalizeText(input?.ai_age_band) || null,
    ai_injuries: normalizeText(input?.ai_injuries) || null,
    ai_raw_json: input?.ai_raw_json ?? null,
    ai_processed_at: input?.ai_processed_at || null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Only POST is supported for this route.' })
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Guest reporting is not configured on the server yet.' })
  }

  try {
    const payload = sanitizeGuestDogPayload(req.body ?? {})

    if (!payload.area_id) {
      return res.status(400).json({ ok: false, error: 'Area is required for guest dog reports.' })
    }

    if (!payload.location_description) {
      return res.status(400).json({ ok: false, error: 'Location details are required for guest dog reports.' })
    }

    const { data, error } = await supabase.from('dogs').insert(payload).select('*').single()
    if (error) {
      return res.status(400).json({ ok: false, error: error.message })
    }

    return res.status(200).json({ ok: true, dog: data })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to submit the dog report right now.',
    })
  }
}
