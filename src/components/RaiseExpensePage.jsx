import { useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, UploadCloud } from 'lucide-react'
import { emptyExpenseForm } from '../data/seedData'
import { findMatchingAreaId, useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { useDogs } from '../hooks/use-dogs'
import { getDog, getProfile, listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import {
  useCreateExpense,
  useCreateExpenseReceipt,
  useUploadExpenseReceipt,
} from '../hooks/use-expenses'
import { SocietyPicker } from './SocietyPicker'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

const expenseTypes = ['food', 'medical', 'vaccination', 'rescue', 'other']
const modeOptions = [
  { value: 'dog', label: 'For Dog' },
  { value: 'area', label: 'For Area' },
  { value: 'society', label: 'For Society' },
]

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

function resolveSubmissionAreaId({ matchedAreaId, currentAreaId, areas, fallbackAreaId }) {
  const validAreaIds = new Set(areas.map((area) => area.id))

  for (const candidate of [matchedAreaId, currentAreaId, fallbackAreaId]) {
    if (candidate && validAreaIds.has(candidate)) {
      return candidate
    }
  }

  return areas[0]?.id || ''
}

export function RaiseExpensePage({ dogId, user }) {
  const [linkedDog, setLinkedDog] = useState(null)
  const [profile, setProfile] = useState(null)
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState(emptyExpenseForm)
  const [mode, setMode] = useState(dogId ? 'dog' : 'area')
  const [selectedDogId, setSelectedDogId] = useState(dogId ?? '')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedReceiptFile, setSelectedReceiptFile] = useState(null)
  const { data: dogs = [] } = useDogs()
  const createExpenseMutation = useCreateExpense()
  const createExpenseReceiptMutation = useCreateExpenseReceipt()
  const uploadExpenseReceiptMutation = useUploadExpenseReceipt()

  const flow = useAreaSocietyFlow({
    autoDetect: false,
  })

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

        if (nextDog) {
          const dogArea = nextAreas.find((entry) => entry.id === nextDog.area_id)
          if (dogArea) {
            flow.applySnapshot({
              areaInput: dogArea.name,
              pincode: nextDog.tagged_area_pincode ?? '',
              selectedSociety: nextDog.tagged_society_name
                ? {
                    id: nextDog.tagged_society_id ?? null,
                    name: nextDog.tagged_society_name,
                    pincode: nextDog.tagged_area_pincode ?? null,
                    neighbourhood: dogArea.name,
                  }
                : null,
              manual: true,
              detectedLabel: '',
              detectedNeighbourhood: dogArea.name,
              societyDraftName: '',
            })
          }
        } else {
          const primaryArea = nextProfile?.primary_area_id
            ? nextAreas.find((entry) => entry.id === nextProfile.primary_area_id)
            : null

          flow.applySnapshot({
            areaInput:
              nextProfile?.societies?.neighbourhood ||
              nextProfile?.neighbourhood ||
              primaryArea?.name ||
              '',
            pincode: nextProfile?.societies?.pincode || nextProfile?.pincode || '',
            selectedSociety: nextProfile?.societies || null,
            manual: true,
            detectedLabel: '',
            detectedNeighbourhood:
              nextProfile?.societies?.neighbourhood || nextProfile?.neighbourhood || primaryArea?.name || '',
            societyDraftName: '',
          })
        }
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
  }, [dogId, flow.applySnapshot, user.id])

  const areasById = useMemo(
    () => Object.fromEntries(areas.map((area) => [area.id, area])),
    [areas],
  )

  const selectedDog = useMemo(
    () => dogs.find((dog) => dog.id === selectedDogId) || linkedDog || null,
    [dogs, linkedDog, selectedDogId],
  )

  useEffect(() => {
    if (mode !== 'dog' || !selectedDog) {
      return
    }

    const dogArea = areasById[selectedDog.area_id]
    if (!dogArea) {
      return
    }

    flow.applySnapshot({
      areaInput: dogArea.name,
      pincode: selectedDog.tagged_area_pincode ?? '',
      selectedSociety: selectedDog.tagged_society_name
        ? {
            id: selectedDog.tagged_society_id ?? null,
            name: selectedDog.tagged_society_name,
            pincode: selectedDog.tagged_area_pincode ?? null,
            neighbourhood: dogArea.name,
          }
        : null,
      manual: true,
      detectedLabel: '',
      detectedNeighbourhood: dogArea.name,
      societyDraftName: '',
    })
  }, [areasById, flow.applySnapshot, mode, selectedDog])

  const matchedAreaId = useMemo(
    () => findMatchingAreaId(areas, flow.areaContext.neighbourhood || flow.areaContext.areaLabel),
    [areas, flow.areaContext.areaLabel, flow.areaContext.neighbourhood],
  )

  const currentArea = matchedAreaId ? areasById[matchedAreaId] : null
  const dogOptions = useMemo(
    () =>
      dogs.map((dog) => ({
        id: dog.id,
        label: dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`,
        location: buildDogDisplayLocation(dog),
      })),
    [dogs],
  )

  const contextSummary = useMemo(() => {
    if (mode === 'dog' && selectedDog) {
      return {
        title: selectedDog.dog_name_or_temp_name || 'Unnamed dog',
        subtitle: buildDogDisplayLocation(selectedDog),
        area: currentArea ? `${currentArea.city} · ${currentArea.name}` : 'Area unavailable',
      }
    }

    if (mode === 'society') {
      return {
        title: flow.selectedSociety?.name || 'Choose a society',
        subtitle: 'Society-level expense',
        area: currentArea ? `${currentArea.city} · ${currentArea.name}` : 'Choose an area first',
      }
    }

    return {
      title: currentArea ? currentArea.name : 'Choose an area',
      subtitle: 'Area-level expense',
      area: currentArea ? `${currentArea.city} · ${currentArea.name}` : 'Area unavailable',
    }
  }, [currentArea, flow.selectedSociety?.name, mode, selectedDog])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setErrorMessage('Please enter a total amount greater than 0.')
      return
    }

    if (!form.disclaimer_accepted) {
      setErrorMessage('Please accept the disclaimer before raising this expense.')
      return
    }

    if (!profile?.upi_id) {
      setErrorMessage('To raise an expense appeal you must first add your UPI ID.')
      window.setTimeout(() => {
        navigateTo('/profile')
      }, 900)
      return
    }

    if (mode === 'dog' && !selectedDog?.id) {
      setErrorMessage('Select a dog before creating a dog-linked expense.')
      return
    }

    const submissionAreaId = resolveSubmissionAreaId({
      matchedAreaId,
      currentAreaId: currentArea?.id || '',
      areas,
      fallbackAreaId: profile?.primary_area_id || '',
    })

    if ((mode === 'area' || mode === 'society') && !submissionAreaId) {
      setErrorMessage('Select a valid area before raising this expense.')
      return
    }

    if (mode === 'society' && !flow.selectedSociety?.name) {
      setErrorMessage('Select a society before raising a society-level expense.')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const totalAmount = Number(form.total_amount)
      const payload = {
        dog_id: mode === 'dog' ? selectedDog.id : null,
        raised_by_user_id: user.id,
        area_id: mode === 'dog' ? selectedDog.area_id : submissionAreaId,
        target_scope: mode,
        target_society_id: mode === 'society' ? flow.selectedSociety?.id ?? null : null,
        target_society_name: mode === 'society' ? flow.selectedSociety?.name ?? null : null,
        expense_type: form.expense_type,
        description: form.description.trim() || null,
        total_amount: totalAmount,
        amount_contributed: 0,
        amount_pending: totalAmount,
        disclaimer_accepted: true,
        status: 'open',
      }

      const createdExpense = await createExpenseMutation.mutateAsync(payload)

      if (selectedReceiptFile) {
        const uploadedReceipt = await uploadExpenseReceiptMutation.mutateAsync({
          file: selectedReceiptFile,
          userId: user.id,
        })

        await createExpenseReceiptMutation.mutateAsync({
          expense_id: createdExpense.id,
          uploaded_by_user_id: user.id,
          file_url: uploadedReceipt.receipt_url,
        })
      } else if (form.receipt_url.trim()) {
        await createExpenseReceiptMutation.mutateAsync({
          expense_id: createdExpense.id,
          uploaded_by_user_id: user.id,
          file_url: form.receipt_url.trim(),
        })
      }

      setSuccessMessage(
        mode === 'dog'
          ? 'Expense raised successfully. Redirecting back to the dog detail page...'
          : 'Expense raised successfully. Redirecting to the dashboard...',
      )

      window.setTimeout(() => {
        navigateTo(mode === 'dog' ? `/dogs/${selectedDog.id}` : '/dashboard')
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
      <section className="space-y-6">
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
      <section className="space-y-6">
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
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Raise Expense
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Start an expense appeal
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Raise support for one dog, a full area, or a specific society without leaving the dashboard flow.
            </p>
          </div>
          <div className="inline-flex rounded-[1.1rem] border border-white/75 bg-white/75 p-1 shadow-soft">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={[
                  'rounded-[0.95rem] px-3 py-2 text-sm font-semibold transition-colors',
                  mode === option.value
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-foreground/70 hover:bg-secondary/35 hover:text-foreground',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>Expense context</CardTitle>
            <CardDescription>
              The appeal will be linked according to the mode you choose.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-6">
            <div className="flex items-center gap-3 rounded-xl bg-secondary/35 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                {mode === 'dog' ? 'Dog' : mode === 'society' ? 'Society' : 'Area'}
              </span>
              <span className="font-semibold text-foreground">{contextSummary.title}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-secondary/35 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Context</span>
              <span className="font-semibold text-foreground">{contextSummary.subtitle}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-secondary/35 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Area</span>
              <span className="font-semibold text-foreground">{contextSummary.area}</span>
            </div>
            <div className="rounded-xl bg-secondary/25 px-4 py-3 text-muted-foreground">
              Expenses without a dog stay visible at the area or society level for dashboard and contribution flows.
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      {!profile?.upi_id ? (
        <Card className="rounded-[2rem] border-orange-200 bg-orange-50/80 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <h3 className="text-xl font-semibold text-foreground">UPI ID required</h3>
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
        <form className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]" onSubmit={handleSubmit}>
          <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
            <CardHeader>
              <CardTitle>Expense details</CardTitle>
              <CardDescription>
                Keep the form simple and clear so supporters immediately understand what is needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              {mode === 'dog' ? (
                <FormField>
                  <FormLabel>Select dog</FormLabel>
                  <Select value={selectedDogId} onValueChange={setSelectedDogId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a dog" />
                    </SelectTrigger>
                    <SelectContent>
                      {dogOptions.map((dogOption) => (
                        <SelectItem key={dogOption.id} value={dogOption.id}>
                          {dogOption.label} · {dogOption.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Only required when the expense is for one specific dog.</FormDescription>
                </FormField>
              ) : (
                <>
                  <AreaSelectionField flow={flow} />
                  {mode === 'society' ? (
                    <div className="rounded-[1.35rem] border border-white/75 bg-secondary/15 px-3 py-2">
                      <SocietyPicker
                        pincode={flow.areaContext.pincode}
                        neighbourhood={flow.areaContext.neighbourhood}
                        onSelect={flow.setSelectedSociety}
                        draftName={flow.societyDraftName}
                        onDraftChange={flow.setSocietyDraftName}
                        deferCreate
                      />
                    </div>
                  ) : null}
                </>
              )}

              <FormField>
                <FormLabel>Expense type</FormLabel>
                <Select
                  value={form.expense_type}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, expense_type: value }))
                  }
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
                <FormLabel>Total amount</FormLabel>
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

              <FormField>
                <FormLabel>Receipt URL</FormLabel>
                <Input
                  type="url"
                  placeholder="Receipt URL (optional)"
                  value={form.receipt_url}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, receipt_url: event.target.value }))
                  }
                />
                <FormDescription>
                  Add a bill, estimate, or proof link if you already have one.
                </FormDescription>
              </FormField>

              <FormField>
                <FormLabel>Receipt upload</FormLabel>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-secondary/15 px-5 py-8 text-center transition hover:bg-secondary/25">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {selectedReceiptFile ? selectedReceiptFile.name : 'Choose a receipt file'}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Upload a bill or proof file to StreetDog App storage.
                    </p>
                  </div>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => setSelectedReceiptFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <FormDescription>
                  You can upload a receipt file, paste a receipt URL, or do both.
                </FormDescription>
              </FormField>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Before you submit</CardTitle>
                <CardDescription>
                  A little context helps StreetDog App stay trustworthy and easy to support.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
                <div className="rounded-2xl bg-secondary/40 p-4">
                  Share the real amount needed and keep the description specific.
                </div>
                <div className="rounded-2xl bg-secondary/40 p-4">
                  Your UPI ID will be used by supporters to pay you directly.
                </div>
                <div className="rounded-2xl bg-secondary/40 p-4">
                  Dog selection is optional now, but area context is still required for visibility.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Disclaimer</CardTitle>
                <CardDescription>
                  Please confirm that this request is valid before creating the expense.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 text-sm text-foreground">
                  <input
                    className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                    type="checkbox"
                    checked={form.disclaimer_accepted}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        disclaimer_accepted: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    I confirm this expense is valid and I accept the disclaimer requirement.
                  </span>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigateTo(mode === 'dog' && selectedDog ? `/dogs/${selectedDog.id}` : '/dashboard')}
                  >
                    {mode === 'dog' && selectedDog ? 'Back to Dog' : 'Back to Dashboard'}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Raising expense...' : 'Raise Expense'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function AreaSelectionField({ flow }) {
  return (
    <FormField>
      <FormLabel>Area</FormLabel>
      <div className="relative min-w-0">
        <Input
          value={flow.areaInput}
          placeholder="Select area"
          onChange={(event) => flow.setAreaInput(event.target.value)}
          onFocus={() => flow.setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => flow.setShowSuggestions(false), 150)}
          autoComplete="off"
          className="h-11 rounded-2xl border-white/75 bg-white/92 pr-10 text-sm shadow-none"
        />
        {flow.isFetchingSuggestions ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
        {flow.showSuggestions && flow.areaSuggestions.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
            {flow.areaSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.neighbourhood}-${suggestion.pincode || index}`}
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/35"
                onMouseDown={() => flow.selectSuggestion(suggestion)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="flex-1 truncate">{suggestion.neighbourhood || suggestion.pincode}</span>
                {suggestion.pincode ? (
                  <span className="text-xs text-muted-foreground">{suggestion.pincode}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <FormDescription>Required for area-level and society-level expenses.</FormDescription>
    </FormField>
  )
}
