import { useState } from 'react'
import { emptySignInForm, emptySignUpForm } from '../data/seedData'
import { signInWithEmail, signUpWithEmail } from '../lib/auth'
import { AuthShell } from './AuthShell'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'

export function AuthPage({ currentPath, authError, onSignedIn, onNavigate }) {
  const isSignUp = currentPath === '/signup' || currentPath === '/sign-up'
  const [signUpForm, setSignUpForm] = useState(emptySignUpForm)
  const [signInForm, setSignInForm] = useState(emptySignInForm)
  const [errorMessage, setErrorMessage] = useState(authError)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeError = errorMessage || authError

  const handleSignUpSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      await signUpWithEmail({
        fullName: signUpForm.full_name.trim(),
        email: signUpForm.email.trim(),
        password: signUpForm.password,
      })
      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignInSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      await signInWithEmail({
        email: signInForm.email.trim(),
        password: signInForm.password,
      })
      const authState = await onSignedIn()
      onNavigate(authState.redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign you in.')
    } finally {
      setIsSubmitting(false)
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
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
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
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
          <FormMessage className="text-muted-foreground">
            Area-specific visibility is applied after sign-in.
          </FormMessage>
        </form>
      )}
    </AuthShell>
  )
}
