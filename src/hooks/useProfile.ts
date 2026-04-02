import { useEffect, useMemo, useState } from 'react'
import { emptyProfileCompletionForm } from '../data/seedData'
import { getProfile, listLocalities, listSocietiesByLocality, updateProfile } from '../lib/communityData'

type ProfileShape = {
  id: string
  full_name?: string | null
  upi_id?: string | null
  home_locality_id?: string | null
  society_id?: string | null
}

export function useProfile(userId: string, initialProfile: ProfileShape | null) {
  const [localities, setLocalities] = useState<any[]>([])
  const [societies, setSocieties] = useState<any[]>([])
  const [form, setForm] = useState({
    ...emptyProfileCompletionForm,
    full_name: initialProfile?.full_name || '',
    home_locality_id: initialProfile?.home_locality_id || '',
    society_id: initialProfile?.society_id || '',
    upi_id: initialProfile?.upi_id || '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setForm((current) => ({
      ...current,
      full_name: initialProfile?.full_name || '',
      home_locality_id: initialProfile?.home_locality_id || '',
      society_id: initialProfile?.society_id || '',
      upi_id: initialProfile?.upi_id || '',
    }))
  }, [
    initialProfile?.full_name,
    initialProfile?.home_locality_id,
    initialProfile?.society_id,
    initialProfile?.upi_id,
  ])

  useEffect(() => {
    let isMounted = true

    const loadLocalities = async () => {
      try {
        setErrorMessage('')
        const nextLocalities = await listLocalities()
        if (isMounted) {
          setLocalities(nextLocalities)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load localities.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadLocalities()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadSocieties = async () => {
      if (!form.home_locality_id) {
        setSocieties([])
        return
      }

      try {
        setErrorMessage('')
        const nextSocieties = await listSocietiesByLocality(form.home_locality_id)
        if (!isMounted) {
          return
        }

        setSocieties(nextSocieties)
        if (
          form.society_id &&
          !nextSocieties.some((society) => society.id === form.society_id)
        ) {
          setForm((current) => ({ ...current, society_id: '' }))
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load societies.')
          setSocieties([])
        }
      }
    }

    loadSocieties()

    return () => {
      isMounted = false
    }
  }, [form.home_locality_id, form.society_id])

  const selectedLocality = useMemo(
    () => localities.find((locality) => locality.id === form.home_locality_id) ?? null,
    [form.home_locality_id, localities],
  )

  async function saveProfile() {
    const trimmedFullName = form.full_name.trim()

    if (!trimmedFullName) {
      throw new Error('Full name is required.')
    }

    if (!form.home_locality_id) {
      throw new Error('Area is required.')
    }

    if (
      form.society_id &&
      !societies.some(
        (society) => society.id === form.society_id && society.locality_id === form.home_locality_id,
      )
    ) {
      throw new Error('Selected society does not belong to the chosen area.')
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      await updateProfile(userId, {
        full_name: trimmedFullName,
        home_locality_id: form.home_locality_id,
        society_id: form.society_id || null,
        upi_id: form.upi_id.trim() || null,
      })

      return await getProfile(userId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile.'
      setErrorMessage(message)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return {
    form,
    setForm,
    localities,
    societies,
    selectedLocality,
    isLoading,
    isSaving,
    errorMessage,
    setErrorMessage,
    saveProfile,
  }
}
