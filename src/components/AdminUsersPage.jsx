import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, MapPin, ShieldCheck, Users } from 'lucide-react'
import {
  countPendingContributions,
  createSociety,
  listLocalities,
  listProfilesForAdmin,
  listSocietiesByLocality,
  searchSocieties,
  updateUserAdminSettings,
} from '../lib/communityData'
import { normalizeAreaLabel, useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { AreaSocietyFields } from './AreaSocietyFields'
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
        .map((part) => part[0])
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

function normalizeComparable(value) {
  return normalizeAreaLabel(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function formatLocalityOption(locality) {
  const localityName = getLocalityName(locality)
  const localityCity = getLocalityCity(locality)
  return localityCity ? `${localityCity} · ${localityName}` : localityName
}

function resolveUserLocalityId(user) {
  return user?.neighbourhood_id || user?.society?.locality_id || ''
}

function getUserEffectiveLocality(user, localitiesById) {
  const localityId = resolveUserLocalityId(user)
  return localityId ? localitiesById.get(localityId) ?? null : null
}

function buildUserLocationLabel(user, localitiesById) {
  const profileAreaLabel = normalizeAreaLabel(user?.neighbourhood || '')
  if (user?.society?.name && profileAreaLabel) {
    return `${profileAreaLabel} · ${user.society.name}`
  }

  if (profileAreaLabel) {
    return profileAreaLabel
  }

  const effectiveLocality = getUserEffectiveLocality(user, localitiesById)
  const localityLabel = effectiveLocality ? formatLocalityOption(effectiveLocality) : ''

  if (user?.society?.name && localityLabel) {
    return `${localityLabel} · ${user.society.name}`
  }

  if (localityLabel) {
    return localityLabel
  }

  if (user?.society?.name) {
    return user.society.name
  }

  return 'Locality not set'
}

function buildStoredLocalityOption(user, localitiesById) {
  const localityId = resolveUserLocalityId(user)
  if (!localityId) {
    return null
  }

  return (
    localitiesById.get(localityId) || {
      id: localityId,
      name: user?.neighbourhood || 'Assigned locality',
      city: '',
    }
  )
}

function buildLocalityComparableLabels(locality) {
  const localityName = getLocalityName(locality)
  const localityCity = getLocalityCity(locality)

  return [
    locality?.name,
    locality?.locality_name,
    locality?.neighbourhood,
    locality?.label,
    localityName,
    localityCity ? `${localityCity} ${localityName}` : '',
    localityCity ? `${localityName} ${localityCity}` : '',
    localityCity ? `${localityName}, ${localityCity}` : '',
    formatLocalityOption(locality),
  ]
    .map((value) => normalizeComparable(value || ''))
    .filter(Boolean)
}

function resolveLocalityIdFromFlow({ flow, localities, fallbackLocalityId = '' }) {
  const selectedSocietyLocalityId = flow.selectedSociety?.locality_id || ''
  if (selectedSocietyLocalityId) {
    return selectedSocietyLocalityId
  }

  const candidateLabels = [
    flow.areaInput,
    flow.areaContext.neighbourhood,
    flow.areaContext.areaLabel,
    flow.areaLabel,
    flow.selectedSociety?.neighbourhood,
  ]
    .map((value) => normalizeAreaLabel(value || ''))
    .filter(Boolean)

  for (const candidateLabel of candidateLabels) {
    const comparableAreaLabel = normalizeComparable(candidateLabel)
    if (!comparableAreaLabel) {
      continue
    }

    const exactMatch = localities.find((locality) =>
      buildLocalityComparableLabels(locality).includes(comparableAreaLabel),
    )
    if (exactMatch?.id) {
      return exactMatch.id
    }

    const partialMatch = localities.find((locality) =>
      buildLocalityComparableLabels(locality).some(
        (label) => label.includes(comparableAreaLabel) || comparableAreaLabel.includes(label),
      ),
    )
    if (partialMatch?.id) {
      return partialMatch.id
    }
  }

  return fallbackLocalityId || ''
}

function buildInitialEditSociety(user, localitiesById) {
  if (!user?.society) {
    return null
  }

  const storedLocality = buildStoredLocalityOption(user, localitiesById)

  return {
    id: user.society.id,
    name: user.society.name,
    locality_id: user.society.locality_id ?? resolveUserLocalityId(user) ?? null,
    neighbourhood: user.society.neighbourhood ?? getLocalityName(storedLocality) ?? null,
    pincode: user.society.pincode ?? null,
  }
}

function buildInitialEditAreaLabel(user, localitiesById) {
  const storedLocality = buildStoredLocalityOption(user, localitiesById)
  return normalizeAreaLabel(
    user?.neighbourhood ||
      user?.society?.neighbourhood ||
      getLocalityName(storedLocality) ||
      '',
  )
}

function EditUserAccessDialog({
  user,
  localities,
  localitiesById,
  onClose,
  onSaved,
}) {
  const [role, setRole] = useState(user?.role || 'end_user')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const areaSocietyFlow = useAreaSocietyFlow({
    autoDetect: false,
  })

  const currentLocalityLabel = useMemo(() => {
    const profileAreaLabel = normalizeAreaLabel(user?.neighbourhood || '')
    if (profileAreaLabel) {
      return profileAreaLabel
    }

    const currentLocality = buildStoredLocalityOption(user, localitiesById)
    return currentLocality ? formatLocalityOption(currentLocality) : 'No locality'
  }, [user, localitiesById])

  useEffect(() => {
    const initialSociety = buildInitialEditSociety(user, localitiesById)
    const initialAreaLabel = buildInitialEditAreaLabel(user, localitiesById)

    setRole(user?.role || 'end_user')
    areaSocietyFlow.applySnapshot({
      areaInput: initialAreaLabel,
      pincode: initialSociety?.pincode || '',
      selectedSociety: initialSociety,
      manual: true,
      detectedLabel: '',
      detectedNeighbourhood: '',
      societyDraftName: '',
    })
  }, [user, localitiesById, areaSocietyFlow.applySnapshot])

  const handleRoleChange = (nextRole) => {
    setRole(nextRole)
    setErrorMessage('')

    if (nextRole === 'superadmin') {
      areaSocietyFlow.applySnapshot({
        areaInput: '',
        pincode: '',
        selectedSociety: null,
        manual: true,
        detectedLabel: '',
        detectedNeighbourhood: '',
        societyDraftName: '',
      })
    }
  }

  const handleSave = async () => {
    const isInventoryAdmin = role === 'inventory_admin'
    const isSuperadminRole = role === 'superadmin'
    let resolvedAreaLabel = normalizeAreaLabel(
      areaSocietyFlow.areaInput ||
        areaSocietyFlow.areaContext.neighbourhood ||
        areaSocietyFlow.areaLabel ||
        areaSocietyFlow.selectedSociety?.neighbourhood ||
        '',
    )
    let resolvedPincode =
      areaSocietyFlow.selectedSociety?.pincode ||
      areaSocietyFlow.areaContext.pincode ||
      user?.society?.pincode ||
      user?.pincode ||
      ''

    let resolvedLocalityId = isSuperadminRole
      ? null
      : resolveLocalityIdFromFlow({
          flow: areaSocietyFlow,
          localities,
          fallbackLocalityId: resolveUserLocalityId(user),
        }) || null

    let resolvedSocietyId = null

    if (!isSuperadminRole && !resolvedLocalityId && resolvedAreaLabel) {
      const matchingSocieties = await searchSocieties('', '', resolvedAreaLabel).catch(() => [])
      const candidateLocalityIds = [...new Set(
        matchingSocieties
          .map((society) => society?.locality_id || '')
          .filter(Boolean),
      )]

      if (candidateLocalityIds.length > 0) {
        resolvedLocalityId = candidateLocalityIds[0]
      }
    }

    if (!resolvedAreaLabel && areaSocietyFlow.selectedSociety?.neighbourhood) {
      resolvedAreaLabel = normalizeAreaLabel(areaSocietyFlow.selectedSociety.neighbourhood)
    }

    if (
      !isSuperadminRole &&
      areaSocietyFlow.selectedSociety?._pending &&
      !resolvedAreaLabel
    ) {
      setErrorMessage('Choose a neighbourhood before adding a new society for this user.')
      return
    }

    if (
      isInventoryAdmin &&
      (!resolvedAreaLabel || !areaSocietyFlow.selectedSociety)
    ) {
      setErrorMessage('Inventory admins must have neighbourhood and society assigned')
      return
    }

    if (
      isSuperadminRole &&
      (resolvedLocalityId ||
        areaSocietyFlow.selectedSociety ||
        normalizeAreaLabel(areaSocietyFlow.areaContext.neighbourhood || areaSocietyFlow.areaLabel))
    ) {
      setErrorMessage('Superadmins must not have a neighbourhood or society assigned.')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')

      if (!isSuperadminRole && areaSocietyFlow.selectedSociety) {
        if (areaSocietyFlow.selectedSociety._pending) {
          if (!areaSocietyFlow.selectedSociety.name || !areaSocietyFlow.selectedSociety.pincode) {
            throw new Error('Please choose a neighbourhood with a pincode before adding a new society.')
          }

          const createdSociety = await createSociety({
            name: areaSocietyFlow.selectedSociety.name,
            pincode: areaSocietyFlow.selectedSociety.pincode,
            neighbourhood:
              areaSocietyFlow.selectedSociety.neighbourhood ||
              areaSocietyFlow.areaContext.neighbourhood ||
              null,
            locality_id: resolvedLocalityId,
            coordinates: null,
          })

          resolvedSocietyId = createdSociety?.id ?? null
          resolvedLocalityId = createdSociety?.locality_id || resolvedLocalityId
        } else {
          resolvedSocietyId = areaSocietyFlow.selectedSociety.id || null

          if (
            areaSocietyFlow.selectedSociety.locality_id &&
            resolvedLocalityId &&
            areaSocietyFlow.selectedSociety.locality_id !== resolvedLocalityId
          ) {
            setErrorMessage('Selected society must belong to the selected neighbourhood.')
            return
          }

          resolvedLocalityId = areaSocietyFlow.selectedSociety.locality_id || resolvedLocalityId
        }
      }

      await updateUserAdminSettings(user.id, {
        role,
        neighbourhood: isSuperadminRole ? null : resolvedAreaLabel || null,
        pincode: isSuperadminRole ? null : resolvedPincode || null,
        society_id: resolvedSocietyId,
      })

      await onSaved()
      onClose()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update that user.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit user access</DialogTitle>
          <DialogDescription>
            Update role, neighbourhood, and society using the same picker flow as create account and profile.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <FormLabel>Role</FormLabel>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {formatRole(roleOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className={role === 'superadmin' ? 'pointer-events-none opacity-60 md:col-span-2' : 'md:col-span-2'}>
            <AreaSocietyFields
              flow={areaSocietyFlow}
              deferSocietyCreate
              cardTitle="Neighbourhood and society"
              compact
            />
          </div>
        </div>

        <div className="rounded-[1.1rem] border border-border/60 bg-white/70 p-3 text-sm text-muted-foreground">
          <p>
            Current neighbourhood: <span className="font-medium text-foreground">{currentLocalityLabel}</span>
          </p>
          <p>
            Current society: <span className="font-medium text-foreground">{user?.society?.name || 'No society'}</span>
          </p>
        </div>

        <div className="rounded-[1.35rem] bg-secondary/18 p-4 text-sm leading-6 text-muted-foreground">
          Inventory admins must have both neighbourhood and society assigned. Superadmins must not have a neighbourhood or society assigned. Any selected society must belong to the selected neighbourhood.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AdminUsersPage({ profile }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [editingUser, setEditingUser] = useState(null)
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

  const localityOptions = useMemo(
    () =>
      [...localities].sort((left, right) =>
        formatLocalityOption(left).localeCompare(formatLocalityOption(right)),
      ),
    [localities],
  )

  const localitiesById = useMemo(
    () => new Map(localities.map((locality) => [locality.id, locality])),
    [localities],
  )

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

  const filterSocietyOptions = useMemo(
    () =>
      filterLocalityId && filterLocalityId !== ALL_FILTER_VALUE
        ? societiesByLocality[filterLocalityId] ?? []
        : [],
    [filterLocalityId, societiesByLocality],
  )

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const effectiveLocalityId = resolveUserLocalityId(user)

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
        (user) => user.role === 'inventory_admin' && (!resolveUserLocalityId(user) || !user.society_id),
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

  const handleFilterLocalityChange = async (localityId) => {
    setFilterLocalityId(localityId)
    setFilterSocietyId(ALL_FILTER_VALUE)

    if (localityId !== ALL_FILTER_VALUE) {
      await fetchSocietiesForLocality(localityId)
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
              Review neighbourhood and society assignments, then update who can manage care and community workflows.
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
            <StatTile label="Inventory admins missing assignment" value={stats.missingLocality} icon={MapPin} color="bg-rose-50 text-rose-500" />
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
          <CardDescription>Filter members by neighbourhood, society, or role.</CardDescription>
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
            <FormLabel>Filter by Neighbourhood</FormLabel>
            <Select value={filterLocalityId} onValueChange={handleFilterLocalityChange}>
              <SelectTrigger>
                <SelectValue placeholder="All neighbourhoods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All neighbourhoods</SelectItem>
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
                      <p className="text-[0.7rem] font-mono break-all text-muted-foreground/60">
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
                      Status <span className="font-medium capitalize text-foreground">{user.status || 'active'}</span>
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setErrorMessage('')
                      setSuccessMessage('')
                      setEditingUser(user)
                    }}
                  >
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

      {editingUser ? (
        <EditUserAccessDialog
          user={editingUser}
          localities={localities}
          localitiesById={localitiesById}
          onClose={() => setEditingUser(null)}
          onSaved={async () => {
            await refetchUsers()
            setSuccessMessage('User access updated successfully.')
          }}
        />
      ) : null}
    </section>
  )
}

function StatTile({ label, value, icon, color = 'bg-secondary/40 text-foreground' }) {
  const IconComponent = icon

  return (
    <div className="flex items-center gap-3 rounded-[1.3rem] bg-secondary/30 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}
