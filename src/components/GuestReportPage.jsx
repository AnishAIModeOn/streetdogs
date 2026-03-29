import { useEffect, useMemo, useState } from 'react'
import { HeartHandshake, Loader2, MapPin, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { emptyGuestReportForm } from '../data/seedData'
import { useAreaSocietyFlow, findMatchingAreaId } from '../hooks/use-area-society-flow'
import { useAuthState } from '../hooks/use-auth'
import { useDogAiAnalysis } from '../hooks/use-dog-ai'
import { useCreateDog, useUploadDogPhoto } from '../hooks/use-dogs'
import { listActiveAreas } from '../lib/communityData'
import { AreaSocietyFields } from './AreaSocietyFields'
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
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Sheet, SheetContent } from './ui/sheet'
import { Textarea } from './ui/textarea'

const AGE_BAND_OPTIONS = ['puppy', 'young', 'adult', 'senior', 'unknown']

function buildHealthNotesFromAi(suggestions) {
  return [suggestions.ai_condition, suggestions.ai_injuries].filter(Boolean).join('. ').trim()
}

function buildShortDescriptionFromAi(suggestions, currentSummary) {
  if (currentSummary) {
    return currentSummary
  }

  const summary = (suggestions.ai_summary || '').trim()
  const color = (suggestions.ai_color || '').trim()
  if (!summary) {
    return color ? `${color} street dog` : ''
  }

  if (!color || summary.toLowerCase().includes(color.toLowerCase())) {
    return summary
  }

  return `${color}. ${summary}`
}

function buildLocationDescriptionFromArea(flow) {
  return [
    flow.selectedSociety?.name || '',
    flow.areaContext.neighbourhood || flow.areaLabel || '',
    flow.areaContext.pincode || '',
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ')
}

function resolveSubmissionAreaId({ matchedAreaId, currentAreaId, areas }) {
  return matchedAreaId || currentAreaId || areas[0]?.id || ''
}

function normalizePhoneNumber(value) {
  return value.replace(/[^\d+\s()-]/g, '').trim()
}

function hasValidPhoneNumber(value) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

function formatGuestContact(name, contact) {
  const trimmedName = name.trim()
  const trimmedContact = normalizePhoneNumber(contact)

  if (trimmedName && trimmedContact) {
    return `${trimmedName} | ${trimmedContact}`
  }

  return trimmedName || trimmedContact || null
}

function findAreaLabel(areas, areaId) {
  const area = areas.find((entry) => entry.id === areaId)
  return area ? `${area.city} - ${area.name}` : 'Area unavailable'
}

function buildSubmittedDogLocation(dog) {
  return (
    dog?.tagged_area_neighbourhood ||
    dog?.tagged_society_name ||
    dog?.location_description ||
    'Location shared'
  )
}

function AuthPromptContent({ onNavigate }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Badge className="w-fit" variant="secondary">
          Optional sign in
        </Badge>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
          Track this dog and stay in the loop
        </h3>
        <p className="text-sm leading-7 text-muted-foreground">
          Sign in to follow dog records, care updates, and volunteer activity after your report.
        </p>
      </div>
      <div className="rounded-2xl bg-secondary/30 p-4 text-sm leading-6 text-muted-foreground">
        StreetDog App keeps guest reporting open, and signing in later simply helps you follow what
        happens next.
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onNavigate('/signup')}>
          Create account
        </Button>
        <Button type="button" onClick={() => onNavigate('/signin')}>
          Sign in
        </Button>
      </div>
    </div>
  )
}

