import { ensureSupabase } from './supabaseClient'
import { getProfile } from './communityData'

function toFriendlyAuthError(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage
  }

  if (error.message?.includes('Invalid login credentials')) {
    return 'That email or password did not match. Please try again.'
  }

  if (error.message?.toLowerCase().includes('email not confirmed')) {
    return 'Unable to sign in with this account right now. Please try again or create a new account.'
  }

  return error.message || fallbackMessage
}

export async function signUpWithEmail({ fullName, email, password }) {
  const client = ensureSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(toFriendlyAuthError(error, 'Unable to create your account right now.'))
  }

  return data
}

export async function signInWithEmail({ email, password }) {
  const client = ensureSupabase()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(toFriendlyAuthError(error, 'Unable to sign you in right now.'))
  }

  return data
}

export async function signOutUser() {
  const client = ensureSupabase()
  const { error } = await client.auth.signOut()

  if (error) {
    throw new Error(toFriendlyAuthError(error, 'Unable to sign you out right now.'))
  }
}

export async function getCurrentSession() {
  const client = ensureSupabase()
  const { data, error } = await client.auth.getSession()

  if (error) {
    throw new Error(toFriendlyAuthError(error, 'Unable to restore your session.'))
  }

  return data.session ?? null
}

export async function getCurrentUserProfile() {
  const session = await getCurrentSession()

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

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function getProfileWithRetry(userId, options = {}) {
  const {
    attempts = 4,
    delayMs = 350,
  } = options

  let profile = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    profile = await getProfile(userId)

    if (profile || attempt === attempts) {
      return profile
    }

    await wait(delayMs)
  }

  return profile
}

export async function resolveAuthProfileState() {
  const session = await getCurrentSession()

  if (!session?.user) {
    return {
      session: null,
      user: null,
      profile: null,
      redirectTo: '/sign-in',
    }
  }

  const profile = await getProfileWithRetry(session.user.id)
  const redirectTo = '/dashboard'

  return {
    session,
    user: session.user,
    profile,
    redirectTo,
  }
}

export function subscribeToAuthChanges(callback) {
  const client = ensureSupabase()
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null)
  })

  return () => data.subscription.unsubscribe()
}
