import { useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, Sparkles, UploadCloud } from 'lucide-react'
import { emptyDogForm } from '../data/seedData'
import { useAreaSocietyFlow, findMatchingAreaId } from '../hooks/use-area-society-flow'
import { useDogAiAnalysis } from '../hooks/use-dog-ai'
import { createDog, listActiveAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { AreaSocietyFields } from './AreaSocietyFields'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

function buildHealthNotesFromAi(suggestions) {
  return [suggestions.ai_condition, suggestions.ai_injuries].filter(Boolean).join('. ').trim()
}

export function AddDogPage({ user, profile }) {
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState({
    ...emptyDogForm,
    area_id: profile?.primary_area_id || '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState('')
  const [aiStatusMessage, setAiStatusMessage] = useState('')
  const areaSocietyFlow = useAreaSocietyFlow({
    autoDetect: true,
    initialAreaLabel: profile?.societies?.neighbourhood || '',
    initialPincode: profile?.societies?.pincode || '',
    initialSociety: profile?.societies || null,
  })
  const dogAiMutation = useDogAiAnalysis()

  useEffect(() => {
    let isMounted = true

    const loadAreas = async () => {
      try {
        setErrorMessage('')
        const nextAreas = await listActiveAreas()
        if (isMounted) {
          setAreas(nextAreas)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load active areas.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadAreas()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedImageFile) {
      setSelectedImagePreview('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(selectedImageFile)
    setSelectedImagePreview(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [selectedImageFile])

  useEffect(() => {
    if (!areas.length || form.area_id) {
      return
    }

    const matchedAreaId = findMatchingAreaId(
      areas,
      areaSocietyFlow.areaContext.neighbourhood || areaSocietyFlow.areaLabel,
    )
    if (matchedAreaId) {
      setForm((current) => ({ ...current, area_id: matchedAreaId }))
    }
  }, [areaSocietyFlow.areaContext.neighbourhood, areaSocietyFlow.areaLabel, areas, form.area_id])

  function setFormValue(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
  }

  async function handleAnalyzePhoto() {
    if (!selectedImageFile || dogAiMutation.isPending) {
      return
    }

    try {
      setErrorMessage('')
      setAiStatusMessage('Analyzing photo with AI...')
      const payload = await dogAiMutation.mutateAsync(selectedImageFile)
      const suggestions = payload.suggestions

      setForm((current) => ({
        ...current,
        ai_summary: suggestions.ai_summary || current.ai_summary,
        ai_condition: suggestions.ai_condition || current.ai_condition,
        ai_urgency: suggestions.ai_urgency || current.ai_urgency,
        ai_breed_guess: suggestions.ai_breed_guess || current.ai_breed_guess,
        ai_color: suggestions.ai_color || current.ai_color,
        ai_age_band: suggestions.ai_age_band || current.ai_age_band,
        ai_injuries: suggestions.ai_injuries || current.ai_injuries,
        ai_raw_json: suggestions,
        ai_processed_at: new Date().toISOString(),
        approx_age:
          current.approx_age || (suggestions.ai_age_band !== 'unknown' ? suggestions.ai_age_band : ''),
        gender: current.gender === 'unknown' ? suggestions.gender || current.gender : current.gender,
        temperament: current.temperament || suggestions.temperament || '',
        health_notes: current.health_notes || buildHealthNotesFromAi(suggestions),
      }))
      setAiStatusMessage(
        payload.cached
          ? 'AI suggestions are ready to review from a previous matching photo.'
          : 'AI suggestions are ready. You can edit everything before saving.',
      )
    } catch (error) {
      setAiStatusMessage('')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'AI analysis is temporarily unavailable. You can still fill the dog profile manually.',
      )
    }
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.area_id) {
      nextErrors.area_id = 'Choose the StreetDog App area for visibility and routing.'
    }

    if (!form.location_description.trim()) {
      nextErrors.location_description = 'Please add a location description for this dog.'
    }

    if (!form.ai_condition.trim()) {
      nextErrors.ai_condition = 'Add a short condition or status note.'
    }

    if (!form.ai_summary.trim()) {
      nextErrors.ai_summary = 'Add a short description so volunteers know what to expect.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const matchedAreaName = useMemo(
    () => areas.find((area) => area.id === form.area_id),
    [areas, form.area_id],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      const resolvedSociety = await areaSocietyFlow.resolveSelectedSociety()
      const createdDog = await createDog({
        ...form,
        added_by_user_id: user.id,
        added_by_guest: false,
        guest_contact: form.guest_contact.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        tagged_by_user_id: user.id,
        tagged_society_id: resolvedSociety?._pending ? null : resolvedSociety?.id ?? null,
        tagged_society_name: resolvedSociety?.name ?? null,
        tagged_area_pincode: areaSocietyFlow.areaContext.pincode || null,
        tagged_area_neighbourhood: areaSocietyFlow.areaContext.neighbourhood || null,
        ai_summary: form.ai_summary.trim() || null,
        ai_condition: form.ai_condition.trim() || null,
        ai_urgency: form.ai_urgency.trim() || null,
        ai_breed_guess: form.ai_breed_guess.trim() || null,
        ai_color: form.ai_color.trim() || null,
        ai_age_band: form.ai_age_band.trim() || null,
        ai_injuries: form.ai_injuries.trim() || null,
        ai_raw_json: form.ai_raw_json || null,
        ai_processed_at: form.ai_processed_at || null,
      })
      navigateTo(`/dogs/${createdDog.id}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the dog.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Add Dog
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Create a new dog record
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Add a calm, useful first record with a photo, a clear location, and short notes the
              next volunteer can trust.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigateTo('/dogs')}>
              Back to Dogs
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>Before you save</CardTitle>
            <CardDescription>
              Keep the form short. AI is optional and only helps fill the same fields you will review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-6 text-muted-foreground">
            {[
              'Upload a photo first and make sure the preview looks right.',
              'If you want help, analyze the photo and review the suggestions in the same form.',
              'Choose the StreetDog App area so the record reaches the right volunteer group.',
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl bg-secondary/35 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold text-primary">
                  {index + 1}
                </span>
                <span>{tip}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[2rem] border border-border/70 bg-white/70"
            />
          ))}
        </div>
      ) : (
        <form className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]" onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Dog photo</CardTitle>
                <CardDescription>
                  Upload a dog photo, preview it safely, and only run AI if you want help writing the
                  first notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-secondary/15 px-5 py-8 text-center transition hover:bg-secondary/25">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {selectedImageFile ? selectedImageFile.name : 'Choose a dog photo'}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      The preview updates first so the form stays stable on mobile.
                    </p>
                  </div>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setSelectedImageFile(event.target.files?.[0] ?? null)
                      setAiStatusMessage('')
                    }}
                  />
                </label>

                <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/70">
                  {selectedImagePreview ? (
                    <img
                      src={selectedImagePreview}
                      alt="Selected dog preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      Photo preview will appear here.
                    </div>
                  )}

                  {dogAiMutation.isPending ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-sm">
                      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-foreground shadow-soft">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reviewing AI suggestions...
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!selectedImageFile || dogAiMutation.isPending}
                    onClick={handleAnalyzePhoto}
                  >
                    <Sparkles className="h-4 w-4" />
                    {dogAiMutation.isPending ? 'Analyzing photo...' : 'Analyze photo with AI'}
                  </Button>
                </div>

                {aiStatusMessage ? <FormDescription>{aiStatusMessage}</FormDescription> : null}
              </CardContent>
            </Card>

            <AreaSocietyFields
              flow={areaSocietyFlow}
              cardCopy="Use location or type your neighbourhood to mirror the same area and society flow used during account setup."
            />
          </div>

          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Dog details</CardTitle>
                <CardDescription>
                  Keep one clean, editable set of details. AI suggestions simply fill these same fields.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <FormField>
                  <FormLabel className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Detected / editable found area
                  </FormLabel>
                  <Select value={form.area_id} onValueChange={(value) => setFormValue('area_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an area for visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.city} - {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {matchedAreaName
                      ? `Matched area: ${matchedAreaName.city} - ${matchedAreaName.name}`
                      : 'This controls which volunteers can see and manage the record.'}
                  </FormDescription>
                  {fieldErrors.area_id ? <FormMessage>{fieldErrors.area_id}</FormMessage> : null}
                </FormField>

                <FormField>
                  <FormLabel>Where did you see this dog?</FormLabel>
                  <Textarea
                    placeholder="Street, gate, shop, feeding spot, or landmark where the dog is usually seen"
                    value={form.location_description}
                    onChange={(event) => setFormValue('location_description', event.target.value)}
                  />
                  {fieldErrors.location_description ? (
                    <FormMessage>{fieldErrors.location_description}</FormMessage>
                  ) : null}
                </FormField>

                <FormField>
                  <FormLabel>Condition / status</FormLabel>
                  <Input
                    placeholder="Stable, thin, timid, limping, needs review..."
                    value={form.ai_condition}
                    onChange={(event) => setFormValue('ai_condition', event.target.value)}
                  />
                  {fieldErrors.ai_condition ? <FormMessage>{fieldErrors.ai_condition}</FormMessage> : null}
                </FormField>

                <FormField>
                  <FormLabel>Short description</FormLabel>
                  <Textarea
                    className="min-h-[88px]"
                    placeholder="A short summary volunteers should know before they arrive"
                    value={form.ai_summary}
                    onChange={(event) => setFormValue('ai_summary', event.target.value)}
                  />
                  {fieldErrors.ai_summary ? <FormMessage>{fieldErrors.ai_summary}</FormMessage> : null}
                </FormField>

                <FormField>
                  <FormLabel>Health / injuries notes</FormLabel>
                  <Textarea
                    className="min-h-[96px]"
                    placeholder="Share any injuries, limping, visible illness, or care concerns"
                    value={form.health_notes}
                    onChange={(event) => setFormValue('health_notes', event.target.value)}
                  />
                </FormField>

                <FormField>
                  <FormLabel>Dog name (optional)</FormLabel>
                  <Input
                    placeholder="Give a temporary name if it helps identify them"
                    value={form.dog_name_or_temp_name}
                    onChange={(event) => setFormValue('dog_name_or_temp_name', event.target.value)}
                  />
                </FormField>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => navigateTo('/dogs')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving dog...
                      </>
                    ) : (
                      'Save dog'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </section>
  )
}
