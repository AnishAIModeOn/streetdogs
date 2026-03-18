import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { emptySignInForm, emptySignUpForm } from '../data/seedData'
import { useSignIn, useSignUp } from '../hooks/use-auth'
import { updateProfile } from '../lib/communityData'
import { AuthShell } from './AuthShell'
import { SocietyPicker } from './SocietyPicker'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'

/**
 * Attempts to update the user's profile with their chosen society.
 * Retries up to 3 times with a 600 ms delay in case the DB trigger
 * hasn't created the profile row yet (race condition on fresh sign-up).
 * Silently swallows the error because society selection is optional.
 */
async function trySaveSociety(userId, societyId, attempt = 1) {
  try {
    await updateProfile(userId, { society_id: societyId })
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 600))
      return trySaveSociety(userId, societyId, attempt + 1)
    }
    // non-fatal — user can set society from profile later
    console.warn('[SocietyPicker] Could not save society_id:', err?.message)
  }
}

export function AuthPage({ currentPath, authError, onSignedIn, onNavigate }) {
  const isSignUp = currentPath === '/signup' || currentPath === '/sign-up'
  const [signUpForm, setSignUpForm] = useState(emptySignUpForm)
  const [signInForm, setSignInForm] = useState(emptySignInForm)
  const [errorMessage, setErrorMessage] = useState(authError)
  const [selectedSociety, setSelectedSociety] = useState(null)

  const signInMutation = useSignIn()
  const signUpMutation = useSignUp()
  const isSubmitting = signInMutation.isPending || signUpMutation.isPending

  const activeError = errorMessage || authError

  useEffect(() => {
    setErrorMessage(authError)
  }, [authError])

  // Reset society pick when switching between sign-in / sign-up
  useEffect(() => {
    setSelectedSociety(null)
  }, [isSignUp])

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

      // Persist society in parallel — non-blocking, optional
      if (selectedSociety?.id && result?.user?.id) {
        trySaveSociety(result.user.id, selectedSociety.id)
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

      // If user selected a society on the sign-in form, update profile
      if (selectedSociety?.id && result?.user?.id) {
        trySaveSociety(result.user.id, selectedSociety.id)
      }

      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign you in.')
    }
  }

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
          {/* ── Core sign-up fields ── */}
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

          {/* ── Society picker ── */}
          <div className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-4">
            <SocietyPicker onSelect={setSelectedSociety} />
          </div>

          {/* ── Submit ── */}
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
          {/* ── Core sign-in fields ── */}
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

          {/* ── Society picker ── */}
          <div className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-4">
            <SocietyPicker onSelect={setSelectedSociety} />
          </div>

          {/* ── Submit ── */}
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
