import { requireSupabase } from '../integrations/supabase/client'
import type { Dog } from '../types/supabase'

export interface DogFilters {
  city?: string
  areaName?: string
  search?: string
}

export interface UpsertDogInput {
  dog_name_or_temp_name?: string | null
  area_id?: string | null
  added_by_user_id?: string | null
  tagged_by_user_id?: string | null
  tagged_society_id?: string | null
  tagged_society_name?: string | null
  tagged_area_pincode?: string | null
  tagged_area_neighbourhood?: string | null
  added_by_guest?: boolean
  guest_contact?: string | null
  city?: string | null
  area_name?: string | null
  location_description: string
  latitude?: number | null
  longitude?: number | null
  gender?: string | null
  approx_age?: string | null
  dog_status?: Dog['dog_status']
  vaccination_status?: Dog['vaccination_status']
  sterilization_status?: Dog['sterilization_status']
  health_status?: Dog['health_status']
  health_notes?: string | null
  temperament?: string | null
  ai_summary?: string | null
  ai_condition?: string | null
  ai_urgency?: string | null
  ai_breed_guess?: string | null
  ai_color?: string | null
  ai_age_band?: string | null
  ai_injuries?: string | null
  ai_raw_json?: Record<string, unknown> | null
  ai_processed_at?: string | null
  visibility_type?: string | null
  status?: string | null
  notes?: string | null
  photo_path?: string | null
  photo_url?: string | null
  last_seen_at?: string | null
}

export async function listDogs(filters: DogFilters = {}) {
  const supabase = requireSupabase()
  let query = supabase.from('dogs').select('*').order('created_at', { ascending: false })

  if (filters.city) {
    query = query.eq('city', filters.city)
  }

  if (filters.areaName) {
    query = query.eq('area_name', filters.areaName)
  }

  if (filters.search) {
    query = query.or(
      `dog_name_or_temp_name.ilike.%${filters.search}%,location_description.ilike.%${filters.search}%,area_name.ilike.%${filters.search}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data as Dog[]
}

export async function getDogById(dogId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('dogs').select('*').eq('id', dogId).single()

  if (error) {
    throw error
  }

  return data as Dog
}

export async function createDog(input: UpsertDogInput) {
  const supabase = requireSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const shouldUseLegacyPayload =
    input.area_id !== undefined ||
    input.added_by_guest !== undefined ||
    input.guest_contact !== undefined ||
    input.status !== undefined

  if (shouldUseLegacyPayload) {
    if ((input.added_by_guest ?? !user) && !user) {
      const guestPayload = {
        dog_name_or_temp_name: input.dog_name_or_temp_name ?? null,
        area_id: input.area_id ?? null,
        tagged_society_id: input.tagged_society_id ?? null,
        tagged_society_name: input.tagged_society_name ?? null,
        tagged_area_pincode: input.tagged_area_pincode ?? null,
        tagged_area_neighbourhood: input.tagged_area_neighbourhood ?? null,
        guest_contact: input.guest_contact ?? null,
        location_description: input.location_description,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        gender: input.gender ?? 'unknown',
        approx_age: input.approx_age ?? null,
        vaccination_status: input.vaccination_status ?? 'unknown',
        sterilization_status: input.sterilization_status ?? 'unknown',
        health_notes: input.health_notes ?? input.notes ?? null,
        temperament: input.temperament ?? null,
        ai_summary: input.ai_summary ?? null,
        ai_condition: input.ai_condition ?? null,
        ai_urgency: input.ai_urgency ?? null,
        ai_breed_guess: input.ai_breed_guess ?? null,
        ai_color: input.ai_color ?? null,
        ai_age_band: input.ai_age_band ?? null,
        ai_injuries: input.ai_injuries ?? null,
        ai_raw_json: input.ai_raw_json ?? null,
        ai_processed_at: input.ai_processed_at ?? null,
        visibility_type: input.visibility_type ?? 'normal_area_visible',
        status: input.status ?? 'active',
        photo_url: input.photo_url ?? null,
      }

      const response = await fetch('/api/dog-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestPayload),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok || !payload?.dog) {
        throw new Error(payload?.error || 'Unable to submit the dog report right now.')
      }

      return payload.dog as Dog
    }

    const legacyPayload = {
      dog_name_or_temp_name: input.dog_name_or_temp_name ?? null,
      area_id: input.area_id ?? null,
      added_by_user_id: input.added_by_user_id ?? user?.id ?? null,
      tagged_by_user_id: input.tagged_by_user_id ?? user?.id ?? null,
      tagged_society_id: input.tagged_society_id ?? null,
      tagged_society_name: input.tagged_society_name ?? null,
      tagged_area_pincode: input.tagged_area_pincode ?? null,
      tagged_area_neighbourhood: input.tagged_area_neighbourhood ?? null,
      added_by_guest: input.added_by_guest ?? !user,
      guest_contact: input.guest_contact ?? null,
      photo_url: input.photo_url ?? null,
      location_description: input.location_description,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      gender: input.gender ?? 'unknown',
      approx_age: input.approx_age ?? null,
      vaccination_status: input.vaccination_status ?? 'unknown',
      sterilization_status: input.sterilization_status ?? 'unknown',
      health_notes: input.health_notes ?? input.notes ?? null,
      temperament: input.temperament ?? null,
      ai_summary: input.ai_summary ?? null,
      ai_condition: input.ai_condition ?? null,
      ai_urgency: input.ai_urgency ?? null,
      ai_breed_guess: input.ai_breed_guess ?? null,
      ai_color: input.ai_color ?? null,
      ai_age_band: input.ai_age_band ?? null,
      ai_injuries: input.ai_injuries ?? null,
      ai_raw_json: input.ai_raw_json ?? null,
      ai_processed_at: input.ai_processed_at ?? null,
      visibility_type: input.visibility_type ?? 'normal_area_visible',
      status: input.status ?? 'active',
    }

    const { data, error } = await supabase.from('dogs').insert(legacyPayload).select('*').single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Dog
  }

  if (!user) {
    throw new Error('Not authenticated.')
  }

  const payload = {
    dog_name_or_temp_name: input.dog_name_or_temp_name ?? null,
    city: input.city ?? null,
    area_name: input.area_name ?? null,
    location_description: input.location_description,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    dog_status: input.dog_status ?? 'active',
    vaccination_status: input.vaccination_status ?? 'unknown',
    sterilization_status: input.sterilization_status ?? 'unknown',
    health_status: input.health_status ?? 'observation',
    notes: input.notes ?? null,
    photo_path: input.photo_path ?? null,
    photo_url: input.photo_url ?? null,
    last_seen_at: input.last_seen_at ?? null,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await supabase.from('dogs').insert(payload).select('*').single()

  if (error) {
    throw error
  }

  return data as Dog
}

export async function updateDog(dogId: string, input: Partial<UpsertDogInput>) {
  const supabase = requireSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated.')
  }

  const { data, error } = await supabase
    .from('dogs')
    .update({
      ...input,
      updated_by: user.id,
    })
    .eq('id', dogId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as Dog
}

export async function uploadDogPhoto(file: File, userId: string) {
  const supabase = requireSupabase()
  const extension = file.name.split('.').pop() || 'jpg'
  const filePath = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('dog-photos').upload(filePath, file, {
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('dog-photos').getPublicUrl(filePath)

  return {
    photo_path: filePath,
    photo_url: data.publicUrl,
  }
}
