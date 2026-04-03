import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Filter, MapPin, ShieldCheck, Users } from 'lucide-react'
import {
  countPendingContributions,
  listLocalities,
  listProfilesForAdmin,
  listSocietiesByLocality,
  updateUserAdminSettings,
} from '../lib/communityData'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { FormField, FormLabel } from './ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

function NativeSelect({ value, onChange, disabled = false, children }) {
  return (
    <select
      className="flex h-11 w-full rounded-2xl border border-input bg-white/90 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  )
}

const roleOptions = ['end_user', 'inventory_admin', 'superadmin']
const ALL_FILTER_VALUE = '__all__'
const NO_LOCALITY_VALUE = '__none__'
const NO_SOCIETY_VALUE = '__none__'

function formatRole(role) {
  return role ? role.replaceAll('_', ' ') : 'Not set'
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
    ? name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {initials}
    </div>
  )
}

function getLocalityName(locality) {
  return (
    locality?.name ||
    locality?.locality_name ||
    locality?.neighbourhood ||
    locality?.label ||
    'Locality'
  )
}

function getLocalityCity(locality) {
  return locality?.city || locality?.district || locality?.region || ''
}

function formatLocalityOption(locality) {
  const localityName = getLocalityName(locality)
  const localityCity = getLocalityCity(locality)
  return localityCity ? `${localityCity} · ${localityName}` : localityName
}

function resolveUserLocalityId(user, localities) {
  return (
    user?.home_locality_id ||
    user?.home_locality?.id ||
    user?.society?.locality_id ||
    ''
  )
}

function getUserEffectiveLocality(user, localitiesById) {
  if (user.home_locality) {
    return user.home_locality
  }

  const fallbackLocalityId = user.society?.locality_id
  return fallbackLocalityId ? localitiesById.get(fallbackLocalityId) ?? null : null
}

function buildUserLocationLabel(user, localitiesById) {
  const effectiveLocality = getUserEffectiveLocality(user, localitiesById)
  const localityName = getLocalityName(effectiveLocality)
  const localityCity = getLocalityCity(effectiveLocality)
  const localityLabel = effectiveLocality
    ? localityCity
      ? `${localityCity} · ${localityName}`
      : localityName
    : ''

  if (user.society?.name && localityLabel) {
    return `${localityLabel} · ${user.society.name}`
  }

  if (localityLabel) {
    return localityLabel
  }

  if (user.society?.name) {
    return user.society.name
  }

  return 'Locality not set'
}

function buildStoredLocalityOption(user, localitiesById) {
  const localityId = user?.home_locality_id || user?.home_locality?.id || user?.society?.locality_id || ''
  if (!localityId) {
    return null
  }

  return (
    user.home_locality ||
    localitiesById.get(localityId) || {
      id: localityId,
      name: user.home_locality?.name || user.home_locality?.neighbourhood || 'Assigned locality',
      city: user.home_locality?.city || user.home_locality?.district || user.home_locality?.region || '',
    }
  )
}

