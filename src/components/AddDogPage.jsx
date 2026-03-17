import { useEffect, useRef, useState } from 'react'
import { emptyDogForm } from '../data/seedData'
import { createDog, listActiveAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'

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
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Add Dog</p>
        <h2>Create a new dog record</h2>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {aiStatusMessage ? <p className="status-banner">{aiStatusMessage}</p> : null}

      {isLoading ? (
        <div className="panel empty-state">
          <h3>Loading areas</h3>
          <p>Preparing your signed-in dog creation form.</p>
        </div>
      ) : (
        <form className="panel stack" onSubmit={handleSubmit}>
          <div className="stack ai-upload-panel">
            <div>
              <h3>Dog photo</h3>
              <p className="helper-copy">
                Upload a dog photo to get AI-generated suggestions before saving.
              </p>
            </div>
            <input
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
            {selectedImagePreview ? (
              <img
                className="ai-preview-image"
                src={selectedImagePreview}
                alt="Selected dog preview"
              />
            ) : null}
            <div className="hero-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={!selectedImageFile || isAnalyzingImage}
                onClick={handleAnalyzeImage}
              >
                {isAnalyzingImage ? 'Analyzing dog image...' : 'Analyze with AI'}
              </button>
            </div>
          </div>

          {aiSuggestions ? (
            <div className="sub-card stack">
              <div>
                <h3>AI Suggestions</h3>
                <p className="helper-copy">
                  AI-generated suggestions. Please review before saving.
                </p>
              </div>
              <div className="detail-grid compact-grid">
                <p><strong>Name suggestion:</strong> {aiSuggestions.dog_name_or_temp_name || 'Not detected'}</p>
                <p><strong>Approx age:</strong> {aiSuggestions.approx_age || 'Not detected'}</p>
                <p><strong>Gender:</strong> {aiSuggestions.gender || 'Not detected'}</p>
                <p><strong>Dog color:</strong> {aiSuggestions.dog_color || 'Not detected'}</p>
                <p><strong>Dog size:</strong> {aiSuggestions.dog_size || 'Not detected'}</p>
                <p><strong>Likely breed:</strong> {aiSuggestions.likely_breed || 'Not detected'}</p>
                <p><strong>Temperament:</strong> {aiSuggestions.temperament || 'Not detected'}</p>
                <p><strong>Distinctive features:</strong> {aiSuggestions.distinctive_features || 'Not detected'}</p>
              </div>
              <p><strong>Health notes suggestion:</strong> {aiSuggestions.health_notes || 'Not detected'}</p>
            </div>
          ) : null}

          <input
            placeholder="Dog name or temporary name"
            value={form.dog_name_or_temp_name}
            onChange={(event) =>
              setForm((current) => ({ ...current, dog_name_or_temp_name: event.target.value }))
            }
          />
          <select
            required
            value={form.area_id}
            onChange={(event) => setForm((current) => ({ ...current, area_id: event.target.value }))}
          >
            <option value="">Select an area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.city} - {area.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Location description"
            value={form.location_description}
            onChange={(event) =>
              setForm((current) => ({ ...current, location_description: event.target.value }))
            }
          />
          <div className="dual-field">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={form.latitude}
              onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={form.longitude}
              onChange={(event) =>
                setForm((current) => ({ ...current, longitude: event.target.value }))
              }
            />
          </div>
          <div className="dual-field">
            <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </select>
            <input
              placeholder="Approx age"
              value={form.approx_age}
              onChange={(event) => setForm((current) => ({ ...current, approx_age: event.target.value }))}
            />
          </div>
          <div className="dual-field">
            <select
              value={form.vaccination_status}
              onChange={(event) =>
                setForm((current) => ({ ...current, vaccination_status: event.target.value }))
              }
            >
              {vaccinationOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </select>
            <select
              value={form.sterilization_status}
              onChange={(event) =>
                setForm((current) => ({ ...current, sterilization_status: event.target.value }))
              }
            >
              {sterilizationOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="Temperament"
            value={form.temperament}
            onChange={(event) => setForm((current) => ({ ...current, temperament: event.target.value }))}
          />
          <textarea
            placeholder="Health notes"
            value={form.health_notes}
            onChange={(event) => setForm((current) => ({ ...current, health_notes: event.target.value }))}
          />
          <select
            value={form.visibility_type}
            onChange={(event) =>
              setForm((current) => ({ ...current, visibility_type: event.target.value }))
            }
          >
            {visibilityOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving ? 'Saving dog...' : 'Save dog'}
          </button>
        </form>
      )}
    </section>
  )
}
