import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ShieldCheck, Users } from 'lucide-react'
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

function getRoleVariant(role) {
  switch (role) {
    case 'superadmin':
      return 'default'
    case 'inventory_admin':
      return 'warning'
    default:
      return 'outline'
  }
}

function getRoleColor(role) {
  switch (role) {
    case 'superadmin':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'inventory_admin':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-secondary/60 text-muted-foreground border-border'
  }
}

function UserAvatar({ name }) {
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?'
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {initials}
    </div>
  )
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Restricted area</h3>
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
      {/* Page header */}
      <div className="grid gap-4 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Admin
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Manage community roles
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Review area assignments and update access levels so the right people can take care of
              the right dogs.
            </p>
          </div>
        </div>

        {/* Stats snapshot */}
        <Card className="rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>Community snapshot</CardTitle>
            <CardDescription>Quick totals from visible profile records.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile
              label="Total members"
              value={stats.total}
              icon={Users}
              color="bg-primary/10 text-primary"
            />
            <StatTile
              label="Admin roles"
              value={stats.admins}
              icon={ShieldCheck}
              color="bg-amber-50 text-amber-600"
            />
            <StatTile
              label="Missing area"
              value={stats.missingArea}
              icon={MapPin}
              color="bg-rose-50 text-rose-500"
            />
            <StatTile
              label="Pending approvals"
              value={pendingContributions}
              icon={ShieldCheck}
              color="bg-emerald-50 text-emerald-600"
            />
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
              className="h-36 animate-pulse rounded-[2rem] border border-border/50 bg-white/65"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {usersWithDrafts.map((user) => (
            <Card
              key={user.id}
              className="overflow-hidden rounded-[2rem] border-white/65 bg-white/95 shadow-soft transition-shadow hover:shadow-float"
            >
              <CardContent className="p-5">
                {/* Top row: avatar + name + role badge */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <UserAvatar name={user.full_name} />
                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-[0.95rem] font-bold text-foreground">
                        {user.full_name || 'Name not added'}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {user.primary_area
                          ? `${user.primary_area.city} · ${user.primary_area.name}`
                          : 'Primary area not set'}
                      </p>
                      <p className="text-[0.7rem] font-mono text-muted-foreground/60 break-all">
                        {user.id}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`self-start rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getRoleColor(user.role)}`}
                  >
                    {formatRole(user.role)}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-border/50" />

                {/* Role editor */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Update role
                    </p>
                    <Select
                      value={user.draftRole}
                      onValueChange={(value) =>
                        setDraftRoles((current) => ({ ...current, [user.id]: value }))
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
                    {isSavingUserId === user.id ? 'Saving...' : 'Save Role'}
                  </Button>
                </div>

                {/* Metadata row */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Joined{' '}
                    <span className="font-medium text-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function StatTile({ label, value, icon: Icon, color = 'bg-secondary/40 text-foreground' }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.3rem] bg-secondary/30 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}
