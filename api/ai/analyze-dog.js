import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const GEMINI_PROMPT = `You are an AI assistant helping manage a street dog database.

Analyze the uploaded dog photo and return ONLY valid JSON with these fields:

{
  "ai_summary": "",
  "ai_condition": "",
  "ai_urgency": "",
  "ai_injuries": "",
  "ai_breed_guess": "",
  "ai_color": "",
  "ai_age_band": "",
  "gender": "",
  "temperament": ""
}

Rules:
- Make reasonable visual estimates only from the image.
- If uncertain, use short cautious guesses.
- ai_summary should be 1-2 short sentences.
- ai_condition should be a short description such as "appears stable", "thin and cautious", or "possible medical concern".
- ai_urgency must be one of: low, medium, high, critical.
- ai_age_band should be one of: puppy, young, adult, senior, unknown.
- gender should be one of: male, female, unknown
- temperament should be brief and cautious.
- Return JSON only, no markdown, no explanation.`
const GEMINI_MODEL = 'gemini-2.5-flash'
const ANALYSIS_TYPE = 'dog_profile'

const ALLOWED_AI_URGENCY = new Set(['low', 'medium', 'high', 'critical'])
const ALLOWED_APPROX_AGES = new Set(['puppy', 'young', 'adult', 'senior', 'unknown'])
const ALLOWED_GENDERS = new Set(['male', 'female', 'unknown'])

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEnum(value, allowedValues) {
  const nextValue = normalizeText(value).toLowerCase()
  return allowedValues.has(nextValue) ? nextValue : ''
}

function sanitizeSuggestionPayload(payload) {
  return {
    ai_summary: normalizeText(payload?.ai_summary),
    ai_condition: normalizeText(payload?.ai_condition),
    ai_urgency: normalizeEnum(payload?.ai_urgency, ALLOWED_AI_URGENCY),
    ai_injuries: normalizeText(payload?.ai_injuries),
    ai_breed_guess: normalizeText(payload?.ai_breed_guess),
    ai_color: normalizeText(payload?.ai_color),
    ai_age_band: normalizeEnum(payload?.ai_age_band, ALLOWED_APPROX_AGES) || 'unknown',
    gender: normalizeEnum(payload?.gender, ALLOWED_GENDERS) || 'unknown',
    temperament: normalizeText(payload?.temperament),
  }
}

function extractJsonFromText(text) {
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    // Continue trying to recover the first JSON object.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim())
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('Gemini did not return valid JSON.')
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
}

function collectGeminiText(payload) {
  const parts = payload?.candidates?.flatMap((candidate) => candidate?.content?.parts ?? []) ?? []
  return parts.map((part) => part?.text).filter(Boolean).join('\n').trim()
}

function createServerSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getImageHash(imageBase64) {
  const imageBuffer = Buffer.from(imageBase64, 'base64')
  const imageHash = createHash('sha256').update(imageBuffer).digest('hex')

  return { imageBuffer, imageHash }
}

function isTemporaryGeminiError(status, message) {
  const normalizedMessage = normalizeText(message).toLowerCase()

  if ([429, 500, 503].includes(status)) {
    return true
  }

  return [
    'quota',
    'rate limit',
    'resource exhausted',
    'billing',
    'temporarily unavailable',
    'temporarily',
    'unavailable',
    'overloaded',
    'try again later',
  ].some((fragment) => normalizedMessage.includes(fragment))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Only POST is supported for this route.' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Gemini is not configured on the server yet.' })
  }

  const { imageBase64, mimeType } = req.body ?? {}

  if (!imageBase64 || !mimeType) {
    return res
      .status(400)
      .json({ ok: false, error: 'Please upload a dog image before running AI analysis.' })
  }

  try {
    const serverSupabase = createServerSupabaseClient()
    const { imageHash } = getImageHash(imageBase64)

    if (serverSupabase) {
      const { data: cachedRow, error: cacheReadError } = await serverSupabase
        .from('ai_dog_analysis_cache')
        .select('result_json')
        .eq('image_hash', imageHash)
        .eq('analysis_type', ANALYSIS_TYPE)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!cacheReadError && cachedRow?.result_json) {
        const suggestions = sanitizeSuggestionPayload(cachedRow.result_json)
        return res.status(200).json({ ok: true, suggestions, cached: true })
      }
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: GEMINI_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      },
    )

    const payload = await geminiResponse.json()

    if (!geminiResponse.ok) {
      const apiMessage =
        payload?.error?.message || 'Gemini could not analyze this image right now.'

      if (isTemporaryGeminiError(geminiResponse.status, apiMessage)) {
        return res.status(503).json({
          ok: false,
          error: 'AI analysis is temporarily unavailable. Please try again in a minute.',
        })
      }

      throw new Error(apiMessage)
    }

    const rawText = collectGeminiText(payload)
    const parsedJson = extractJsonFromText(rawText)
    const suggestions = sanitizeSuggestionPayload(parsedJson)

    if (serverSupabase) {
      await serverSupabase.from('ai_dog_analysis_cache').insert({
        image_hash: imageHash,
        analysis_type: ANALYSIS_TYPE,
        result_json: suggestions,
      })
    }

    return res.status(200).json({ ok: true, suggestions, cached: false })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? `AI analysis failed. ${error.message}`
          : 'AI analysis failed. Please try another dog image.',
    })
  }
}
