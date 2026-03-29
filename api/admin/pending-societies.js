import { createClient } from '@supabase/supabase-js'

function cleanEnv(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function createSupabaseClients() {
  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '')
  const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '')
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || '')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return null
  }

  return {
    authClient: createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function readBearerToken(req) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' ? token : ''
}

async function authorizeReviewer(req, clients) {
  const token = readBearerToken(req)
  if (!token) {
    throw new Error('Missing authorization token.')
  }

  const {
    data: { user },
    error: userError,
  } = await clients.authClient.auth.getUser(token)

  if (userError || !user) {
    throw new Error('Unable to verify your session.')
  }

  const { data: profile, error: profileError } = await clients.adminClient
    .from('profiles')
    .select('id, role, primary_area_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Unable to verify your profile.')
  }

  if (!['inventory_admin', 'superadmin'].includes(profile.role)) {
    throw new Error('Only inventory admins and superadmins can review pending societies.')
  }

  return {
    user,
    profile,
  }
}

async function confirmPendingSociety(adminClient, dog) {
  const typedSocietyName = normalizeText(dog.tagged_society_name)
  if (!typedSocietyName) {
    throw new Error('Pending society name is missing for this dog.')
  }

  let societyQuery = adminClient
    .from('societies')
    .select('id, name, pincode, neighbourhood')
    .ilike('name', typedSocietyName)

  if (dog.tagged_area_pincode) {
    societyQuery = societyQuery.eq('pincode', dog.tagged_area_pincode)
  }

  const { data: existingSociety, error: societyLookupError } = await societyQuery.maybeSingle()
  if (societyLookupError) {
    throw new Error(societyLookupError.message)
  }

  let society = existingSociety
  if (!society) {
    const { data: createdSociety, error: createSocietyError } = await adminClient
      .from('societies')
      .insert({
        name: typedSocietyName,
        pincode: dog.tagged_area_pincode || null,
        neighbourhood: dog.tagged_area_neighbourhood || null,
        coordinates: null,
      })
      .select('id, name, pincode, neighbourhood')
      .single()

    if (createSocietyError || !createdSociety) {
      throw new Error(createSocietyError?.message || 'Unable to create society.')
    }

    society = createdSociety
  }

  const { data: updatedDog, error: updateDogError } = await adminClient
    .from('dogs')
    .update({
      tagged_society_id: society.id,
      tagged_society_name: society.name,
      society_status: 'confirmed',
    })
    .eq('id', dog.id)
    .select('*')
    .single()

  if (updateDogError || !updatedDog) {
    throw new Error(updateDogError?.message || 'Unable to confirm pending society.')
  }

  return updatedDog
}

async function rejectPendingSociety(adminClient, dogId) {
  const { data: updatedDog, error } = await adminClient
    .from('dogs')
    .update({
      tagged_society_id: null,
      society_status: 'rejected',
    })
    .eq('id', dogId)
    .select('*')
    .single()

  if (error || !updatedDog) {
    throw new Error(error?.message || 'Unable to reject pending society.')
  }

  return updatedDog
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Only POST is supported for this route.' })
  }

  const clients = createSupabaseClients()
  if (!clients) {
    return res.status(500).json({ ok: false, error: 'Pending society review is not configured on the server yet.' })
  }

  try {
    const { profile } = await authorizeReviewer(req, clients)
    const dogId = normalizeText(req.body?.dogId)
    const action = normalizeText(req.body?.action)

    if (!dogId || !['confirm', 'reject'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'dogId and a valid action are required.' })
    }

    const { data: dog, error: dogError } = await clients.adminClient
      .from('dogs')
      .select('id, area_id, tagged_society_name, tagged_area_pincode, tagged_area_neighbourhood, society_status')
      .eq('id', dogId)
      .single()

    if (dogError || !dog) {
      return res.status(404).json({ ok: false, error: dogError?.message || 'Dog not found.' })
    }

    if (dog.society_status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'This dog does not have a pending society to review.' })
    }

    if (profile.role !== 'superadmin' && profile.primary_area_id !== dog.area_id) {
      return res.status(403).json({ ok: false, error: 'You can only review pending societies in your own area.' })
    }

    const updatedDog =
      action === 'confirm'
        ? await confirmPendingSociety(clients.adminClient, dog)
        : await rejectPendingSociety(clients.adminClient, dogId)

    return res.status(200).json({ ok: true, dog: updatedDog })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to review pending society.',
    })
  }
}
