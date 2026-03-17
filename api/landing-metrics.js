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
        sterilizedDogs: 0,
        expensesRaised: 0,
      },
    })
  }

  try {
    const [
      totalDogsResult,
      vaccinatedDogsResult,
      sterilizedDogsResult,
      expensesResult,
    ] = await Promise.all([
      supabase.from('dogs').select('id', { count: 'exact', head: true }),
      supabase
        .from('dogs')
        .select('id', { count: 'exact', head: true })
        .eq('vaccination_status', 'vaccinated'),
      supabase
        .from('dogs')
        .select('id', { count: 'exact', head: true })
        .eq('sterilization_status', 'sterilized'),
      supabase.from('expenses').select('total_amount'),
    ])

    if (
      totalDogsResult.error ||
      vaccinatedDogsResult.error ||
      sterilizedDogsResult.error ||
      expensesResult.error
    ) {
      throw new Error('Unable to load landing metrics.')
    }

    const expensesRaised = (expensesResult.data ?? []).reduce(
      (sum, expense) => sum + Number(expense.total_amount ?? 0),
      0,
    )

    return res.status(200).json({
      ok: true,
      metrics: {
        totalDogs: totalDogsResult.count ?? 0,
        vaccinatedDogs: vaccinatedDogsResult.count ?? 0,
        sterilizedDogs: sterilizedDogsResult.count ?? 0,
        expensesRaised,
      },
    })
  } catch {
    return res.status(200).json({
      ok: true,
      metrics: {
        totalDogs: 0,
        vaccinatedDogs: 0,
        sterilizedDogs: 0,
        expensesRaised: 0,
      },
    })
  }
}
