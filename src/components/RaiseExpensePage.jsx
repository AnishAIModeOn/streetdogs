import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, Dog, Loader2, MapPin } from 'lucide-react'
import { emptyExpenseForm } from '../data/seedData'
import { useDogs } from '../hooks/use-dogs'
import { getDog, getProfile, listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { useCreateExpense } from '../hooks/use-expenses'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

const expenseTypes = ['food', 'medical', 'vaccination', 'rescue', 'other']

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

function buildDogDisplayLocation(dog) {
  return (
    dog?.locality_name ||
    dog?.tagged_area_neighbourhood ||
    dog?.society_name ||
    dog?.tagged_society_name ||
    dog?.location_description ||
    'Location unavailable'
  )
}

function toSocietyState(profile) {
  if (!profile?.society_id && !profile?.societies?.name) {
    return null
  }

  return {
    id: profile?.society_id || profile?.societies?.id || null,
    name: profile?.societies?.name || '',
  }
}

function normalizeText(value) {
  return (value || '').trim().toLowerCase()
}

export function RaiseExpensePage({ dogId, user }) {
  const [linkedDog, setLinkedDog] = useState(null)
  const [profile, setProfile] = useState(null)
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState(emptyExpenseForm)
  const [selectedDogIds, setSelectedDogIds] = useState(dogId ? [dogId] : [])
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [societyName, setSocietyName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const { data: dogs = [] } = useDogs()
  const createExpenseMutation = useCreateExpense()

  useEffect(() => {
    let isMounted = true

    const loadContext = async () => {
      try {
        setErrorMessage('')
        const [nextProfile, nextAreas, nextDog] = await Promise.all([
          getProfile(user.id),
          listAreas(),
          dogId ? getDog(dogId) : Promise.resolve(null),
        ])

        if (!isMounted) {
          return
        }

        setProfile(nextProfile)
        setAreas(nextAreas)
        setLinkedDog(nextDog)

        const nextSociety = toSocietyState(nextProfile)
        setSelectedSociety(nextSociety)
        setSocietyName(nextSociety?.name || '')
        setSelectedDogIds(nextDog?.id ? [nextDog.id] : dogId ? [dogId] : [])
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load expense form context.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadContext()

    return () => {
      isMounted = false
    }
  }, [dogId, user.id])

  const areasById = useMemo(() => Object.fromEntries(areas.map((area) => [area.id, area])), [areas])

  const profileAreaId = profile?.home_locality_id || profile?.primary_area_id || linkedDog?.area_id || ''
  const currentArea = profileAreaId ? areasById[profileAreaId] : null
  const normalizedSocietyName = normalizeText(societyName)

  const filteredDogs = useMemo(() => {
    return dogs.filter((dog) => {
      if (!profileAreaId || dog.area_id !== profileAreaId) {
        return false
      }

      if (!normalizedSocietyName) {
        return true
      }

      if (selectedSociety?.id) {
        return dog.tagged_society_id === selectedSociety.id
      }

      return normalizeText(dog.tagged_society_name) === normalizedSocietyName
    })
  }, [dogs, normalizedSocietyName, profileAreaId, selectedSociety?.id])

  useEffect(() => {
    const allowedDogIds = new Set(filteredDogs.map((dog) => dog.id))
    setSelectedDogIds((current) => current.filter((id) => allowedDogIds.has(id)))
  }, [filteredDogs])

  const selectedDogs = useMemo(
    () => filteredDogs.filter((dog) => selectedDogIds.includes(dog.id)),
    [filteredDogs, selectedDogIds],
  )

  const expenseScope = selectedDogs.length === 0 ? (normalizedSocietyName ? 'society' : 'area') : selectedDogs.length === 1 ? 'dog' : 'group'

  const dogSummary =
    expenseScope === 'area'
      ? 'This will be raised as an area expense.'
      : expenseScope === 'society'
        ? 'This will be raised as a society expense.'
        : expenseScope === 'dog'
          ? `This will be raised for ${selectedDogs[0]?.dog_name_or_temp_name || 'the selected dog'}.`
          : `This will be raised as a group expense for ${selectedDogs.length} dogs.`

  const handleDogToggle = (dogIdToToggle) => {
    setSelectedDogIds((current) =>
      current.includes(dogIdToToggle)
        ? current.filter((dogIdValue) => dogIdValue !== dogIdToToggle)
        : [...current, dogIdToToggle],
    )
  }

  const handleSocietyNameChange = (event) => {
    const nextValue = event.target.value
    setSocietyName(nextValue)

    if (!nextValue.trim()) {
      setSelectedSociety(null)
      return
    }

    if (normalizeText(selectedSociety?.name) !== normalizeText(nextValue)) {
      setSelectedSociety((current) => (current ? { ...current, id: null, name: nextValue } : { id: null, name: nextValue }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!profileAreaId || !currentArea) {
      setErrorMessage('Your profile must have a home area before you can raise an expense.')
      return
    }

    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setErrorMessage('Please enter an amount greater than 0.')
      return
    }

    if (!profile?.upi_id) {
      setErrorMessage('To raise an expense appeal you must first add your UPI ID.')
      window.setTimeout(() => {
        navigateTo('/profile')
      }, 900)
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const totalAmount = Number(form.total_amount)
      const trimmedDescription = form.description.trim()
      const selectedDogNames = selectedDogs
        .map((dog) => dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`)
        .join(', ')

      const descriptionParts = [trimmedDescription]
      if (selectedDogs.length > 1) {
        descriptionParts.push(`Group expense for: ${selectedDogNames}`)
      }

      const targetScope = selectedDogs.length === 1 ? 'dog' : normalizedSocietyName ? 'society' : 'area'
      const payload = {
        dog_id: selectedDogs.length === 1 ? selectedDogs[0].id : null,
        raised_by_user_id: user.id,
        area_id: profileAreaId,
        target_scope: targetScope,
        target_society_id: targetScope !== 'dog' ? selectedSociety?.id ?? null : null,
        target_society_name: targetScope !== 'dog' && normalizedSocietyName ? societyName.trim() : null,
        expense_type: form.expense_type,
        description: descriptionParts.filter(Boolean).join('\n\n') || null,
        total_amount: totalAmount,
        amount_contributed: 0,
        amount_pending: totalAmount,
        disclaimer_accepted: false,
        status: 'open',
      }

      await createExpenseMutation.mutateAsync(payload)

      setSuccessMessage(
        targetScope === 'dog'
          ? 'Expense raised successfully. Redirecting back to the dog detail page...'
          : 'Expense raised successfully. Redirecting to the dashboard...',
      )

      window.setTimeout(() => {
        navigateTo(targetScope === 'dog' ? `/dogs/${selectedDogs[0].id}` : '/dashboard')
      }, 1200)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : error?.message || error?.details || error?.hint || 'Unable to raise the expense.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <div className="h-6 w-40 animate-pulse rounded-full bg-secondary/50" />
            <div className="h-4 w-72 animate-pulse rounded-full bg-secondary/40" />
          </CardContent>
        </Card>
      </section>
    )
  }

  if (dogId && !linkedDog) {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90 shadow-soft">
          <CardContent className="space-y-2 p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground">Dog not available</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              This dog could not be found or is outside your access scope.
            </p>
            <div className="pt-2">
              <Button variant="secondary" onClick={() => navigateTo('/dogs')}>
                Back to Dogs
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Card className="rounded-[2rem] border-white/65 bg-hero-wash shadow-float">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <Badge className="w-fit" variant="secondary">
            Raise Expense
          </Badge>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Raise an expense
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Area comes from your profile. Add a society if needed and optionally link one or more dogs.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/85 px-4 py-3 text-sm text-foreground shadow-soft">
            {dogSummary}
          </div>
        </CardContent>
      </Card>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      {!profile?.upi_id ? (
        <Card className="rounded-[2rem] border-orange-200 bg-orange-50/80 shadow-soft">
          <CardContent className="space-y-3 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground">UPI ID required</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              To raise an expense appeal you must first add your UPI ID.
            </p>
            <div>
              <Button onClick={() => navigateTo('/profile')}>Add UPI ID</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {profile?.upi_id ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Card className="rounded-[2rem] border-white/70 bg-white/92 shadow-soft">
            <CardHeader className="pb-4">
              <CardTitle>Expense details</CardTitle>
              <CardDescription>Compact form for area, society, single-dog, or group expenses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField>
                <FormLabel>Area</FormLabel>
                <div className="flex items-start gap-3 rounded-[1.35rem] border border-white/75 bg-secondary/15 px-4 py-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/75" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {currentArea?.name || profile?.neighbourhood || 'Area unavailable'}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {currentArea?.city || profile?.city || 'From your profile'}
                    </p>
                  </div>
                </div>
                <FormDescription>This is locked to your profile home area.</FormDescription>
              </FormField>

              <FormField>
                <FormLabel>Society</FormLabel>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
                  <Input
                    value={societyName}
                    placeholder="Optional society"
                    onChange={handleSocietyNameChange}
                    className="pl-11"
                  />
                </div>
                <FormDescription>Optional. Clear it for an area expense, or keep/edit it for society filtering.</FormDescription>
              </FormField>

              <FormField>
                <FormLabel>Select dogs</FormLabel>
                <div className="space-y-2 rounded-[1.5rem] border border-white/75 bg-secondary/10 p-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="text-sm font-medium text-foreground">
                      {filteredDogs.length} dog{filteredDogs.length === 1 ? '' : 's'} available
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDogIds.length} selected
                    </p>
                  </div>

                  {filteredDogs.length === 0 ? (
                    <div className="rounded-[1.2rem] bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                      No dogs match this area{normalizedSocietyName ? ' and society' : ''}. Leave this empty to raise an area or society expense.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {filteredDogs.map((dog) => {
                        const isSelected = selectedDogIds.includes(dog.id)
                        return (
                          <button
                            key={dog.id}
                            type="button"
                            onClick={() => handleDogToggle(dog.id)}
                            className={[
                              'flex items-start gap-3 rounded-[1.2rem] border px-3 py-3 text-left transition-colors',
                              isSelected
                                ? 'border-primary/40 bg-primary/10'
                                : 'border-white/70 bg-white/85 hover:bg-secondary/20',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-white text-transparent',
                              ].join(' ')}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <Dog className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-foreground">
                                {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
                              </span>
                              <span className="block text-xs leading-5 text-muted-foreground">
                                {buildDogDisplayLocation(dog)}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <FormDescription>
                  No dogs selected means {normalizedSocietyName ? 'a society expense' : 'an area expense'}.
                </FormDescription>
              </FormField>

              <FormField>
                <FormLabel>Expense type</FormLabel>
                <Select
                  value={form.expense_type}
                  onValueChange={(value) => setForm((current) => ({ ...current, expense_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField>
                <FormLabel>Amount</FormLabel>
                <Input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Total amount"
                  value={form.total_amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, total_amount: event.target.value }))
                  }
                />
              </FormField>

              <FormField>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Explain what this expense covers and why it is needed"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </FormField>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigateTo(dogId && linkedDog ? `/dogs/${linkedDog.id}` : '/dashboard')
                  }
                >
                  {dogId && linkedDog ? 'Back to Dog' : 'Back to Dashboard'}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Raising expense...
                    </span>
                  ) : (
                    'Raise Expense'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </section>
  )
}
