import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, MapPin, ShieldCheck, Users } from 'lucide-react'
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

const roleOptions = ['end_user', 'inventory_admin', 'superadmin']
const ALL_FILTER_VALUE = '__all__'
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
    ? name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
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

function buildUserLocationLabel(user) {
  const localityName = getLocalityName(user.home_locality)
  const localityCity = getLocalityCity(user.home_locality)
  const localityLabel = user.home_locality ? (localityCity ? `${localityCity} · ${localityName}` : localityName) : ''

  if (user.society?.name && localityLabel) {
    return `${localityLabel} · ${user.society.name}`
  }

  if (localityLabel) {
    return localityLabel
  }

  return 'Locality not set'
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

  useEffect(() => {
    if (filterLocalityId === ALL_FILTER_VALUE || filterSocietyId !== ALL_FILTER_VALUE) {
      return
    }

    fetchSocietiesForLocality(filterLocalityId).catch(() => {})
  }, [filterLocalityId, filterSocietyId])

  useEffect(() => {
    if (!editingUser?.home_locality_id) {
      return
    }

    fetchSocietiesForLocality(editingUser.home_locality_id).catch(() => {})
  }, [editingUser?.home_locality_id])

  const localityOptions = useMemo(
    () => [...localities].sort((left, right) => `${left.city} ${left.name}`.localeCompare(`${right.city} ${right.name}`)),
    [localities],
  )

  const filterSocietyOptions = useMemo(
    () =>
      filterLocalityId && filterLocalityId !== ALL_FILTER_VALUE
        ? societiesByLocality[filterLocalityId] ?? []
        : [],
    [filterLocalityId, societiesByLocality],
  )

  const editSocietyOptions = useMemo(
    () => societiesByLocality[editForm.home_locality_id] ?? [],
    [editForm.home_locality_id, societiesByLocality],
  )

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (filterRole !== ALL_FILTER_VALUE && user.role !== filterRole) {
          return false
        }

        if (filterLocalityId !== ALL_FILTER_VALUE && user.home_locality_id !== filterLocalityId) {
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
        (user) => user.role === 'inventory_admin' && !user.home_locality_id,
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

    if (user.home_locality_id) {
      await fetchSocietiesForLocality(user.home_locality_id)
    }

    setEditForm({
      role: user.role || 'end_user',
      home_locality_id: user.home_locality_id || '',
      society_id: user.society_id || '',
    })
    setEditingUser(user)
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

      return {
        ...current,
        role,
      }
    })
  }

  const handleEditLocalityChange = async (localityId) => {
    const nextLocalityId = localityId === NO_SOCIETY_VALUE ? '' : localityId
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

    if (isInventoryAdmin && !editForm.home_locality_id) {
      setErrorMessage('Inventory admins must have a locality assigned.')
      return
    }

    if (isSuperadminRole && (editForm.home_locality_id || editForm.society_id)) {
      setErrorMessage('Superadmins must not have a locality or society assigned.')
      return
    }

    if (editForm.society_id) {
      const matchingSociety = editSocietyOptions.find((society) => society.id === editForm.society_id)
      if (!matchingSociety || matchingSociety.locality_id !== editForm.home_locality_id) {
        setErrorMessage('Selected society must belong to the selected locality.')
        return
      }
    }

    try {
      setIsSavingUserId(editingUser.id)
      setErrorMessage('')
      setSuccessMessage('')
      await updateUserAdminSettings(editingUser.id, {
        role: editForm.role,
        home_locality_id: isSuperadminRole ? null : editForm.home_locality_id || null,
        society_id: isSuperadminRole ? null : editForm.society_id || null,
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
                        {buildUserLocationLabel(user)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit user access</DialogTitle>
            <DialogDescription>
              Update role, locality, and society using the new locality plus society model.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField>
              <FormLabel>Role</FormLabel>
              <Select value={editForm.role} onValueChange={handleEditRoleChange}>
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
            </FormField>

            <FormField>
              <FormLabel>Area</FormLabel>
              <Select
                value={editForm.home_locality_id || NO_SOCIETY_VALUE}
                onValueChange={handleEditLocalityChange}
                disabled={editForm.role === 'superadmin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select locality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SOCIETY_VALUE}>No locality</SelectItem>
                  {localityOptions.map((locality) => (
                    <SelectItem key={locality.id} value={locality.id}>
                      {formatLocalityOption(locality)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField className="md:col-span-2">
              <FormLabel>Society</FormLabel>
              <Select
                value={editForm.society_id || NO_SOCIETY_VALUE}
                onValueChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    society_id: value === NO_SOCIETY_VALUE ? '' : value,
                  }))
                }
                disabled={editForm.role === 'superadmin' || !editForm.home_locality_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select society" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SOCIETY_VALUE}>No society</SelectItem>
                  {editSocietyOptions.map((society) => (
                    <SelectItem key={society.id} value={society.id}>
                      {society.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
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
