import { useEffect, useRef, useState } from 'react'
import { Sparkles, UploadCloud } from 'lucide-react'
import { emptyDogForm } from '../data/seedData'
import { createDog, listActiveAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

const genderOptions = ['unknown', 'male', 'female']
const vaccinationOptions = ['unknown', 'not_vaccinated', 'partially_vaccinated', 'vaccinated']
const sterilizationOptions = ['unknown', 'not_sterilized', 'scheduled', 'sterilized']
const visibilityOptions = ['normal_area_visible', 'uploader_and_area_visible']
const autoFillableFields = [
  'dog_name_or_temp_name',
  'approx_age',
  'gender',
  'health_notes',
  'temperament',
]

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }

    reader.onerror = () => reject(new Error('Unable to read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('This photo format could not be prepared for AI analysis.'))
    image.src = dataUrl
  })
}

async function prepareImageForAnalysis(file) {
  const originalDataUrl = await fileToDataUrl(file)
  const image = await loadImage(originalDataUrl)
  const maxDimension = 1600
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to prepare the selected image for AI analysis.')
  }

  context.drawImage(image, 0, 0, width, height)

  const normalizedDataUrl = canvas.toDataURL('image/jpeg', 0.82)
  const [, imageBase64 = ''] = normalizedDataUrl.split(',')

  return {
    imageBase64,
    mimeType: 'image/jpeg',
  }
}

function parseApiJsonSafely(rawText) {
  if (!rawText) {
    return {}
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(
      `AI analysis returned an unexpected response. ${rawText.slice(0, 140)}`.trim(),
    )
  }
}

