import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { emptySignInForm, emptySignUpForm } from '../data/seedData'
import { useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { useSignIn, useSignUp } from '../hooks/use-auth'
import { createSociety } from '../lib/communityData'
import { updateMyProfile } from '../services/auth.service'
import { AreaSocietyFields } from './AreaSocietyFields'
import { AuthShell } from './AuthShell'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'

async function tryUpdateProfile(payload, attempt = 1) {
  try {
    await updateMyProfile(payload)
  } catch (err) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      return tryUpdateProfile(payload, attempt + 1)
    }
    console.warn('[AuthPage] Could not update profile:', err?.message)
  }
}

export function AuthPage({ currentPath, authError, onSignedIn, onNavigate }) {
  const isSignUp = currentPath === '/signup' || currentPath === '/sign-up'
  const [signUpForm, setSignUpForm] = useState(emptySignUpForm)
  const [signInForm, setSignInForm] = useState(emptySignInForm)
  const [errorMessage, setErrorMessage] = useState(authError)
  const areaSocietyFlow = useAreaSocietyFlow({
    autoDetect: isSignUp,
  })

  const signInMutation = useSignIn()
  const signUpMutation = useSignUp()
  const isSubmitting = signInMutation.isPending || signUpMutation.isPending
  const activeError = errorMessage || authError

  useEffect(() => {
    setErrorMessage(authError)
  }, [authError])

  async function resolveSociety(society) {
    if (!society) {
      return null
    }

    if (!society._pending) {
      return society.id
    }

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

  const handleSignUpSubmit = async (event) => {
    event.preventDefault()

    try {
      setErrorMessage('')
      const result = await signUpMutation.mutateAsync({
        fullName: signUpForm.full_name.trim(),
        email: signUpForm.email.trim(),
        password: signUpForm.password,
      })

      if (result?.user?.id) {
        const profileUpdate = {}

        if (areaSocietyFlow.areaLabel) {
          profileUpdate.neighbourhood = areaSocietyFlow.areaLabel
        }

        if (areaSocietyFlow.areaContext.pincode) {
          profileUpdate.pincode = areaSocietyFlow.areaContext.pincode
        }

        if (areaSocietyFlow.selectedSociety) {
          const societyId = await resolveSociety(areaSocietyFlow.selectedSociety)
          if (societyId) {
            profileUpdate.society_id = societyId
          }
        }

        if (Object.keys(profileUpdate).length) {
          tryUpdateProfile(profileUpdate)
        }
      }

      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.')
    }
  }

  const handleSignInSubmit = async (event) => {
    event.preventDefault()

    try {
      setErrorMessage('')
      await signInMutation.mutateAsync({
        email: signInForm.email.trim(),
        password: signInForm.password,
      })

      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign you in.')
    }
  }

  return (
    <AuthShell
      badge="StreetDog App"
      hideFeatures
      title={isSignUp ? 'Create your account' : 'Sign in to your area dashboard'}
      description={
        isSignUp
          ? 'Start with your name, email, and password. We will ask for your neighbourhood next.'
          : 'Use your email and password to access neighbourhood-based dog visibility, community records, and volunteer workflows.'
      }
      asideTitle={isSignUp ? 'Join the community' : 'Welcome back'}
      asideCopy={
        isSignUp
          ? 'A short setup helps us connect you to the right neighbourhood and the right dog records.'
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
              onChange={(event) =>
                setSignUpForm((current) => ({ ...current, full_name: event.target.value }))
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
              onChange={(event) =>
                setSignUpForm((current) => ({ ...current, email: event.target.value }))
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
              onChange={(event) =>
                setSignUpForm((current) => ({ ...current, password: event.target.value }))
              }
            />
            <FormDescription>
              Choose a password you can remember easily on mobile.
            </FormDescription>
          </FormField>

          <AreaSocietyFields
            flow={areaSocietyFlow}
            deferSocietyCreate
            cardTitle="Neighbourhood and society"
            compact
          />

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
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
              onChange={(event) =>
                setSignInForm((current) => ({ ...current, email: event.target.value }))
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
              onChange={(event) =>
                setSignInForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </FormField>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
