import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthState } from '../hooks/use-auth'
import type { ProfileRole } from '../types/supabase'

interface ProtectedRouteProps {
  children?: ReactNode
  allowedRoles?: ProfileRole[]
  redirectTo?: string
  loadingFallback?: ReactNode
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
  loadingFallback = <div className="p-6 text-sm text-muted-foreground">Checking access...</div>,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { data, isLoading } = useAuthState()

  if (isLoading) {
    return <>{loadingFallback}</>
  }

  if (!data?.user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  if (allowedRoles?.length && (!data.profile || !allowedRoles.includes(data.profile.role))) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children ?? <Outlet />}</>
}
