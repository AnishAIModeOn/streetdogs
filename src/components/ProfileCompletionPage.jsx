import { useEffect, useState } from 'react'
import { emptyProfileCompletionForm } from '../data/seedData'
import { getProfile, listActiveAreas, updateProfile } from '../lib/communityData'
import { AuthShell } from './AuthShell'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export function ProfileCompletionPage({ user, profile, onComplete, onSignOut }) {
  const [areas, setAreas] = useState([])
  const [form, setForm] = useState({
    ...emptyProfileCompletionForm,
    full_name: profile?.full_name || '',
    primary_area_id: profile?.primary_area_id || '',
    upi_id: profile?.upi_id || '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load areas.')
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setErrorMessage('')
      await updateProfile(user.id, {
        full_name: form.full_name.trim() || null,
        primary_area_id: form.primary_area_id,
        upi_id: form.upi_id.trim() || null,
      })
      const nextProfile = await getProfile(user.id)
      onComplete(nextProfile)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AuthShell
      badge="StreetDog App"
      title="Finish your profile to continue"
      description="Choose your primary area so StreetDog App can apply the right visibility rules and show the right neighborhood records."
      asideTitle="Profile setup"
      asideCopy={`Signed in as ${user.email}`}
      footer={
        <Button type="button" variant="ghost" className="justify-start" onClick={onSignOut}>
          Sign out
        </Button>
      }
    >
      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-2xl border border-border/70 bg-secondary/40"
            />
          ))}
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FormField>
            <FormLabel>Full name</FormLabel>
            <Input
              required
              placeholder="Your full name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </FormField>
          <FormField>
            <FormLabel>UPI ID</FormLabel>
            <Input
              placeholder="Optional for future contribution flows"
              value={form.upi_id}
              onChange={(event) => setForm((current) => ({ ...current, upi_id: event.target.value }))}
            />
            <FormDescription>
              Add this now if you may raise support requests later.
            </FormDescription>
          </FormField>
          <FormField>
            <FormLabel>Primary area</FormLabel>
            <Select
              value={form.primary_area_id}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, primary_area_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your primary area" />
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
          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? 'Saving profile...' : 'Save and continue'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
