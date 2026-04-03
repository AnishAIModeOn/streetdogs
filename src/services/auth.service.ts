import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { requireSupabase } from '../integrations/supabase/client'
import type { AuthSessionState, Profile } from '../types/supabase'

async function getProfile(userId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, societies(id, name, locality_id, pincode, neighbourhood)')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data as Profile
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }

  return data
}

export async function signUpWithPassword(input: {
  email: string
  password: string
  fullName: string
}) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getAuthState(): Promise<AuthSessionState> {
  const supabase = requireSupabase()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  if (!session?.user) {
    return {
      session: null,
      user: null,
      profile: null,
    }
  }

  const profile = await getProfile(session.user.id)

  return {
    session,
    user: session.user,
    profile,
  }
}

export async function updateMyProfile(payload: Partial<Profile>) {
  const authState = await getAuthState()

  if (!authState.user) {
    throw new Error('Not authenticated.')
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', authState.user.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as Profile
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = requireSupabase()
  const { data } = supabase.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}
