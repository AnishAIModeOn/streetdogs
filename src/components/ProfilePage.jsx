import { AuthShell } from './AuthShell'
import { AreaSocietyFields } from './AreaSocietyFields'
import { StatusBanner } from './StatusBanner'
import { Button } from './ui/button'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { useProfile } from '../hooks/useProfile'

export function ProfilePage({ user, profile, onComplete, onSignOut }) {
  const {
    form,
    setForm,
    areaSocietyFlow,
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

          <AreaSocietyFields
            flow={areaSocietyFlow}
            deferSocietyCreate
            cardTitle="Area and society"
            compact
          />

          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? 'Saving profile...' : 'Save profile'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
