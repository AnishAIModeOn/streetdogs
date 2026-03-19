import { useEffect, useMemo, useState } from 'react'
import { Loader2, UploadCloud } from 'lucide-react'
import { emptyDogForm } from '../data/seedData'
import { useAreaSocietyFlow, findMatchingAreaId } from '../hooks/use-area-society-flow'
import { useDogAiAnalysis } from '../hooks/use-dog-ai'
import { createDog, listActiveAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { AreaSocietyFields } from './AreaSocietyFields'
import { DogAiSuggestionEditor } from './DogAiSuggestionEditor'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

const genderOptions = ['unknown', 'male', 'female']
const vaccinationOptions = ['unknown', 'not_vaccinated', 'partially_vaccinated', 'vaccinated']
const sterilizationOptions = ['unknown', 'not_sterilized', 'scheduled', 'sterilized']
const visibilityOptions = ['normal_area_visible', 'uploader_and_area_visible']

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

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

    const matchedAreaId = findMatchingAreaId(areas, areaSocietyFlow.areaContext.neighbourhood || areaSocietyFlow.areaLabel)
    if (matchedAreaId) {
      setForm((current) => ({ ...current, area_id: matchedAreaId }))
    }
  }, [areaSocietyFlow.areaContext.neighbourhood, areaSocietyFlow.areaLabel, areas, form.area_id])

  useEffect(() => {
    if (!selectedImageFile) {
      return undefined
    }

    let isCancelled = false

    const analyzePhoto = async () => {
      try {
        setErrorMessage('')
        setAiStatusMessage('Analyzing photo with AI…')
        const payload = await dogAiMutation.mutateAsync(selectedImageFile)

        if (isCancelled) {
          return
        }

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
          approx_age: current.approx_age || (suggestions.ai_age_band !== 'unknown' ? suggestions.ai_age_band : ''),
          gender: current.gender === 'unknown' ? suggestions.gender || current.gender : current.gender,
          temperament: current.temperament || suggestions.temperament || '',
          health_notes: current.health_notes || buildHealthNotesFromAi(suggestions),
        }))
        setAiStatusMessage(
          payload.cached
            ? 'Review AI suggestions we found for this photo.'
            : 'Review AI suggestions before you save the dog record.',
        )
      } catch (error) {
        if (!isCancelled) {
          setAiStatusMessage('')
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'AI analysis is temporarily unavailable. You can still fill the dog profile manually.',
          )
        }
      }
    }

    analyzePhoto()

    return () => {
      isCancelled = true
    }
  }, [dogAiMutation, selectedImageFile])

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

  function validateForm() {
    const nextErrors = {}

    if (!form.area_id) {
      nextErrors.area_id = 'Choose the StreetDog App area for visibility and routing.'
    }

    if (!form.location_description.trim()) {
      nextErrors.location_description = 'Please add a location description for this dog.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const canSubmit = !isSaving && !dogAiMutation.isPending
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
              Add a dog profile with clear location, AI-assisted visual notes, and area context so
              volunteers can coordinate confidently.
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
              One clear photo and a short location description usually create the most useful first
              record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-6 text-muted-foreground">
            {[
              'Upload a photo and StreetDog App will suggest a careful AI summary for review.',
              'Use neighbourhood and society details to preserve the same warm area flow used during account setup.',
              'A matched StreetDog App area still controls visibility and routing for the record.',
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
                  Upload a dog photo and StreetDog App will automatically review it with AI.
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
                      AI will review the photo automatically after upload.
                    </p>
                  </div>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    disabled={dogAiMutation.isPending}
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
                        Reviewing AI suggestions…
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <DogAiSuggestionEditor
              suggestions={form}
              statusMessage={aiStatusMessage}
              onChange={setFormValue}
              title="Review AI suggestions"
            />

            <AreaSocietyFields flow={areaSocietyFlow} cardCopy="Use location or type your neighbourhood to mirror the same area and society flow used during account setup." />
          </div>

          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Dog details</CardTitle>
                <CardDescription>
                  Review the AI suggestions, then keep the final profile accurate and human-checked.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <FormField>
                  <FormLabel>StreetDog App area</FormLabel>
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
                  <FormLabel>Dog name or temporary name</FormLabel>
                  <Input
                    placeholder="Dog name or temporary name"
                    value={form.dog_name_or_temp_name}
                    onChange={(event) => setFormValue('dog_name_or_temp_name', event.target.value)}
                  />
                </FormField>

                <FormField>
                  <FormLabel>Location description</FormLabel>
                  <Textarea
                    placeholder="Street, gate, shop, or landmark where the dog is usually seen"
                    value={form.location_description}
                    onChange={(event) => setFormValue('location_description', event.target.value)}
                  />
                  {fieldErrors.location_description ? (
                    <FormMessage>{fieldErrors.location_description}</FormMessage>
                  ) : null}
                </FormField>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField>
                    <FormLabel>Latitude</FormLabel>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={form.latitude}
                      onChange={(event) => setFormValue('latitude', event.target.value)}
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>Longitude</FormLabel>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={form.longitude}
                      onChange={(event) => setFormValue('longitude', event.target.value)}
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField>
                    <FormLabel>Gender</FormLabel>
                    <Select value={form.gender} onValueChange={(value) => setFormValue('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField>
                    <FormLabel>Approx age</FormLabel>
                    <Input
                      placeholder="Approx age"
                      value={form.approx_age}
                      onChange={(event) => setFormValue('approx_age', event.target.value)}
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField>
                    <FormLabel>Vaccination status</FormLabel>
                    <Select
                      value={form.vaccination_status}
                      onValueChange={(value) => setFormValue('vaccination_status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vaccination status" />
                      </SelectTrigger>
                      <SelectContent>
                        {vaccinationOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField>
                    <FormLabel>Sterilization status</FormLabel>
                    <Select
                      value={form.sterilization_status}
                      onValueChange={(value) => setFormValue('sterilization_status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sterilization status" />
                      </SelectTrigger>
                      <SelectContent>
                        {sterilizationOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <FormField>
                  <FormLabel>Temperament</FormLabel>
                  <Input
                    placeholder="Temperament"
                    value={form.temperament}
                    onChange={(event) => setFormValue('temperament', event.target.value)}
                  />
                </FormField>

                <FormField>
                  <FormLabel>Health notes</FormLabel>
                  <Textarea
                    placeholder="Health notes"
                    value={form.health_notes}
                    onChange={(event) => setFormValue('health_notes', event.target.value)}
                  />
                </FormField>

                <FormField>
                  <FormLabel>Visibility</FormLabel>
                  <Select
                    value={form.visibility_type}
                    onValueChange={(value) => setFormValue('visibility_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibilityOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how this record should be visible within the current workflow.
                  </FormDescription>
                </FormField>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => navigateTo('/dogs')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!canSubmit}>
                    {isSaving ? 'Saving dog...' : 'Save dog'}
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
