import { useEffect, useState } from 'react'
import { HeartHandshake, Loader2, MapPin, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { emptyGuestReportForm } from '../data/seedData'
import { useAuthState } from '../hooks/use-auth'
import { useCreateDog, useUploadDogPhoto } from '../hooks/use-dogs'
import { listActiveAreas } from '../lib/communityData'
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
  const { data: authState } = useAuthState()
  const createDogMutation = useCreateDog()
  const uploadDogPhotoMutation = useUploadDogPhoto()
  const activeUser = authState?.user ?? currentUser
  const isUploadingPhoto = uploadDogPhotoMutation.isPending
  const isSubmitDisabled = isSaving || isUploadingPhoto

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

  function resetFormState() {
    setForm(emptyGuestReportForm)
    setFieldErrors({})
    setErrorMessage('')
    setSelectedImageFile(null)
    setSubmittedDogPreview(null)
    setHasSubmitted(false)
    setIsSignInPromptOpen(false)
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.location_description.trim()) {
      nextErrors.location_description = 'Please share where you saw this dog.'
    }

    if (!form.area_id) {
      nextErrors.area_id = 'Please choose the area so volunteers know where to look.'
    }

    if (!activeUser?.id && selectedImageFile && !form.photo_url.trim()) {
      nextErrors.photo_url = 'Guests can paste a public photo link, or sign in later for direct uploads.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      let uploadedPhoto = {
        photo_path: null,
        photo_url: form.photo_url.trim() || null,
      }

      if (selectedImageFile) {
        if (!activeUser?.id) {
          throw new Error('Add a public photo link for now, or sign in to upload the image directly.')
        }

        uploadedPhoto = await uploadDogPhotoMutation.mutateAsync({
          file: selectedImageFile,
          userId: activeUser.id,
        })
      }

      const guestContact = formatGuestContact(form.guest_name, form.guest_contact)
      const payload = {
        dog_name_or_temp_name: form.dog_name_or_temp_name.trim() || null,
        area_id: form.area_id,
        added_by_guest: !activeUser?.id,
        added_by_user_id: activeUser?.id ?? null,
        tagged_by_user_id: activeUser?.id ?? null,
        guest_contact: guestContact,
        location_description: form.location_description.trim(),
        photo_path: uploadedPhoto.photo_path,
        photo_url: uploadedPhoto.photo_url,
        approx_age: form.approx_age.trim() || null,
        health_notes: form.health_notes.trim() || null,
        visibility_type: 'normal_area_visible',
        status: 'active',
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
          <Badge className="w-fit" variant="secondary">
            Public sighting report
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Spotted a dog that needs help?
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Share a quick report and local volunteers will pick it up from here. No account
              required.
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
                A thoughtful guest report makes this dog visible to the right local volunteers.
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>What to include</CardTitle>
            <CardDescription>
              Short, clear details are enough for a useful first report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-6 text-muted-foreground">
            {[
              'A photo or photo link makes it easier for volunteers to identify the dog quickly.',
              'The nearest street, gate, store, or landmark helps volunteers reach the right place.',
              'Any visible care concerns help the community know what may need attention first.',
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
              : 'Keep it simple. You can share only the details you know and volunteers can add more later.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse rounded-2xl border border-border/70 bg-secondary/40"
                />
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
                      Your report has been submitted to volunteers in this area. Someone will check
                      on this dog soon.
                    </p>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Because of you, this dog is now visible to the community.
                    </p>
                  </div>

                  {submittedDogPreview ? (
                    <div className="grid gap-4 rounded-[1.5rem] border border-white/60 bg-white/85 p-4 shadow-soft sm:grid-cols-[0.8fr_1.2fr]">
                      <div className="overflow-hidden rounded-[1.35rem] bg-secondary/30">
                        {submittedDogPreview.image ? (
                          <img
                            src={submittedDogPreview.image}
                            alt={submittedDogPreview.name}
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                            No image shared
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">
                          {submittedDogPreview.name}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground">
                          {submittedDogPreview.areaLabel}
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {submittedDogPreview.location}
                        </p>
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
                    <p className="text-sm font-semibold text-foreground">Photo upload</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Add a photo from your phone if you have one. If you already have a public image
                      link, you can paste that below instead.
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
                        JPG, PNG, or mobile camera images work best.
                      </p>
                    </div>
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(event) => setSelectedImageFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/70">
                    {selectedImagePreview ? (
                      <img
                        src={selectedImagePreview}
                        alt="Selected dog preview"
                        className="h-56 w-full object-cover"
                      />
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
                  <FormDescription>
                    Guests can submit with a public photo link. Signed-in users can upload directly
                    to StreetDog App storage.
                  </FormDescription>
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
                    {fieldErrors.location_description ? (
                      <FormMessage>{fieldErrors.location_description}</FormMessage>
                    ) : null}
                  </FormField>

                  <FormField>
                    <FormLabel>Area</FormLabel>
                    <Select
                      value={form.area_id}
                      onValueChange={(value) => setFormValue('area_id', value)}
                    >
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
                    {fieldErrors.area_id ? <FormMessage>{fieldErrors.area_id}</FormMessage> : null}
                  </FormField>

                  <FormField>
                    <FormLabel>Dog description</FormLabel>
                    <Input
                      placeholder="Puppy, brown coat, collar visible, playful, shy..."
                      value={form.approx_age}
                      onChange={(event) => setFormValue('approx_age', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Anything that needs attention? Injuries, limping, visible illness</FormLabel>
                    <Textarea
                      className="min-h-[96px]"
                      placeholder="Share anything that may help volunteers respond with care."
                      value={form.health_notes}
                      onChange={(event) => setFormValue('health_notes', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Your name (optional — helps us follow up)</FormLabel>
                    <Input
                      placeholder="Your name"
                      value={form.guest_name}
                      onChange={(event) => setFormValue('guest_name', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Phone or email (optional — only used if we need to reach you)</FormLabel>
                    <Input
                      placeholder="Phone number or email"
                      value={form.guest_contact}
                      onChange={(event) => setFormValue('guest_contact', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Dog name or temporary name</FormLabel>
                    <Input
                      placeholder="Brownie, White Puppy, Near Temple Dog..."
                      value={form.dog_name_or_temp_name}
                      onChange={(event) => setFormValue('dog_name_or_temp_name', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Photo link (optional)</FormLabel>
                    <div className="relative">
                      <UploadCloud className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-11"
                        placeholder="Paste a public photo URL if available"
                        value={form.photo_url}
                        onChange={(event) => setFormValue('photo_url', event.target.value)}
                      />
                    </div>
                    {fieldErrors.photo_url ? <FormMessage>{fieldErrors.photo_url}</FormMessage> : null}
                  </FormField>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={() => onNavigate('/')}>
                      Back to Home
                    </Button>
                    <Button type="submit" disabled={isSubmitDisabled}>
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
