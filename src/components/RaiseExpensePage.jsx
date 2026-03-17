import { useEffect, useState } from 'react'
import { emptyExpenseForm } from '../data/seedData'
import { createExpense, createExpenseReceipt, getDog, getProfile, listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

const expenseTypes = ['food', 'medical', 'vaccination', 'rescue', 'other']

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

export function RaiseExpensePage({ dogId, user }) {
  const [dog, setDog] = useState(null)
  const [area, setArea] = useState(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyExpenseForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDog = async () => {
      try {
        setErrorMessage('')
        const [nextDog, areas, nextProfile] = await Promise.all([
          getDog(dogId),
          listAreas(),
          getProfile(user.id),
        ])

        if (!isMounted) {
          return
        }

        setDog(nextDog)
        setArea(areas.find((entry) => entry.id === nextDog?.area_id) ?? null)
        setProfile(nextProfile)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load the dog for this expense.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDog()

    return () => {
      isMounted = false
    }
  }, [dogId, user.id])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setErrorMessage('Please enter a total amount greater than 0.')
      return
    }

    if (!form.disclaimer_accepted) {
      setErrorMessage('Please accept the disclaimer before raising this expense.')
      return
    }

    if (!dog?.area_id) {
      setErrorMessage('This dog does not have a valid area, so an expense cannot be created.')
      return
    }

    if (!profile?.upi_id) {
      setErrorMessage('To raise an expense appeal you must first add your UPI ID.')
      window.setTimeout(() => {
        navigateTo('/profile')
      }, 900)
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const totalAmount = Number(form.total_amount)
      const payload = {
        dog_id: dog.id,
        raised_by_user_id: user.id,
        area_id: dog.area_id,
        expense_type: form.expense_type,
        description: form.description.trim() || null,
        total_amount: totalAmount,
        amount_contributed: 0,
        amount_pending: totalAmount,
        disclaimer_accepted: true,
        status: 'open',
      }

      const createdExpense = await createExpense(payload)

      if (form.receipt_url.trim()) {
        await createExpenseReceipt({
          expense_id: createdExpense.id,
          uploaded_by_user_id: user.id,
          file_url: form.receipt_url.trim(),
        })
      }

      setSuccessMessage('Expense raised successfully. Redirecting back to the dog detail page...')
      window.setTimeout(() => {
        navigateTo(`/dogs/${dog.id}`)
      }, 1200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to raise the expense.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <div className="h-6 w-40 animate-pulse rounded-full bg-secondary/50" />
            <div className="h-4 w-72 animate-pulse rounded-full bg-secondary/40" />
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!dog) {
    return (
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90 shadow-soft">
          <CardContent className="space-y-2 p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground">Dog not available</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              This dog could not be found or is outside your access scope.
            </p>
            <div className="pt-2">
              <Button variant="secondary" onClick={() => navigateTo('/dogs')}>
                Back to Dogs
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Raise Expense
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Create an expense for {dog.dog_name_or_temp_name || 'this dog'}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Start a clear, trustworthy expense request so supporters can understand the need and
              help with confidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigateTo(`/dogs/${dog.id}`)}>
              Back to Dog
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Expense context</CardTitle>
            <CardDescription>
              Keep requests specific and verifiable so the community can support quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-2xl bg-secondary/40 p-4">
              <span className="font-semibold text-foreground">Dog:</span>{' '}
              {dog.dog_name_or_temp_name || 'Unnamed dog'}
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              <span className="font-semibold text-foreground">Area:</span>{' '}
              {area ? `${area.city} - ${area.name}` : 'Area unavailable'}
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              Add a short description and receipt link if available so contributors have context.
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      {!profile?.upi_id ? (
        <Card className="rounded-[2rem] border-orange-200 bg-orange-50/80 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <h3 className="text-xl font-semibold text-foreground">UPI ID required</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              To raise an expense appeal you must first add your UPI ID.
            </p>
            <div>
              <Button onClick={() => navigateTo('/profile')}>
                Add UPI ID
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {profile?.upi_id ? (
        <form className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]" onSubmit={handleSubmit}>
          <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
            <CardHeader>
              <CardTitle>Expense details</CardTitle>
              <CardDescription>
                Keep the form simple and clear so supporters immediately understand what is needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <FormField>
                <FormLabel>Expense type</FormLabel>
                <Select
                  value={form.expense_type}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, expense_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {formatLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField>
                <FormLabel>Total amount</FormLabel>
                <Input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Total amount"
                  value={form.total_amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, total_amount: event.target.value }))
                  }
                />
              </FormField>

              <FormField>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Explain what this expense covers and why it is needed"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </FormField>

              <FormField>
                <FormLabel>Receipt URL</FormLabel>
                <Input
                  type="url"
                  placeholder="Receipt URL (optional)"
                  value={form.receipt_url}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, receipt_url: event.target.value }))
                  }
                />
                <FormDescription>
                  Add a bill, estimate, or proof link if you already have one.
                </FormDescription>
              </FormField>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Before you submit</CardTitle>
                <CardDescription>
                  A little context helps StreetDog App stay trustworthy and easy to support.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
                <div className="rounded-2xl bg-secondary/40 p-4">
                  Share the real amount needed and keep the description specific.
                </div>
                <div className="rounded-2xl bg-secondary/40 p-4">
                  Your UPI ID will be used by supporters to pay you directly.
                </div>
                <div className="rounded-2xl bg-secondary/40 p-4">
                  Receipt links build confidence and make the appeal easier to verify.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle>Disclaimer</CardTitle>
                <CardDescription>
                  Please confirm that this request is valid before creating the expense.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 text-sm text-foreground">
                  <input
                    className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                    type="checkbox"
                    checked={form.disclaimer_accepted}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        disclaimer_accepted: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    I confirm this expense is valid and I accept the disclaimer requirement.
                  </span>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigateTo(`/dogs/${dog.id}`)}
                  >
                    Back to Dog
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Raising expense...' : 'Raise Expense'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      ) : null}
    </section>
  )
}