export function AdminUsersPage({ profile }) {
  const [isSavingUserId, setIsSavingUserId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    role: 'end_user',
    home_locality_id: '',
    society_id: '',
  })
  const [societiesByLocality, setSocietiesByLocality] = useState({})
  const [filterRole, setFilterRole] = useState(ALL_FILTER_VALUE)
  const [filterLocalityId, setFilterLocalityId] = useState(ALL_FILTER_VALUE)
  const [filterSocietyId, setFilterSocietyId] = useState(ALL_FILTER_VALUE)

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
    data: localities = [],
    error: localitiesError,
  } = useQuery({
    queryKey: ['admin', 'localities'],
    queryFn: listLocalities,
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

  const fetchSocietiesForLocality = async (localityId) => {
    if (!localityId) {
      return []
    }

    if (societiesByLocality[localityId]) {
      return societiesByLocality[localityId]
    }

    const nextSocieties = await listSocietiesByLocality(localityId)
    setSocietiesByLocality((current) => ({ ...current, [localityId]: nextSocieties }))
    return nextSocieties
  }

  const seedSocietyOptionForUser = (user, localityId) => {
    if (!localityId || !user?.society?.id) {
      return
    }

    setSocietiesByLocality((current) => {
      const existing = current[localityId] ?? []
      if (existing.some((society) => society.id === user.society.id)) {
        return current
      }

      return {
        ...current,
        [localityId]: [
          ...existing,
          {
            id: user.society.id,
            name: user.society.name,
            locality_id: localityId,
            neighbourhood: user.society.neighbourhood ?? null,
            pincode: user.society.pincode ?? null,
          },
        ].sort((left, right) => left.name.localeCompare(right.name)),
      }
    })
  }

  useEffect(() => {
    if (filterLocalityId === ALL_FILTER_VALUE || filterSocietyId !== ALL_FILTER_VALUE) {
      return
    }

    fetchSocietiesForLocality(filterLocalityId).catch(() => {})
  }, [filterLocalityId, filterSocietyId])

  useEffect(() => {
    const localityId = editingUser?.home_locality_id || ''
    if (!localityId) {
      return
    }

    fetchSocietiesForLocality(localityId).catch(() => {})
  }, [editingUser?.home_locality_id, editingUser?.society?.locality_id])

  const localityOptions = useMemo(
    () => [...localities].sort((left, right) => formatLocalityOption(left).localeCompare(formatLocalityOption(right))),
    [localities],
  )

  const localitiesById = useMemo(
    () => new Map(localities.map((locality) => [locality.id, locality])),
    [localities],
  )

  const filterSocietyOptions = useMemo(
    () =>
      filterLocalityId && filterLocalityId !== ALL_FILTER_VALUE
        ? societiesByLocality[filterLocalityId] ?? []
        : [],
    [filterLocalityId, societiesByLocality],
  )

  const editLocalityOptions = useMemo(() => {
    if (!editingUser) {
      return localityOptions
    }

    const storedLocality = buildStoredLocalityOption(editingUser, localitiesById)
    if (!storedLocality?.id || localityOptions.some((locality) => locality.id === storedLocality.id)) {
      return localityOptions
    }

    return [...localityOptions, storedLocality].sort((left, right) =>
      formatLocalityOption(left).localeCompare(formatLocalityOption(right)),
    )
  }, [editingUser, localitiesById, localityOptions])

  const editSocietyOptions = useMemo(() => {
    const localityId = editForm.home_locality_id
    const currentSocieties = localityId ? societiesByLocality[localityId] ?? [] : []

    if (!editingUser?.society?.id || !localityId) {
      return currentSocieties
    }

    if (currentSocieties.some((society) => society.id === editingUser.society.id)) {
      return currentSocieties
    }

    return [
      ...currentSocieties,
      {
        id: editingUser.society.id,
        name: editingUser.society.name,
        locality_id: localityId,
        neighbourhood: editingUser.society.neighbourhood ?? null,
        pincode: editingUser.society.pincode ?? null,
      },
    ].sort((left, right) => left.name.localeCompare(right.name))
  }, [editForm.home_locality_id, editingUser, societiesByLocality])

  const currentLocalityLabel = useMemo(() => {
    if (!editingUser) {
      return 'No locality'
    }

    const currentLocality = buildStoredLocalityOption(editingUser, localitiesById)
    return currentLocality ? formatLocalityOption(currentLocality) : 'No locality'
  }, [editingUser, localitiesById])

  const selectedLocalityLabel = useMemo(() => {
    if (!editForm.home_locality_id) {
      return 'Select area'
    }

    const selectedLocality = editLocalityOptions.find((locality) => locality.id === editForm.home_locality_id)
    return selectedLocality ? formatLocalityOption(selectedLocality) : 'Select area'
  }, [editForm.home_locality_id, editLocalityOptions])

  const selectedSocietyLabel = useMemo(() => {
    if (!editForm.society_id) {
      return 'No society'
    }

    const selectedSociety = editSocietyOptions.find((society) => society.id === editForm.society_id)
    return selectedSociety?.name || 'No society'
  }, [editForm.society_id, editSocietyOptions])

  useEffect(() => {
    if (!editingUser) {
      return
    }

    setEditForm({
      role: editingUser.role || 'end_user',
      home_locality_id: resolveUserLocalityId(editingUser, localities),
      society_id: editingUser.society_id || '',
    })
  }, [editingUser, localities])

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const effectiveLocalityId = resolveUserLocalityId(user, localities)

        if (filterRole !== ALL_FILTER_VALUE && user.role !== filterRole) {
          return false
        }

        if (filterLocalityId !== ALL_FILTER_VALUE && effectiveLocalityId !== filterLocalityId) {
          return false
        }

        if (filterSocietyId !== ALL_FILTER_VALUE && user.society_id !== filterSocietyId) {
          return false
        }

        return true
      }),
    [filterLocalityId, filterRole, filterSocietyId, users],
  )

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => ['inventory_admin', 'superadmin'].includes(user.role)).length,
      missingLocality: users.filter(
        (user) => user.role === 'inventory_admin' && !resolveUserLocalityId(user, localities),
      ).length,
      inactiveProfiles: users.filter((user) => user.status === 'inactive').length,
    }),
    [users],
  )

  const activeErrorMessage =
    errorMessage ||
    (usersError instanceof Error ? usersError.message : '') ||
    (pendingError instanceof Error ? pendingError.message : '') ||
    (localitiesError instanceof Error ? localitiesError.message : '')

  const openEditModal = async (user) => {
    setErrorMessage('')
    setSuccessMessage('')

    setEditForm({
      role: user.role || 'end_user',
      home_locality_id: resolveUserLocalityId(user, localities),
      society_id: user.society_id || '',
    })
    setEditingUser(user)

    const effectiveLocalityId = resolveUserLocalityId(user, localities)
    if (effectiveLocalityId) {
      seedSocietyOptionForUser(user, effectiveLocalityId)
      fetchSocietiesForLocality(effectiveLocalityId).catch(() => {})
    }
  }

  const closeEditModal = () => {
    setEditingUser(null)
    setEditForm({
      role: 'end_user',
      home_locality_id: '',
      society_id: '',
    })
  }

  const handleEditRoleChange = (role) => {
    setEditForm((current) => {
      if (role === 'superadmin') {
        return {
          role,
          home_locality_id: '',
          society_id: '',
        }
      }

      const fallbackLocalityId = current.home_locality_id || editingUser?.home_locality_id || ''
      return {
        ...current,
        role,
        home_locality_id: fallbackLocalityId,
        society_id: fallbackLocalityId ? current.society_id : '',
      }
    })
  }

  const handleEditLocalityChange = async (localityId) => {
    const nextLocalityId = localityId === NO_LOCALITY_VALUE ? '' : localityId
    setEditForm((current) => ({
      ...current,
      home_locality_id: nextLocalityId,
      society_id: '',
    }))

    if (nextLocalityId) {
      await fetchSocietiesForLocality(nextLocalityId)
    }
  }

  const handleFilterLocalityChange = async (localityId) => {
    setFilterLocalityId(localityId)
    setFilterSocietyId(ALL_FILTER_VALUE)

    if (localityId !== ALL_FILTER_VALUE) {
      await fetchSocietiesForLocality(localityId)
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) {
      return
    }

    const isInventoryAdmin = editForm.role === 'inventory_admin'
    const isSuperadminRole = editForm.role === 'superadmin'
    let resolvedLocalityId = isSuperadminRole ? null : editForm.home_locality_id || null
    const resolvedSocietyId = isSuperadminRole ? null : editForm.society_id || null

    if (isInventoryAdmin && !resolvedLocalityId) {
      setErrorMessage('Inventory admins must have a locality assigned.')
      return
    }

    if (isSuperadminRole && (resolvedLocalityId || resolvedSocietyId)) {
      setErrorMessage('Superadmins must not have a locality or society assigned.')
      return
    }

    if (resolvedSocietyId) {
      const matchingSociety = (societiesByLocality[resolvedLocalityId] ?? []).find(
        (society) => society.id === resolvedSocietyId,
      )
      if (!matchingSociety || matchingSociety.locality_id !== resolvedLocalityId) {
        setErrorMessage('Selected society must belong to the selected locality.')
        return
      }
      resolvedLocalityId = matchingSociety.locality_id || resolvedLocalityId
    }

    try {
      setIsSavingUserId(editingUser.id)
      setErrorMessage('')
      setSuccessMessage('')
      await updateUserAdminSettings(editingUser.id, {
        role: editForm.role,
        home_locality_id: resolvedLocalityId,
        society_id: resolvedSocietyId,
      })
      await refetchUsers()
      closeEditModal()
      setSuccessMessage('User access updated successfully.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update that user.')
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

  return (
    <section className="space-y-6">
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
              Review locality and society assignments, then update who can manage care and community workflows.
            </p>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>Community snapshot</CardTitle>
            <CardDescription>Quick totals from visible profile records.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile label="Total members" value={stats.total} icon={Users} color="bg-primary/10 text-primary" />
            <StatTile label="Admin roles" value={stats.admins} icon={ShieldCheck} color="bg-amber-50 text-amber-600" />
            <StatTile label="Inventory admins missing locality" value={stats.missingLocality} icon={MapPin} color="bg-rose-50 text-rose-500" />
            <StatTile label="Pending approvals" value={pendingContributions} icon={ShieldCheck} color="bg-emerald-50 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      {activeErrorMessage ? <StatusBanner variant="error">{activeErrorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      <Card className="rounded-[2rem] border-white/65 bg-white/95 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter members by locality, society, or role.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField>
            <FormLabel>Filter by Role</FormLabel>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {formatRole(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <FormLabel>Filter by Area</FormLabel>
            <Select value={filterLocalityId} onValueChange={handleFilterLocalityChange}>
              <SelectTrigger>
                <SelectValue placeholder="All localities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All localities</SelectItem>
                {localityOptions.map((locality) => (
                  <SelectItem key={locality.id} value={locality.id}>
                    {formatLocalityOption(locality)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <FormLabel>Filter by Society</FormLabel>
            <Select
              value={filterSocietyId}
              onValueChange={setFilterSocietyId}
              disabled={filterLocalityId === ALL_FILTER_VALUE}
            >
              <SelectTrigger>
                <SelectValue placeholder="All societies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All societies</SelectItem>
                {filterSocietyOptions.map((society) => (
                  <SelectItem key={society.id} value={society.id}>
                    {society.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

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
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              className="overflow-hidden rounded-[2rem] border-white/65 bg-white/95 shadow-soft transition-shadow hover:shadow-float"
            >
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <UserAvatar name={user.full_name} />
                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-[0.95rem] font-bold text-foreground">
                        {user.full_name || 'Name not added'}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {buildUserLocationLabel(user, localitiesById)}
                      </p>
                      <p className="text-[0.7rem] text-muted-foreground/80">
                        {user.society?.name ? `Society: ${user.society.name}` : 'No society assigned'}
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

                <div className="my-4 h-px bg-border/50" />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      Joined <span className="font-medium text-foreground">{new Date(user.created_at).toLocaleDateString()}</span>
                    </span>
                    <span>
                      Status <span className="font-medium text-foreground capitalize">{user.status || 'active'}</span>
                    </span>
                  </div>
                  <Button type="button" onClick={() => openEditModal(user)}>
                    Edit user
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!filteredUsers.length ? (
            <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
              <CardContent className="space-y-2 p-10 text-center">
                <h3 className="text-xl font-bold text-foreground">No users match these filters</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Try clearing one or more filters to broaden the results.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent key={editingUser?.id || 'no-user'} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit user access</DialogTitle>
            <DialogDescription>
              Update role, locality, and society using the new locality plus society model.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField>
              <FormLabel>Role</FormLabel>
              <NativeSelect key={`role-${editingUser?.id || 'new'}-${editForm.role}`} value={editForm.role} onChange={handleEditRoleChange}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            <FormField className="md:col-span-2 gap-3">
              <FormLabel>Location</FormLabel>
              <div className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-white/75 bg-white/92 px-3 py-2 text-left shadow-soft">
                <span className="min-w-0 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-primary/80" />
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {selectedLocalityLabel}
                    <span className="mx-1.5 text-muted-foreground">•</span>
                    <span className="font-normal text-muted-foreground">{selectedSocietyLabel}</span>
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField>
                  <FormLabel>Area</FormLabel>
                  <NativeSelect
                    key={`locality-${editingUser?.id || 'new'}-${editForm.home_locality_id || NO_LOCALITY_VALUE}`}
                    value={editForm.home_locality_id || NO_LOCALITY_VALUE}
                    onChange={handleEditLocalityChange}
                    disabled={editForm.role === 'superadmin'}
                  >
                    <option value={NO_LOCALITY_VALUE}>No locality</option>
                    {editLocalityOptions.map((locality) => (
                      <option key={locality.id} value={locality.id}>
                        {formatLocalityOption(locality)}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>

                <FormField>
                  <FormLabel>Society</FormLabel>
                  <NativeSelect
                    key={`society-${editingUser?.id || 'new'}-${editForm.society_id || NO_SOCIETY_VALUE}`}
                    value={editForm.society_id || NO_SOCIETY_VALUE}
                    onChange={(value) =>
                      setEditForm((current) => ({
                        ...current,
                        society_id: value === NO_SOCIETY_VALUE ? '' : value,
                      }))
                    }
                    disabled={editForm.role === 'superadmin' || !editForm.home_locality_id}
                  >
                    <option value={NO_SOCIETY_VALUE}>No society</option>
                    {editSocietyOptions.map((society) => (
                      <option key={society.id} value={society.id}>
                        {society.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              </div>
            </FormField>
          </div>

          <div className="rounded-[1.1rem] border border-border/60 bg-white/70 p-3 text-sm text-muted-foreground">
            <p>Current area: <span className="font-medium text-foreground">{currentLocalityLabel}</span></p>
            <p>Current society: <span className="font-medium text-foreground">{editingUser?.society?.name || 'No society'}</span></p>
          </div>

          <div className="rounded-[1.35rem] bg-secondary/18 p-4 text-sm leading-6 text-muted-foreground">
            Inventory admins must have a locality and may optionally have a society. Superadmins must not have a locality or society assigned. Any selected society must belong to the selected locality.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!editingUser || isSavingUserId === editingUser?.id}
              onClick={handleSaveUser}
            >
              {isSavingUserId === editingUser?.id ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
