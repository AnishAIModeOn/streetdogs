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

function buildHealthNotesFromAi(suggestions) {
  return [suggestions.ai_condition, suggestions.ai_injuries].filter(Boolean).join('. ').trim()
}

function formatGuestContact(name, contact) {
  const trimmedName = name.trim()
  const trimmedContact = contact.trim()

  if (trimmedName && trimmedContact) {
    return `${trimmedName} | ${trimmedContact}`
  }

  return trimmedName || trimmedContact || null
}

function findAreaLabel(areas, areaId) {
  const area = areas.find((entry) => entry.id === areaId)
  return area ? `${area.city} - ${area.name}` : 'Area unavailable'
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
  const areaSocietyFlow = useAreaSocietyFlow({
    autoDetect: true,
    deferSocietyCreate: !activeUser?.id,
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
      setAiStatusMessage('Analyzing photo with AI…')
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
        ai_summary_user: suggestions.ai_summary || current.ai_summary,
        ai_condition_user: suggestions.ai_condition || current.ai_condition,
        approx_age: current.approx_age || (suggestions.ai_age_band !== 'unknown' ? suggestions.ai_age_band : ''),
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
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.location_description.trim()) {
      nextErrors.location_description = 'Please share where you saw this dog.'
    }
    if (!form.area_id) {
      nextErrors.area_id = 'Please choose the StreetDog App area so volunteers know where to look.'
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

      const resolvedSociety = activeUser?.id
        ? await areaSocietyFlow.resolveSelectedSociety()
        : areaSocietyFlow.selectedSociety

      const guestContact = formatGuestContact(form.guest_name, form.guest_contact)
      const payload = {
        dog_name_or_temp_name: form.dog_name_or_temp_name.trim() || null,
        area_id: form.area_id,
        added_by_guest: !activeUser?.id,
        added_by_user_id: activeUser?.id ?? null,
        tagged_by_user_id: activeUser?.id ?? null,
        tagged_society_id: resolvedSociety?._pending ? null : resolvedSociety?.id ?? null,
        tagged_society_name: resolvedSociety?.name ?? null,
        tagged_area_pincode: areaSocietyFlow.areaContext.pincode || null,
        tagged_area_neighbourhood: areaSocietyFlow.areaContext.neighbourhood || null,
        guest_contact: guestContact,
        location_description: form.location_description.trim(),
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
        areaLabel: findAreaLabel(areas, form.area_id),
        location: form.location_description.trim(),
        name: form.dog_name_or_temp_name.trim() || 'Community dog report',
      })
      setForm(emptyGuestReportForm)
      setSelectedImageFile(null)
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <Badge className="w-fit" variant="secondary">Public sighting report</Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Spotted a dog that needs help?
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Share a quick report and local volunteers will pick it up from here. No account required.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                Location matters most
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Pick the area and describe exactly where you saw the dog so volunteers can find it.
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HeartHandshake className="h-3.5 w-3.5" />
                </div>
                Guests welcome
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                AI is optional. You can always fill the report yourself and submit manually.
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>What to include</CardTitle>
            <CardDescription>Short, clear details are enough for a useful first report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-6 text-muted-foreground">
            {[
              'Upload a photo safely and review it before you do anything else.',
              'Use the same area and society flow used elsewhere in StreetDog App.',
              'If AI helps, it fills the same form you will submit.',
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl bg-secondary/40 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] font-bold text-primary">
                  {index + 1}
                </span>
                <span>{tip}</span>
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
                      onChange={(event) => {
                        setSelectedImageFile(event.target.files?.[0] ?? null)
                        setAiStatusMessage('')
                      }}
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
                    {isUploadingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-foreground shadow-soft">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading photo…
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
                      {dogAiMutation.isPending ? 'Analyzing photo…' : 'Analyze photo with AI'}
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
                    <FormLabel>Where did you see them? Street, landmark, or building name</FormLabel>
                    <Textarea
                      required
                      placeholder="Street name, nearby shop, apartment gate, feeding spot, or landmark"
                      value={form.location_description}
                      onChange={(event) => setFormValue('location_description', event.target.value)}
                    />
                    {fieldErrors.location_description ? <FormMessage>{fieldErrors.location_description}</FormMessage> : null}
                  </FormField>

                  <AreaSocietyFields
                    flow={areaSocietyFlow}
                    deferSocietyCreate={!activeUser?.id}
                    cardTitle="Area and society"
                    cardCopy="Use your location or type your neighbourhood to mirror the same warm area flow available during account setup."
                  />

                  <FormField>
                    <FormLabel>Detected / editable found area</FormLabel>
                    <Select value={form.area_id} onValueChange={(value) => setFormValue('area_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the area" />
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
                      {matchedAreaName ? `Matched area: ${matchedAreaName.city} - ${matchedAreaName.name}` : 'This routes the report to the right volunteer group.'}
                    </FormDescription>
                    {fieldErrors.area_id ? <FormMessage>{fieldErrors.area_id}</FormMessage> : null}
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
                    <FormLabel>Optional contact details</FormLabel>
                    <Input
                      placeholder="Your name, phone, or email if follow-up is needed"
                      value={form.guest_contact}
                      onChange={(event) => setFormValue('guest_contact', event.target.value)}
                    />
                  </FormField>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => onNavigate('/')}>
                      Back to Home
                    </Button>
                    <Button type="submit" disabled={isSaving || isUploadingPhoto}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting report…
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
