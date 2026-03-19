export interface DogAiSuggestions {
  ai_summary: string
  ai_condition: string
  ai_urgency: string
  ai_breed_guess: string
  ai_color: string
  ai_age_band: string
  ai_injuries: string
  gender: string
  temperament: string
}

const AI_SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }

    reader.onerror = () => reject(new Error('Unable to read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('This photo format could not be prepared for AI analysis.'))
    image.src = dataUrl
  })
}

async function prepareDogImageForAnalysis(file: File) {
  const originalDataUrl = await fileToDataUrl(file)
  const mimeMatch = originalDataUrl.match(/^data:(.*?);base64,/)
  const originalMimeType = (mimeMatch?.[1] || file.type || '').toLowerCase()
  const [, originalBase64 = ''] = originalDataUrl.split(',')

  try {
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
  } catch (error) {
    if (AI_SUPPORTED_MIME_TYPES.has(originalMimeType) && originalBase64) {
      return {
        imageBase64: originalBase64,
        mimeType: originalMimeType === 'image/jpg' ? 'image/jpeg' : originalMimeType,
      }
    }

    if (['image/heic', 'image/heif'].includes(originalMimeType)) {
      throw new Error(
        'This photo format is not supported for AI analysis yet. Please use a JPG, PNG, or WebP image, or continue without AI.',
      )
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error('This photo format could not be prepared for AI analysis.')
  }
}

function parseApiJsonSafely(rawText: string) {
  if (!rawText) {
    return {}
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`AI analysis returned an unexpected response. ${rawText.slice(0, 140)}`.trim())
  }
}

export async function analyzeDogPhoto(file: File) {
  const { imageBase64, mimeType } = await prepareDogImageForAnalysis(file)
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

  if (!payload?.suggestions) {
    throw new Error('AI analysis returned no suggestions.')
  }

  return payload as {
    ok: true
    cached?: boolean
    suggestions: DogAiSuggestions
  }
}
