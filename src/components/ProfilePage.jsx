import { AuthShell } from './AuthShell'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { useProfile } from '../hooks/useProfile'

function getLocalityName(locality) {
  return (
    locality?.name ||
    locality?.locality_name ||
    locality?.neighbourhood ||
    locality?.label ||
    locality?.title ||
    'Unknown area'
  )
}

function getLocalityId(locality) {
  return String(locality?.id || locality?.locality_id || locality?.uuid || locality?.value || '')
}

function getSocietyId(society) {
  return String(society?.id || society?.society_id || society?.uuid || society?.value || '')
}

export function ProfilePage({ user, profile, onComplete, onSignOut }) {
  const {
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
  } = useProfile(user.id, profile)

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const nextProfile = await saveProfile()
      onComplete(nextProfile)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your profile.')
    }
  }

  return (
    <AuthShell
      badge="StreetDog App"
      title="Update your profile"
      description="Keep your details current so StreetDog App can personalize local dogs, societies, and support flows."
      asideTitle="Profile settings"
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
          {Array.from({ length: 4 }).map((_, index) => (
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
              onChange={(event) =>
                setForm((current) => ({ ...current, full_name: event.target.value }))
              }
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

          <div className="grid gap-4 rounded-[1.6rem] border border-white/70 bg-secondary/18 p-4">
            <div>
              <p className="text-base font-semibold text-foreground">Your Location</p>
              <p className="text-sm text-muted-foreground">
                Choose your area first, then optionally attach your society.
              </p>
            </div>

            <FormField>
              <FormLabel>Area</FormLabel>
              <select
                value={form.home_locality_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    home_locality_id: event.target.value,
                    society_id: '',
                  }))
                }
                className="flex h-11 w-full items-center rounded-2xl border border-input bg-white/90 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select your area</option>
                {localities.map((locality) => (
                  <option key={getLocalityId(locality)} value={getLocalityId(locality)}>
                    {[locality.city, getLocalityName(locality)].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
              <FormDescription>Required. Loaded from the `localities` table.</FormDescription>
            </FormField>

            <FormField>
              <FormLabel>Society</FormLabel>
              <select
                value={form.society_id || ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    society_id: event.target.value,
                  }))
                }
                disabled={!form.home_locality_id}
                className="flex h-11 w-full items-center rounded-2xl border border-input bg-white/90 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {form.home_locality_id ? 'No society' : 'Choose area first'}
                </option>
                {societies.map((society) => (
                  <option key={getSocietyId(society)} value={getSocietyId(society)}>
                    {society.name || society.society_name || society.title || 'Unnamed society'}
                  </option>
                ))}
              </select>
              <FormDescription>
                Optional. Societies are loaded only for the selected area.
                {selectedLocality ? ` Current area: ${getLocalityName(selectedLocality)}.` : ''}
              </FormDescription>
            </FormField>
          </div>

          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? 'Saving profile...' : 'Save profile'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
