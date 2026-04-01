import { useEffect, useState } from 'react'
import './App.css'
import { AddDogPage } from './components/AddDogPage'
import { AdminUsersPage } from './components/AdminUsersPage'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './components/AuthPage'
import { DashboardPage } from './components/DashboardPage'
import { DogDetailPage } from './components/DogDetailPage'
import { DogsPage } from './components/DogsPage'
import { GuestReportPage } from './components/GuestReportPage'
import { InventoryAdminPage } from './components/InventoryAdminPage'
import { InventoryPage } from './components/InventoryPage'
import { LandingPage } from './components/LandingPage'
import { LoadingView } from './components/LoadingView'
import { NewInventoryRequestPage } from './components/NewInventoryRequestPage'
import { ProfileCompletionPage } from './components/ProfileCompletionPage'
import { RaiseExpensePage } from './components/RaiseExpensePage'
import { Toaster } from './components/ui/toaster'
import { resolveAuthProfileState, signOutUser, subscribeToAuthChanges } from './lib/auth'
import {
  getCurrentPath,
  getDogIdFromPath,
  getRaiseExpenseDogIdFromPath,
  isProtectedPath,
  isPublicAuthPath,
  navigateTo,
} from './lib/navigation'
import { hasSupabaseEnv } from './lib/supabaseClient'

function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath())
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(getCurrentPath())
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setIsBootstrapping(false)
      return undefined
    }

    let isMounted = true

    const syncAuthState = async () => {
      try {
        setAuthError('')
        const result = await resolveAuthProfileState()

        if (!isMounted) {
          return
        }

        setUser(result.user)
        setProfile(result.profile)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setAuthError(error instanceof Error ? error.message : 'Unable to load your session.')
        setUser(null)
        setProfile(null)
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    syncAuthState()

    const unsubscribe = subscribeToAuthChanges(() => {
      syncAuthState()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isBootstrapping) {
      return
    }

    const isAuthenticated = Boolean(user)
    const onAuthPage = isPublicAuthPath(currentPath)
    const onProfilePage = currentPath === '/profile' || currentPath === '/complete-profile'

    if (!isAuthenticated && (isProtectedPath(currentPath) || onProfilePage)) {
      navigateTo('/signin', { replace: true })
      return
    }

    if (isAuthenticated && onAuthPage) {
      navigateTo('/dashboard', { replace: true })
      return
    }

    if (isAuthenticated && currentPath === '/complete-profile') {
      navigateTo('/profile', { replace: true })
      return
    }

    if (currentPath === '/sign-in') {
      navigateTo('/signin', { replace: true })
      return
    }

    if (currentPath === '/sign-up') {
      navigateTo('/signup', { replace: true })
    }
  }, [currentPath, isBootstrapping, profile, user])

  const handleSignedIn = async () => {
    const result = await resolveAuthProfileState()
    setUser(result.user)
    setProfile(result.profile)
    return result
  }

  const handleProfileUpdated = (nextProfile) => {
    setProfile(nextProfile)
    navigateTo('/dashboard')
  }

  const handleSignOut = async () => {
    await signOutUser()
    setUser(null)
    setProfile(null)
    navigateTo('/signin')
  }

  let content = null

  if (!hasSupabaseEnv) {
    content = (
      <LoadingView
        title="Supabase setup required"
        message="Add your Supabase URL and anon key to start the Phase 1 authentication flow."
      />
    )
  } else if (isBootstrapping) {
    content = (
      <LoadingView title="Checking your session" message="Loading auth and profile details." />
    )
  } else if (!user) {
    if (currentPath === '/') {
      content = <LandingPage onNavigate={navigateTo} />
    } else if (currentPath === '/report-dog') {
      content = <GuestReportPage onNavigate={navigateTo} currentUser={user} />
    } else if (currentPath === '/dogs') {
      content = <DogsPage currentUser={user} />
    } else {
      content = (
        <AuthPage
          currentPath={currentPath}
          authError={authError}
          onSignedIn={handleSignedIn}
          onNavigate={navigateTo}
        />
      )
    }
  } else {
    const dogId = getDogIdFromPath(currentPath)
    const raiseExpenseDogId = getRaiseExpenseDogIdFromPath(currentPath)

    content = (
      <AppLayout
        user={user}
        profile={profile}
        currentPath={currentPath}
        onNavigate={navigateTo}
        onSignOut={handleSignOut}
      >
        {currentPath === '/profile' ? (
          <ProfileCompletionPage
            user={user}
            profile={profile}
            onComplete={handleProfileUpdated}
            onSignOut={handleSignOut}
          />
        ) : null}
        {currentPath === '/report-dog' ? (
          <GuestReportPage onNavigate={navigateTo} currentUser={user} />
        ) : null}
        {currentPath === '/dogs/new' ? <AddDogPage user={user} profile={profile} /> : null}
        {currentPath === '/dogs' ? <DogsPage currentUser={user} /> : null}
        {currentPath === '/inventory' ? <InventoryPage user={user} profile={profile} /> : null}
        {currentPath === '/inventory/admin' ? (
          <InventoryAdminPage user={user} profile={profile} />
        ) : null}
        {currentPath === '/inventory/new' ? (
          <NewInventoryRequestPage user={user} profile={profile} />
        ) : null}
        {currentPath === '/admin/users' ? <AdminUsersPage profile={profile} /> : null}
        {dogId ? (
          <DogDetailPage
            dogId={dogId}
            isAuthenticated={Boolean(user)}
            user={user}
            profile={profile}
          />
        ) : null}
        {raiseExpenseDogId ? <RaiseExpensePage dogId={raiseExpenseDogId} user={user} /> : null}
        {currentPath === '/dashboard' ? <DashboardPage profile={profile} /> : null}
        {currentPath !== '/dashboard' &&
        currentPath !== '/admin/users' &&
        currentPath !== '/profile' &&
        currentPath !== '/inventory' &&
        currentPath !== '/inventory/admin' &&
        currentPath !== '/inventory/new' &&
        currentPath !== '/dogs' &&
        currentPath !== '/dogs/new' &&
        currentPath !== '/report-dog' &&
        !dogId &&
        !raiseExpenseDogId ? (
          <DashboardPage profile={profile} />
        ) : null}
      </AppLayout>
    )
  }

  return (
    <>
      {content}
      <Toaster />
    </>
  )
}

export default App
