import { useEffect, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { emptySignInForm, emptySignUpForm } from '../data/seedData'
import { useSignIn, useSignUp } from '../hooks/use-auth'
import { createSociety, updateProfile } from '../lib/communityData'
import { AuthShell } from './AuthShell'
import { SocietyPicker } from './SocietyPicker'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_KEY) return { pincode: '', neighbourhood: '' }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  const components = json?.results?.[0]?.address_components ?? []
  const get = (...types) => {
    const match = components.find((c) => types.some((t) => c.types.includes(t)))
    return match?.long_name ?? ''
  }
  return {
    pincode: get('postal_code'),
    neighbourhood:
      get('sublocality_level_1') ||
      get('neighborhood') ||
      get('sublocality') ||
      get('administrative_area_level_3'),
  }
}

/**
 * Attempts to update the user's profile with their chosen society.
 * Retries up to 3 times with a 600 ms delay in case the DB trigger
 * hasn't created the profile row yet (race condition on fresh sign-up).
 */
async function trySaveSociety(userId, societyId, attempt = 1) {
  try {
    await updateProfile(userId, { society_id: societyId })
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 600))
      return trySaveSociety(userId, societyId, attempt + 1)
    }
    console.warn('[SocietyPicker] Could not save society_id:', err?.message)
  }
}

function usePincodeDetection() {
  const [pincode, setPincode] = useState('')
  const [detecting, setDetecting] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setDetecting(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { pincode: detected } = await reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude,
          )
          if (detected) setPincode(detected)
        } catch {
          // silent — user can type manually
        } finally {
          setDetecting(false)
        }
      },
      () => setDetecting(false),
      { timeout: 9000, maximumAge: 60_000 },
    )
  }, [])

  return { pincode, setPincode, detecting }
}

export function AuthPage({ currentPath, authError, onSignedIn, onNavigate }) {
  const isSignUp = currentPath === '/signup' || currentPath === '/sign-up'
  const [signUpForm, setSignUpForm] = useState(emptySignUpForm)
  const [signInForm, setSignInForm] = useState(emptySignInForm)
  const [errorMessage, setErrorMessage] = useState(authError)
  const [selectedSociety, setSelectedSociety] = useState(null)

  const { pincode, setPincode, detecting } = usePincodeDetection()

  const signInMutation = useSignIn()
  const signUpMutation = useSignUp()
  const isSubmitting = signInMutation.isPending || signUpMutation.isPending

  const activeError = errorMessage || authError

  useEffect(() => {
    setErrorMessage(authError)
  }, [authError])

  useEffect(() => {
    setSelectedSociety(null)
  }, [isSignUp])

  async function resolveSociety(society) {
    if (!society) return null
    if (!society._pending) return society.id
    try {
      const created = await createSociety({
        name: society.name,
        pincode: society.pincode,
        neighbourhood: society.neighbourhood || null,
        coordinates: null,
      })
      return created?.id ?? null
    } catch {
      return null
    }
  }

  // ── Sign-up ────────────────────────────────────────────────
  const handleSignUpSubmit = async (event) => {
    event.preventDefault()
    try {
      setErrorMessage('')
      const result = await signUpMutation.mutateAsync({
        fullName: signUpForm.full_name.trim(),
        email: signUpForm.email.trim(),
        password: signUpForm.password,
      })

      if (result?.user?.id && selectedSociety) {
        const societyId = await resolveSociety(selectedSociety)
        if (societyId) trySaveSociety(result.user.id, societyId)
      }

      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.')
    }
  }

  // ── Sign-in ────────────────────────────────────────────────
  const handleSignInSubmit = async (event) => {
    event.preventDefault()
    try {
      setErrorMessage('')
      const result = await signInMutation.mutateAsync({
        email: signInForm.email.trim(),
        password: signInForm.password,
      })

      if (result?.user?.id && selectedSociety) {
        const societyId = await resolveSociety(selectedSociety)
        if (societyId) trySaveSociety(result.user.id, societyId)
      }

      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign you in.')
    }
  }

  const pincodeField = (
    <FormField>
      <FormLabel>PIN Code</FormLabel>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={detecting ? 'Detecting location…' : 'e.g. 560001'}
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
        />
        {detecting && (
          <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {!detecting && pincode && (
        <FormDescription>Auto-detected · you can edit if needed.</FormDescription>
      )}
    </FormField>
  )

  const societyPicker = (
    <div className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-4">
      <SocietyPicker
        pincode={pincode}
        onSelect={setSelectedSociety}
        deferCreate
      />
    </div>
  )

  return (
    <AuthShell
      badge="StreetDog App"
      title={isSignUp ? 'Create your account' : 'Sign in to your area dashboard'}
      description={
        isSignUp
          ? 'Start with your name, email, and password. We will ask for your primary area next.'
          : 'Use your email and password to access area-based dog visibility, community records, and volunteer workflows.'
      }
      asideTitle={isSignUp ? 'Join the community' : 'Welcome back'}
      asideCopy={
        isSignUp
          ? 'A short setup helps us connect you to the right area and the right dog records.'
          : 'Sign in to continue supporting dogs in your neighborhood with one shared workspace.'
      }
      footer={
        <div className="flex flex-col gap-3 rounded-2xl bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : 'New here?'}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="justify-start sm:justify-center"
            onClick={() => onNavigate(isSignUp ? '/signin' : '/signup')}
          >
            {isSignUp ? 'Go to sign in' : 'Create an account'}
          </Button>
        </div>
      }
    >
      {activeError ? <StatusBanner variant="error">{activeError}</StatusBanner> : null}

      {isSignUp ? (
        <form className="grid gap-4" onSubmit={handleSignUpSubmit}>
          <FormField>
            <FormLabel>Full name</FormLabel>
            <Input
              required
              placeholder="Volunteer or caregiver name"
              value={signUpForm.full_name}
              onChange={(e) =>
                setSignUpForm((c) => ({ ...c, full_name: e.target.value }))
              }
            />
          </FormField>

          <FormField>
            <FormLabel>Email</FormLabel>
            <Input
              required
              type="email"
              placeholder="name@example.com"
              value={signUpForm.email}
              onChange={(e) =>
                setSignUpForm((c) => ({ ...c, email: e.target.value }))
              }
            />
          </FormField>

          <FormField>
            <FormLabel>Password</FormLabel>
            <Input
              required
              type="password"
              minLength="6"
              placeholder="At least 6 characters"
              value={signUpForm.password}
              onChange={(e) =>
                setSignUpForm((c) => ({ ...c, password: e.target.value }))
              }
            />
            <FormDescription>
              Choose a password you can remember easily on mobile.
            </FormDescription>
          </FormField>

          {pincodeField}
          {societyPicker}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      ) : (
        <form className="grid gap-4" onSubmit={handleSignInSubmit}>
          <FormField>
            <FormLabel>Email</FormLabel>
            <Input
              required
              type="email"
              placeholder="name@example.com"
              value={signInForm.email}
              onChange={(e) =>
                setSignInForm((c) => ({ ...c, email: e.target.value }))
              }
            />
          </FormField>

          <FormField>
            <FormLabel>Password</FormLabel>
            <Input
              required
              type="password"
              placeholder="Enter your password"
              value={signInForm.password}
              onChange={(e) =>
                setSignInForm((c) => ({ ...c, password: e.target.value }))
              }
            />
          </FormField>

          {pincodeField}
          {societyPicker}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <FormMessage className="text-muted-foreground">
            Area-specific visibility is applied after sign-in.
          </FormMessage>
        </form>
      )}
    </AuthShell>
  )
}
