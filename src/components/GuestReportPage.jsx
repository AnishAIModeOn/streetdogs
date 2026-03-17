import { useEffect, useState } from 'react'
import { HeartHandshake, MapPin, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { emptyGuestReportForm } from '../data/seedData'
import { listActiveAreas } from '../lib/communityData'
import { ensureSupabase } from '../lib/supabaseClient'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

export function GuestReportPage({ onNavigate }) {
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState(emptyGuestReportForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState('')

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

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')
      const client = ensureSupabase()
      const payload = {
        dog_name_or_temp_name: form.dog_name_or_temp_name.trim() || null,
        area_id: form.area_id,
        added_by_guest: true,
        added_by_user_id: null,
        guest_contact: form.guest_contact.trim(),
        location_description: form.location_description.trim(),
        photo_url: form.photo_url.trim() || null,
        approx_age: form.approx_age.trim() || null,
        health_notes: form.health_notes.trim() || null,
        visibility_type: 'normal_area_visible',
        status: 'active',
      }

      const { error } = await client.from('dogs').insert(payload)

      if (error) {
        throw error
      }

      setForm(emptyGuestReportForm)
      setSelectedImageFile(null)
      setSuccessMessage('Thanks. Your dog report has been submitted successfully.')
      toast.success('Dog report submitted', {
        description: 'Thank you for reporting this dog. Local volunteers can review it now.',
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit the dog report.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Public report flow
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Report a dog without signing in
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Share a quick report so volunteers in the area can review the dog, update the record,
              and coordinate the next steps.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/85 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                Local context matters
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Pick the area and tell us exactly where you saw the dog so volunteers can follow up.
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HeartHandshake className="h-4 w-4 text-accent" />
                Friendly for guests
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You can submit a report without creating an account. We only need enough detail to
                review the dog safely.
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>What to include</CardTitle>
            <CardDescription>
              Short, clear details are usually enough for a useful first report.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-2xl bg-secondary/50 p-4">
              The nearest landmark, street, or feeding spot where the dog was seen.
            </div>
            <div className="rounded-2xl bg-secondary/50 p-4">
              Any visible concerns like limping, wounds, hunger, or unusual behavior.
            </div>
            <div className="rounded-2xl bg-secondary/50 p-4">
              A photo link if you have one, so the community can recognize the dog faster.
            </div>
          </CardContent>
        </Card>
      </section>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}

      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Report a Dog</CardTitle>
          <CardDescription>
            Keep it simple. You can share only the details you know and volunteers can add more later.
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
          ) : (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="overflow-hidden rounded-2xl border-dashed border-border bg-secondary/20">
                  <CardContent className="space-y-4 p-5">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Photo upload</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Add a photo from your phone if you have one. It helps volunteers recognize
                        the dog faster. If you already have a public image link, you can paste that
                        instead.
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
                    {selectedImagePreview ? (
                      <img
                        src={selectedImagePreview}
                        alt="Selected dog preview"
                        className="h-52 w-full rounded-[1.5rem] border border-border/70 object-cover"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-white/60 text-sm text-muted-foreground">
                        Photo preview will appear here.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border-dashed border-border bg-secondary/30">
                  <CardContent className="space-y-3 p-5">
                    <p className="text-sm font-semibold text-foreground">AI and volunteer review</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Signed-in volunteers can use AI-assisted review to enrich the profile with
                      age, visible features, and health hints after your report is submitted.
                    </p>
                    <div className="rounded-2xl bg-white/70 p-4 text-sm leading-6 text-muted-foreground">
                      Best results usually come from one clear photo, the exact sighting location,
                      and a short note about condition or behavior.
                    </div>
                    <FormMessage className="text-muted-foreground">
                      Image upload is included in the guest flow, but the current submission still
                      stores the public photo link field below for volunteer follow-up.
                    </FormMessage>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField>
                  <FormLabel>Dog name or temporary name</FormLabel>
                  <Input
                    placeholder="Brownie, White Puppy, Near Temple Dog..."
                    value={form.dog_name_or_temp_name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dog_name_or_temp_name: event.target.value }))
                    }
                  />
                </FormField>

                <FormField>
                  <FormLabel>Area</FormLabel>
                  <Select
                    value={form.area_id}
                    onValueChange={(value) => setForm((current) => ({ ...current, area_id: value }))}
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
                </FormField>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField>
                  <FormLabel>Your contact</FormLabel>
                  <Input
                    required
                    placeholder="Phone number or any contact detail"
                    value={form.guest_contact}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, guest_contact: event.target.value }))
                    }
                  />
                  <FormDescription>
                    This helps local volunteers reach you only if follow-up is needed.
                  </FormDescription>
                </FormField>

                <FormField>
                  <FormLabel>Photo link</FormLabel>
                  <div className="relative">
                    <UploadCloud className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-11"
                      placeholder="Paste a public photo URL if available"
                      value={form.photo_url}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, photo_url: event.target.value }))
                      }
                    />
                  </div>
                </FormField>
              </div>

              <FormField>
                <FormLabel>Where did you see the dog?</FormLabel>
                <Textarea
                  required
                  placeholder="Street name, nearby shop, apartment gate, feeding spot, or landmark"
                  value={form.location_description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location_description: event.target.value }))
                  }
                />
              </FormField>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField>
                  <FormLabel>Condition</FormLabel>
                  <Input
                    placeholder="Approx age, playful, limping, thin, collar visible..."
                    value={form.approx_age}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, approx_age: event.target.value }))
                    }
                  />
                </FormField>

                <FormField>
                  <FormLabel>Comments</FormLabel>
                  <Textarea
                    className="min-h-[88px]"
                    placeholder="Any health or care notes that could help volunteers"
                    value={form.health_notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, health_notes: event.target.value }))
                    }
                  />
                </FormField>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => onNavigate('/')}>
                  Back to Home
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="secondary" onClick={() => onNavigate('/signin')}>
                    Sign In Instead
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Submitting report...' : 'Submit Report'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