export function GuestReportPage({ onNavigate, currentUser = null }) {
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState(emptyGuestReportForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSignInPromptOpen, setIsSignInPromptOpen] = useState(false)
  const [isDesktopPrompt, setIsDesktopPrompt] = useState(false)
  const [submittedDogPreview, setSubmittedDogPreview] = useState(null)
  const [aiStatusMessage, setAiStatusMessage] = useState('')
  const { data: authState } = useAuthState()
  const createDogMutation = useCreateDog()
  const uploadDogPhotoMutation = useUploadDogPhoto()
  const dogAiMutation = useDogAiAnalysis()
  const activeUser = authState?.user ?? currentUser
  const isUploadingPhoto = uploadDogPhotoMutation.isPending
  const isAnalyzingPhoto = dogAiMutation.isPending
  const areaSocietyFlow = useAreaSocietyFlow({
    autoDetect: true,
  })

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
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load areas right now.')
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
    if (typeof window === 'undefined') {
      return undefined
    }

    const media = window.matchMedia('(min-width: 640px)')
    const sync = () => setIsDesktopPrompt(media.matches)
    sync()

    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const matchedAreaId = useMemo(
    () =>
      findMatchingAreaId(
        areas,
        areaSocietyFlow.areaContext.neighbourhood || areaSocietyFlow.areaLabel,
      ),
    [areaSocietyFlow.areaContext.neighbourhood, areaSocietyFlow.areaLabel, areas],
  )

  useEffect(() => {
    setForm((current) => {
      const nextAreaId = matchedAreaId || ''
      return current.area_id === nextAreaId ? current : { ...current, area_id: nextAreaId }
    })
  }, [matchedAreaId])

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

  function handleSelectedImageChange(event) {
    const nextFile = event.target.files?.[0] ?? null

    setSelectedImageFile(nextFile)
    setErrorMessage('')
    setAiStatusMessage('')
    dogAiMutation.reset()

    // Let mobile users choose the same photo again after a failed AI attempt.
    event.target.value = ''
  }

  async function handleAnalyzePhoto() {
    if (!selectedImageFile || isAnalyzingPhoto || isUploadingPhoto || isSaving) {
      return
    }

    try {
      setErrorMessage('')
      setAiStatusMessage('Analyzing photo with AI...')
      const payload = await dogAiMutation.mutateAsync(selectedImageFile)
      const suggestions = payload.suggestions

      setForm((current) => ({
        ...current,
        dog_name_or_temp_name: current.dog_name_or_temp_name || suggestions.ai_dog_name || '',
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
        ai_summary: buildShortDescriptionFromAi(suggestions, current.ai_summary),
        health_notes: current.health_notes || buildHealthNotesFromAi(suggestions),
      }))
      setAiStatusMessage(
        payload.cached
          ? 'AI suggestions are ready to review from a previous matching photo.'
          : 'AI suggestions are ready. You can edit anything before you submit.',
      )
    } catch (error) {
      setAiStatusMessage('')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'AI analysis is temporarily unavailable. You can still submit manually.',
      )
    }
  }

  function resetFormState() {
    setForm(emptyGuestReportForm)
    setFieldErrors({})
    setErrorMessage('')
    setSelectedImageFile(null)
    setSubmittedDogPreview(null)
    setHasSubmitted(false)
    setIsSignInPromptOpen(false)
    setAiStatusMessage('')
    areaSocietyFlow.setSelectedSociety(null)
    areaSocietyFlow.setSocietyDraftName('')
  }

  function validateForm() {
    const nextErrors = {}

    if (!areaSocietyFlow.areaContext.neighbourhood && !areaSocietyFlow.areaLabel) {
      nextErrors.area = 'Please choose or type an area in the Area field.'
    }
    if (!hasValidPhoneNumber(form.guest_contact)) {
      nextErrors.guest_contact = 'Enter a valid phone number so volunteers can reach you if needed.'
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

  const matchedAreaName = useMemo(() => areas.find((area) => area.id === form.area_id), [areas, form.area_id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateForm()) return

    try {
      setIsSaving(true)
      setErrorMessage('')

      let uploadedPhoto = { photo_path: null, photo_url: null }
      if (selectedImageFile && activeUser?.id) {
        uploadedPhoto = await uploadDogPhotoMutation.mutateAsync({
          file: selectedImageFile,
          userId: activeUser.id,
        })
      }

      const resolvedSociety =
        areaSocietyFlow.selectedSociety || (await areaSocietyFlow.resolveSelectedSociety())

      const guestContact = formatGuestContact(form.guest_name, form.guest_contact)
      const locationDescription = buildLocationDescriptionFromArea(areaSocietyFlow)
      const submissionAreaId = resolveSubmissionAreaId({
        matchedAreaId,
        currentAreaId: form.area_id,
        areas,
      })

      if (!submissionAreaId) {
        throw new Error('Unable to route this report right now. Please try again in a moment.')
      }

      const payload = {
        dog_name_or_temp_name: form.dog_name_or_temp_name.trim() || null,
        area_id: submissionAreaId,
        added_by_guest: !activeUser?.id,
        added_by_user_id: activeUser?.id ?? null,
        tagged_by_user_id: activeUser?.id ?? null,
        tagged_society_id:
          resolvedSociety?._pending || resolvedSociety?.isNew ? null : resolvedSociety?.id ?? null,
        tagged_society_name: resolvedSociety?.name ?? null,
        society_status: resolvedSociety?._pending || resolvedSociety?.isNew
          ? 'pending'
          : resolvedSociety?.id
            ? 'confirmed'
            : null,
        tagged_area_pincode: areaSocietyFlow.areaContext.pincode || null,
        tagged_area_neighbourhood: areaSocietyFlow.areaContext.neighbourhood || null,
        guest_contact: guestContact,
        location_description: locationDescription || null,
        photo_path: uploadedPhoto.photo_path,
        photo_url: uploadedPhoto.photo_url,
        approx_age: form.approx_age.trim() || null,
        health_notes: form.health_notes.trim() || null,
        visibility_type: 'normal_area_visible',
        status: 'active',
        ai_summary: form.ai_summary.trim() || null,
        ai_condition: form.ai_condition.trim() || null,
        ai_urgency: form.ai_urgency.trim() || null,
        ai_breed_guess: form.ai_breed_guess.trim() || null,
        ai_color: form.ai_color.trim() || null,
        ai_age_band: form.ai_age_band.trim() || null,
        ai_injuries: form.ai_injuries.trim() || null,
        ai_raw_json: form.ai_raw_json || null,
        ai_processed_at: form.ai_processed_at || null,
      }

      const createdDog = await createDogMutation.mutateAsync(payload)
      setSubmittedDogPreview({
        id: createdDog.id,
        image: uploadedPhoto.photo_url || selectedImagePreview || '',
        areaLabel: findAreaLabel(areas, submissionAreaId),
        location: buildSubmittedDogLocation(createdDog),
        name: form.dog_name_or_temp_name.trim() || 'Community dog report',
      })
      setForm(emptyGuestReportForm)
      setSelectedImageFile(null)
      areaSocietyFlow.setSelectedSociety(null)
      areaSocietyFlow.setSocietyDraftName('')
      setHasSubmitted(true)
      toast.success('Dog report submitted', {
        description: 'Thank you for helping volunteers notice this dog sooner.',
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit the dog report.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
      <section className="grid gap-3 rounded-[1.75rem] border border-white/65 bg-hero-wash p-4 shadow-float sm:gap-5 sm:rounded-[2rem] sm:p-6 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-3 sm:space-y-5">
          <Badge className="w-fit" variant="secondary">Public sighting report</Badge>
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Spotted a dog that needs help?
            </h1>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-[0.95rem] sm:leading-7">
              Share a quick report and local volunteers will pick it up from here. No account required.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.5rem] border-white/65 bg-white/92 sm:rounded-[1.75rem]">
          <CardHeader className="pb-2 pt-4 sm:pb-3 sm:pt-6">
            <CardTitle>Before you start</CardTitle>
            <CardDescription>Short, clear details are enough for a useful first report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pb-4 text-sm leading-5 text-muted-foreground sm:space-y-2.5 sm:pb-6 sm:leading-6">
            {[
              'Add a photo',
              'AI can help fill details',
              'Choose area and society',
            ].map((tip, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2.5 sm:px-4 sm:py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm leading-5 text-foreground/85">{tip}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {errorMessage ? (
        <FormMessage className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </FormMessage>
      ) : null}

      <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>{hasSubmitted ? 'Report submitted' : 'Report a Dog'}</CardTitle>
          <CardDescription>
            {hasSubmitted
              ? 'Thank you for taking a moment to help this dog get seen by the community.'
              : 'A shorter, simpler report helps volunteers act faster on mobile.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-2xl border border-border/70 bg-secondary/40" />
              ))}
            </div>
          ) : hasSubmitted ? (
            <div className="grid gap-5">
              <Card className="overflow-hidden rounded-2xl border-dashed border-border bg-secondary/20">
                <CardContent className="grid gap-5 p-6 sm:p-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                      Thank you for looking out for them.
                    </h3>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Your report has been submitted to volunteers in this area. Someone will check on this dog soon.
                    </p>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Because of you, this dog is now visible to the community.
                    </p>
                  </div>

                  {submittedDogPreview ? (
                    <div className="grid gap-4 rounded-[1.5rem] border border-white/60 bg-white/85 p-4 shadow-soft sm:grid-cols-[0.8fr_1.2fr]">
                      <div className="overflow-hidden rounded-[1.35rem] bg-secondary/30">
                        {submittedDogPreview.image ? (
                          <img src={submittedDogPreview.image} alt={submittedDogPreview.name} className="h-44 w-full object-cover" />
                        ) : (
                          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No image shared</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">{submittedDogPreview.name}</p>
                        <p className="text-sm font-medium text-muted-foreground">{submittedDogPreview.areaLabel}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{submittedDogPreview.location}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {!activeUser ? (
                      <Button type="button" onClick={() => setIsSignInPromptOpen(true)}>
                        Sign in to track this dog
                      </Button>
                    ) : (
                      <Button type="button" onClick={() => onNavigate('/dogs')}>
                        Browse Dogs
                      </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={resetFormState}>
                      Report another dog
                    </Button>
                  </div>

                  <button
                    type="button"
                    className="w-fit text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                    onClick={() => onNavigate('/')}
                  >
                    Skip for now
                  </button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <Card className="overflow-hidden rounded-2xl border-dashed border-border bg-secondary/20">
                <CardContent className="space-y-4 p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Photo</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Choose a photo if you have one, then optionally ask AI to suggest details.
                    </p>
                  </div>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-white/80 px-5 py-8 text-center transition hover:bg-white">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {selectedImageFile ? selectedImageFile.name : 'Choose a dog photo'}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        The photo stays optional for manual reporting.
                      </p>
                    </div>
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={handleSelectedImageChange}
                    />
                  </label>
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/70">
                    {selectedImagePreview ? (
                      <img src={selectedImagePreview} alt="Selected dog preview" className="h-56 w-full object-cover" />
                    ) : (
                      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                        Photo preview will appear here.
                      </div>
                    )}
                    {isAnalyzingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-foreground shadow-soft">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Reviewing AI suggestions...
                        </div>
                      </div>
                    ) : null}
                    {isUploadingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-foreground shadow-soft">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading photo...
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!selectedImageFile || isAnalyzingPhoto || isUploadingPhoto || isSaving}
                      onClick={handleAnalyzePhoto}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isAnalyzingPhoto ? 'Analyzing photo...' : 'Analyze photo with AI'}
                    </Button>
                  </div>
                  {aiStatusMessage ? (
                    <FormDescription>{aiStatusMessage}</FormDescription>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-white/70 bg-white/95">
                <CardContent className="grid gap-5 p-5">
                  <FormField>
                    <FormLabel>Dog name</FormLabel>
                    <Input
                      placeholder="Optional temporary name"
                      value={form.dog_name_or_temp_name}
                      onChange={(event) => setFormValue('dog_name_or_temp_name', event.target.value)}
                    />
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
                    <FormLabel>Condition / status</FormLabel>
                    <Input
                      placeholder="Stable, thin, cautious, limping, needs review…"
                      value={form.ai_condition}
                      onChange={(event) => setFormValue('ai_condition', event.target.value)}
                    />
                    {fieldErrors.ai_condition ? <FormMessage>{fieldErrors.ai_condition}</FormMessage> : null}
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField>
                      <FormLabel>Breed / type</FormLabel>
                      <Input
                        placeholder="Indie, mixed breed, shepherd-like..."
                        value={form.ai_breed_guess}
                        onChange={(event) => setFormValue('ai_breed_guess', event.target.value)}
                      />
                    </FormField>

                    <FormField>
                      <FormLabel>Age band</FormLabel>
                      <Select value={form.ai_age_band || 'unknown'} onValueChange={(value) => setFormValue('ai_age_band', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age band" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_BAND_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

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
                    <FormLabel>Reporter name</FormLabel>
                    <Input
                      placeholder="Your name"
                      value={form.guest_name}
                      onChange={(event) => setFormValue('guest_name', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Phone Number</FormLabel>
                    <Input
                      inputMode="tel"
                      placeholder="Enter a phone number volunteers can call"
                      value={form.guest_contact}
                      onChange={(event) => setFormValue('guest_contact', normalizePhoneNumber(event.target.value))}
                    />
                    {fieldErrors.guest_contact ? <FormMessage>{fieldErrors.guest_contact}</FormMessage> : null}
                  </FormField>

                  <AreaSocietyFields
                    flow={areaSocietyFlow}
                    deferSocietyCreate={!activeUser?.id}
                    cardTitle="Area and society"
                    cardCopy="Share where the dog was last seen so StreetDog App can route this report to the right local volunteers. The report can still be saved even if there is no exact StreetDog App area match."
                  />
                  {fieldErrors.area ? <FormMessage>{fieldErrors.area}</FormMessage> : null}
                  {matchedAreaName ? (
                    <FormDescription>
                      Matched StreetDog App area: {matchedAreaName.city} - {matchedAreaName.name}
                    </FormDescription>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => onNavigate('/')}>
                      Back to Home
                    </Button>
                    <Button type="submit" disabled={isSaving || isUploadingPhoto || isAnalyzingPhoto}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting report...
                        </>
                      ) : (
                        'Submit Report'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </CardContent>
      </Card>

      {!activeUser && isDesktopPrompt ? (
        <Dialog open={isSignInPromptOpen} onOpenChange={setIsSignInPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stay connected to this dog&apos;s story</DialogTitle>
              <DialogDescription>
                Signing in is optional, and it helps you follow updates after your report.
              </DialogDescription>
            </DialogHeader>
            <AuthPromptContent onNavigate={onNavigate} />
          </DialogContent>
        </Dialog>
      ) : null}

      {!activeUser && !isDesktopPrompt ? (
        <Sheet open={isSignInPromptOpen} onOpenChange={setIsSignInPromptOpen}>
          <SheetContent side="bottom" className="top-auto h-auto max-h-[82vh] w-full max-w-none rounded-t-[2rem] border-x-0 border-b-0">
            <AuthPromptContent onNavigate={onNavigate} />
          </SheetContent>
        </Sheet>
      ) : null}
    </main>
  )
}