export function AddDogPage({ user, profile }) {
  const analysisRequestIdRef = useRef(0)
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState({
    ...emptyDogForm,
    area_id: profile?.primary_area_id || '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiStatusMessage, setAiStatusMessage] = useState('')

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

  const handleAnalyzeImage = async () => {
    if (isAnalyzingImage) {
      return
    }

    if (!selectedImageFile) {
      setErrorMessage('Please choose a dog photo before running AI analysis.')
      return
    }

    const fileToAnalyze = selectedImageFile
    const requestId = analysisRequestIdRef.current + 1
    analysisRequestIdRef.current = requestId

    try {
      setIsAnalyzingImage(true)
      setErrorMessage('')
      setAiStatusMessage('')

      const { imageBase64, mimeType } = await prepareImageForAnalysis(fileToAnalyze)
      const response = await fetch('/api/ai/analyze-dog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      })

      const rawText = await response.text()
      const payload = parseApiJsonSafely(rawText)

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            'AI analysis is temporarily unavailable. You can still fill the dog profile manually.',
        )
      }

      const nextSuggestions = payload?.suggestions

      if (!nextSuggestions) {
        throw new Error('AI analysis returned no suggestions.')
      }

      if (analysisRequestIdRef.current !== requestId) {
        return
      }

      setAiSuggestions(nextSuggestions)
      setAiStatusMessage(
        payload?.cached
          ? 'We found an existing AI analysis for this same image and reused it.'
          : 'AI analysis completed. Please review the suggestions before saving.',
      )
      setForm((current) => {
        const nextForm = { ...current }

        for (const field of autoFillableFields) {
          const nextValue = nextSuggestions[field]
          if (nextValue) {
            nextForm[field] = nextValue
          }
        }

        return nextForm
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.name === 'AbortError'
          ? 'Image analysis was interrupted. Please try again once the image finishes loading.'
          : 'AI analysis is temporarily unavailable. You can still fill the dog profile manually.',
      )
    } finally {
      if (analysisRequestIdRef.current === requestId) {
        setIsAnalyzingImage(false)
      }
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setErrorMessage('')
      const createdDog = await createDog({
        ...form,
        added_by_user_id: user.id,
        added_by_guest: false,
        guest_contact: form.guest_contact.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
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
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Add Dog
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Create a new dog record
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Add a dog profile with clear location and care notes so volunteers can track support
              with confidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigateTo('/dogs')}>
              Back to Dogs
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Before you save</CardTitle>
            <CardDescription>
              One clear photo and a short location description usually create the most useful first
              record.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-2xl bg-secondary/40 p-4">
              Pick the correct area so the dog is visible to the right local volunteers.
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              AI analysis can help suggest age, gender, temperament, and care notes from the photo.
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              You can review all AI suggestions before saving anything.
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {aiStatusMessage ? <StatusBanner variant="success">{aiStatusMessage}</StatusBanner> : null}

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
                  Upload a dog photo to get AI-generated suggestions before saving.
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
                      Mobile camera photos work well for AI analysis.
                    </p>
                  </div>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    disabled={isAnalyzingImage}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      analysisRequestIdRef.current += 1
                      setSelectedImageFile(nextFile)
                      setAiSuggestions(null)
                      setAiStatusMessage('')
                    }}
                  />
                </label>

                {selectedImagePreview ? (
                  <img
                    src={selectedImagePreview}
                    alt="Selected dog preview"
                    className="h-64 w-full rounded-[1.5rem] border border-border/70 object-cover"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-white/70 text-sm text-muted-foreground">
                    Photo preview will appear here.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!selectedImageFile || isAnalyzingImage}
                    onClick={handleAnalyzeImage}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isAnalyzingImage ? 'Analyzing dog image...' : 'Analyze with AI'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {aiSuggestions ? (
              <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
                <CardHeader>
                  <CardTitle>AI Suggestions</CardTitle>
                  <CardDescription>
                    Review the suggestions before saving the dog record.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <SuggestionTile
                    label="Name suggestion"
                    value={aiSuggestions.dog_name_or_temp_name || 'Not detected'}
                  />
                  <SuggestionTile label="Approx age" value={aiSuggestions.approx_age || 'Not detected'} />
                  <SuggestionTile label="Gender" value={aiSuggestions.gender || 'Not detected'} />
                  <SuggestionTile label="Dog color" value={aiSuggestions.dog_color || 'Not detected'} />
                  <SuggestionTile label="Dog size" value={aiSuggestions.dog_size || 'Not detected'} />
                  <SuggestionTile label="Likely breed" value={aiSuggestions.likely_breed || 'Not detected'} />
                  <SuggestionTile label="Temperament" value={aiSuggestions.temperament || 'Not detected'} />
                  <SuggestionTile
                    label="Distinctive features"
                    value={aiSuggestions.distinctive_features || 'Not detected'}
                  />
                  <div className="rounded-2xl bg-secondary/30 p-4 md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Health notes suggestion</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {aiSuggestions.health_notes || 'Not detected'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Dog details</CardTitle>
                <CardDescription>
                  Add the core profile details and review them before saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <FormField>
                  <FormLabel>Dog name or temporary name</FormLabel>
                  <Input
                    placeholder="Dog name or temporary name"
                    value={form.dog_name_or_temp_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dog_name_or_temp_name: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField>
                  <FormLabel>Area</FormLabel>
                  <Select
                    value={form.area_id}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, area_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an area" />
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

                <FormField>
                  <FormLabel>Location description</FormLabel>
                  <Textarea
                    placeholder="Location description"
                    value={form.location_description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location_description: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField>
                    <FormLabel>Latitude</FormLabel>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={form.latitude}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, latitude: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField>
                    <FormLabel>Longitude</FormLabel>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={form.longitude}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, longitude: event.target.value }))
                      }
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      value={form.gender}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, gender: value }))
                      }
                    >
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
                      onChange={(event) =>
                        setForm((current) => ({ ...current, approx_age: event.target.value }))
                      }
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField>
                    <FormLabel>Vaccination status</FormLabel>
                    <Select
                      value={form.vaccination_status}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, vaccination_status: value }))
                      }
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
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, sterilization_status: value }))
                      }
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
                    onChange={(event) =>
                      setForm((current) => ({ ...current, temperament: event.target.value }))
                    }
                  />
                </FormField>

                <FormField>
                  <FormLabel>Health notes</FormLabel>
                  <Textarea
                    placeholder="Health notes"
                    value={form.health_notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, health_notes: event.target.value }))
                    }
                  />
                </FormField>

                <FormField>
                  <FormLabel>Visibility</FormLabel>
                  <Select
                    value={form.visibility_type}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, visibility_type: value }))
                    }
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
                  <Button type="submit" disabled={isSaving}>
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

function SuggestionTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/30 p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}
