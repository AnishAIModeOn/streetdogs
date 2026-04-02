import { useEffect, useMemo, useState } from 'react'
import { emptyProfileCompletionForm } from '../data/seedData'
import { createSociety, getProfile } from '../lib/communityData'
import { normalizeAreaLabel, useAreaSocietyFlow } from './use-area-society-flow'
import { getAuthState, updateMyProfile } from '../services/auth.service'

type SocietyShape = {
  id?: string | null
  name?: string | null
  pincode?: string | null
  neighbourhood?: string | null
  _pending?: boolean
}

type ProfileShape = {
  id: string
  full_name?: string | null
  upi_id?: string | null
  area_name?: string | null
  neighbourhood?: string | null
  pincode?: string | null
  primary_area_id?: string | null
  society_id?: string | null
  societies?: SocietyShape | null
}

function getInitialAreaLabel(profile: ProfileShape | null) {
  return normalizeAreaLabel(
    profile?.societies?.neighbourhood || profile?.neighbourhood || profile?.area_name || '',
  )
}

function getInitialSociety(profile: ProfileShape | null) {
  if (!profile?.societies?.name && !profile?.society_id) {
    return null
  }

  return {
    id: profile?.society_id || profile?.societies?.id || null,
    name: profile?.societies?.name || '',
    pincode: profile?.societies?.pincode || profile?.pincode || null,
    neighbourhood:
      profile?.societies?.neighbourhood || profile?.neighbourhood || profile?.area_name || null,
  }
}

async function resolveSocietyId(selectedSociety: SocietyShape | null) {
  if (!selectedSociety) {
    return null
  }

  if (!selectedSociety._pending) {
    return selectedSociety.id ?? null
  }

  if (!selectedSociety.name || !selectedSociety.pincode) {
    throw new Error('Please choose an area with a pincode before adding a new society.')
  }

  const created = await createSociety({
    name: selectedSociety.name,
    pincode: selectedSociety.pincode,
    neighbourhood: selectedSociety.neighbourhood || null,
    coordinates: null,
  })

  return created?.id ?? null
}

export function useProfile(userId: string, initialProfile: ProfileShape | null) {
  const initialAreaLabel = useMemo(() => getInitialAreaLabel(initialProfile), [initialProfile])
  const initialPincode = useMemo(
    () => initialProfile?.societies?.pincode || initialProfile?.pincode || '',
    [initialProfile],
  )
  const initialSociety = useMemo(() => getInitialSociety(initialProfile), [initialProfile])
  const [form, setForm] = useState({
    ...emptyProfileCompletionForm,
    full_name: initialProfile?.full_name || '',
    upi_id: initialProfile?.upi_id || '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const areaSocietyFlow = useAreaSocietyFlow({
    autoDetect: false,
    initialAreaLabel,
    initialPincode,
    initialSociety,
  })

  useEffect(() => {
    setForm((current) => ({
      ...current,
      full_name: initialProfile?.full_name || '',
      upi_id: initialProfile?.upi_id || '',
    }))
  }, [initialProfile?.full_name, initialProfile?.upi_id])

  useEffect(() => {
    areaSocietyFlow.applySnapshot({
      areaInput: initialAreaLabel,
      pincode: initialPincode,
      selectedSociety: initialSociety,
      manual: true,
      detectedLabel: '',
      detectedNeighbourhood: '',
      societyDraftName: '',
    })
  }, [
    areaSocietyFlow.applySnapshot,
    initialAreaLabel,
    initialPincode,
    initialSociety,
  ])

  const selectedAreaLabel = useMemo(
    () => normalizeAreaLabel(areaSocietyFlow.areaContext.neighbourhood || areaSocietyFlow.areaLabel),
    [areaSocietyFlow.areaContext.neighbourhood, areaSocietyFlow.areaLabel],
  )

  async function saveProfile() {
    const trimmedFullName = form.full_name.trim()

    if (!trimmedFullName) {
      throw new Error('Full name is required.')
    }

    if (!selectedAreaLabel) {
      throw new Error('Area is required.')
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      const societyId = await resolveSocietyId(areaSocietyFlow.selectedSociety)
      const profileUpdate: Record<string, string | null> = {
        full_name: trimmedFullName,
        upi_id: form.upi_id.trim() || null,
        neighbourhood: selectedAreaLabel || null,
        pincode: areaSocietyFlow.areaContext.pincode || null,
        society_id: societyId,
      }

      await updateMyProfile({
        id: userId,
        ...profileUpdate,
      } as any)

      const authState = await getAuthState().catch(() => null)
      return authState?.profile ?? (await getProfile(userId))
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
    areaSocietyFlow,
    isLoading,
    isSaving,
    errorMessage,
    setErrorMessage,
    saveProfile,
  }
}
