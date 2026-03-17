import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { countPendingContributions, listProfilesForAdmin, updateUserRole } from '../lib/communityData'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const roleOptions = ['end_user', 'inventory_admin', 'superadmin']

function formatRole(role) {
  return role ? role.replaceAll('_', ' ') : 'Not set'
}

export function AdminUsersPage({ profile }) {
  const [draftRoles, setDraftRoles] = useState({})
  const [isSavingUserId, setIsSavingUserId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isSuperadmin = profile?.role === 'superadmin'
  const {
    data: users = [],
    isLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: listProfilesForAdmin,
    enabled: isSuperadmin,
  })
  const {
    data: pendingContributions = 0,
    error: pendingError,
  } = useQuery({
    queryKey: ['admin', 'pending-contributions'],
    queryFn: countPendingContributions,
    enabled: isSuperadmin,
  })

  const usersWithDrafts = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        draftRole: draftRoles[user.id] || user.role || 'end_user',
      })),
    [draftRoles, users],
  )

  useEffect(() => {
    if (!users.length) {
      return
    }

    setDraftRoles((current) => {
      const nextDrafts = Object.fromEntries(users.map((user) => [user.id, user.role || 'end_user']))

      if (JSON.stringify(current) === JSON.stringify(nextDrafts)) {
        return current
      }

      return nextDrafts
    })
  }, [users])

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => ['inventory_admin', 'superadmin'].includes(user.role)).length,
      missingArea: users.filter((user) => !user.primary_area).length,
      inactiveProfiles: users.filter((user) => user.status === 'inactive').length,
    }),
    [users],
  )

  const handleSaveRole = async (userId) => {
    try {
      setIsSavingUserId(userId)
      setErrorMessage('')
      setSuccessMessage('')
      await updateUserRole(userId, draftRoles[userId])
      await refetchUsers()
      setSuccessMessage('Role updated successfully.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update that user role.')
    } finally {
      setIsSavingUserId(null)
    }
  }

  if (!isSuperadmin) {
    return (
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-2 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">Unauthorized</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Only superadmin users can manage roles on this page.
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  const activeErrorMessage =
    errorMessage ||
    (usersError instanceof Error ? usersError.message : '') ||
    (pendingError instanceof Error ? pendingError.message : '')

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Admin
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Manage user roles
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Review area assignments and update one role at a time without leaving the StreetDog
              App admin flow.
            </p>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Admin snapshot</CardTitle>
            <CardDescription>Quick totals from visible profile records.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatTile label="Total users" value={stats.total} />
            <StatTile label="Admin roles" value={stats.admins} />
            <StatTile label="Missing area" value={stats.missingArea} />
            <StatTile label="Pending approvals" value={pendingContributions} />
            <StatTile label="Inactive profiles" value={stats.inactiveProfiles} />
          </CardContent>
        </Card>
      </div>

      {activeErrorMessage ? <StatusBanner variant="error">{activeErrorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[2rem] border border-border/70 bg-white/70"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {usersWithDrafts.map((user) => (
            <Card key={user.id} className="rounded-[2rem] border-white/70 bg-white/90">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle>{user.full_name || 'Name not added'}</CardTitle>
                    <CardDescription>
                      {user.primary_area
                        ? `${user.primary_area.city} - ${user.primary_area.name}`
                        : 'Primary area not set'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{formatRole(user.role)}</Badge>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile label="Created" value={new Date(user.created_at).toLocaleString()} />
                  <InfoTile label="User ID" value={user.id} mono />
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Role</p>
                    <Select
                      value={user.draftRole}
                      onValueChange={(value) =>
                        setDraftRoles((current) => ({
                          ...current,
                          [user.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {formatRole(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    disabled={isSavingUserId === user.id || user.draftRole === user.role}
                    onClick={() => handleSaveRole(user.id)}
                  >
                    {isSavingUserId === user.id ? 'Saving...' : 'Update role'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/35 p-4 shadow-soft">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function InfoTile({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl bg-secondary/30 p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-sm font-medium text-foreground ${mono ? 'break-all font-mono text-xs' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}
