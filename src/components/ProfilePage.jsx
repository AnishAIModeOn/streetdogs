import { AuthShell } from './AuthShell'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
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
              <Select
                value={form.home_locality_id}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    home_locality_id: value,
                    society_id: '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your area" />
                </SelectTrigger>
                <SelectContent>
                  {localities.map((locality) => (
                    <SelectItem key={getLocalityId(locality)} value={getLocalityId(locality)}>
                      {[locality.city, getLocalityName(locality)].filter(Boolean).join(' - ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Required. Loaded from the `localities` table.</FormDescription>
            </FormField>

            <FormField>
              <FormLabel>Society</FormLabel>
              <Select
                value={form.society_id || '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    society_id: value === '__none__' ? '' : value,
                  }))
                }
                disabled={!form.home_locality_id}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={form.home_locality_id ? 'Select your society' : 'Choose area first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No society</SelectItem>
                  {societies.map((society) => (
                    <SelectItem key={getSocietyId(society)} value={getSocietyId(society)}>
                      {society.name || society.society_name || society.title || 'Unnamed society'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
