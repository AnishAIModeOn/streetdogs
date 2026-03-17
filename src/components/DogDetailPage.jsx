import { useEffect, useState } from 'react'
import { MapPin, PawPrint, ReceiptText, ShieldCheck, Stethoscope } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  getDog,
  listAreas,
  listDogSightingsForDog,
  listExpensesForDog,
  recordContribution,
} from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Textarea } from './ui/textarea'

const quickContributionOptions = [50, 100, 200]

function formatLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'Not added'
}

export function DogDetailPage({ dogId, isAuthenticated, user }) {
  const [dog, setDog] = useState(null)
  const [area, setArea] = useState(null)
  const [sightings, setSightings] = useState([])
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activePaymentExpenseId, setActivePaymentExpenseId] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    notes: '',
  })
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setErrorMessage('')
        const [nextDog, nextAreas, nextSightings, nextExpenses] = await Promise.all([
          getDog(dogId),
          listAreas(),
          listDogSightingsForDog(dogId),
          listExpensesForDog(dogId),
        ])

        if (!isMounted) {
          return
        }

        setDog(nextDog)
        setSightings(nextSightings)
        setExpenses(nextExpenses)
        setArea(nextAreas.find((entry) => entry.id === nextDog?.area_id) ?? null)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load dog details.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [dogId])

  const reloadExpenses = async () => {
    const nextExpenses = await listExpensesForDog(dogId)
    setExpenses(nextExpenses)
  }

  const formatMoney = (value) => Number(value ?? 0).toLocaleString()
  const getPrimaryReceipt = (expense) => expense.expense_receipts?.[0] ?? null
  const getContributorLeaderboard = (expense) => {
    const totals = new Map()

    for (const contribution of expense.contributions ?? []) {
      const existing = totals.get(contribution.contributor_user_id) || {
        contributor_user_id: contribution.contributor_user_id,
        full_name: contribution.contributor_profile?.full_name || 'Community supporter',
        amount: 0,
      }

      existing.amount += Number(contribution.amount ?? 0)
      totals.set(contribution.contributor_user_id, existing)
    }

    return [...totals.values()].sort((left, right) => right.amount - left.amount)
  }

  const getCurrentUserContribution = (expense) => {
    if (!user?.id) {
      return null
    }

    const matches = (expense.contributions ?? []).filter(
      (contribution) => contribution.contributor_user_id === user.id,
    )

    if (matches.length === 0) {
      return null
    }

    const totalAmount = matches.reduce(
      (sum, contribution) => sum + Number(contribution.amount ?? 0),
      0,
    )
    const latestContribution = [...matches].sort(
      (left, right) => new Date(right.contributed_at) - new Date(left.contributed_at),
    )[0]

    return {
      amount: totalAmount,
      contributed_at: latestContribution.contributed_at,
      payment_status: latestContribution.payment_status,
    }
  }

  const getExpenseRaiserName = (expense) => {
    if (expense.raised_by_profile?.full_name) {
      return expense.raised_by_profile.full_name
    }

    if (user?.id === expense.raised_by_user_id) {
      return 'You'
    }

    return 'Name not available'
  }

  const getUpiPaymentLink = (expense, amount) => {
    const upiId = expense.raised_by_profile?.upi_id?.trim().toLowerCase()
    const recipientName = expense.raised_by_profile?.full_name?.trim()

    if (!upiId || !amount || Number(amount) <= 0) {
      return ''
    }

    const params = [
      `pa=${encodeURIComponent(upiId)}`,
      `am=${encodeURIComponent(String(Number(amount)))}`,
      'cu=INR',
    ]

    if (recipientName) {
      params.push(`pn=${encodeURIComponent(recipientName)}`)
    }

    return `upi://pay?${params.join('&')}`
  }

  const openPaymentModal = (expenseId, amount = '') => {
    setErrorMessage('')
    setSuccessMessage('')
    setActivePaymentExpenseId(expenseId)
    setPaymentForm({
      amount: amount ? String(amount) : '',
      notes: '',
    })
  }

  const hidePaymentModal = () => {
    setActivePaymentExpenseId(null)
    setPaymentForm({ amount: '', notes: '' })
  }

  const validatePaymentAmount = (expense) => {
    const contributionAmount = Number(paymentForm.amount)

    if (!paymentForm.amount || contributionAmount <= 0) {
      setErrorMessage('Please enter a contribution amount greater than 0.')
      return null
    }

    if (contributionAmount > Number(expense.amount_pending)) {
      setErrorMessage('Contribution amount cannot exceed the pending amount.')
      return null
    }

    return contributionAmount
  }

  const handleContributionSubmit = async (expense) => {
    const contributionAmount = validatePaymentAmount(expense)

    if (!contributionAmount) {
      return
    }

    try {
      setIsSubmittingContribution(true)
      setErrorMessage('')
      setSuccessMessage('')

      await recordContribution(expense.id, contributionAmount, paymentForm.notes.trim() || null)
      await reloadExpenses()

      hidePaymentModal()
      setSuccessMessage(
        `Thank you for helping this dog. You contributed Rs. ${formatMoney(contributionAmount)}.`,
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to record your contribution.')
    } finally {
      setIsSubmittingContribution(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="grid gap-4">
          <div className="h-64 animate-pulse rounded-[2rem] border border-border/70 bg-white/70" />
          <div className="h-40 animate-pulse rounded-[2rem] border border-border/70 bg-white/70" />
        </div>
      </section>
    )
  }

  if (!dog) {
    return (
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-2 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">Dog not found</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              This dog may be outside your visibility scope or may not exist anymore.
            </p>
            <div>
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
            Dog Detail
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {dog.dog_name_or_temp_name || 'Unnamed dog'}
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-accent" />
              {area ? `${area.city} - ${area.name}` : 'Area unavailable'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatLabel(dog.visibility_type)}</Badge>
            <Badge variant={dog.vaccination_status === 'vaccinated' ? 'success' : 'outline'}>
              {formatLabel(dog.vaccination_status)}
            </Badge>
            <Badge variant={dog.sterilization_status === 'sterilized' ? 'success' : 'outline'}>
              {formatLabel(dog.sterilization_status)}
            </Badge>
          </div>
          {isAuthenticated ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigateTo(`/dogs/${dog.id}/raise-expense`)}>
                Raise Expense
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90">
          <div className="relative aspect-[4/3] overflow-hidden bg-secondary/40">
            {dog.photo_url ? (
              <img
                src={dog.photo_url}
                alt={dog.dog_name_or_temp_name || 'Dog profile'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-hero-wash text-primary">
                <PawPrint className="h-14 w-14" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 rounded-[1.25rem] border border-white/20 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-lg font-semibold text-white">
                {dog.dog_name_or_temp_name || 'Community dog record'}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {dog.location_description || 'Location details pending'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShieldCheck}
          label="Vaccination"
          value={formatLabel(dog.vaccination_status)}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Sterilization"
          value={formatLabel(dog.sterilization_status)}
        />
        <MetricCard icon={Stethoscope} label="Status" value={formatLabel(dog.status)} />
        <MetricCard
          icon={ReceiptText}
          label="Expenses"
          value={expenses.length ? `${expenses.length} active records` : 'No expenses yet'}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sightings">Sightings</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-[2rem] border-white/70 bg-white/90">
            <CardHeader>
              <CardTitle>Dog overview</CardTitle>
              <CardDescription>One clean summary of the visible dog record.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile label="Approx age" value={dog.approx_age || 'Not added'} />
              <InfoTile label="Gender" value={formatLabel(dog.gender)} />
              <InfoTile label="Temperament" value={dog.temperament || 'Not added'} />
              <InfoTile label="Latitude" value={dog.latitude ?? 'Not added'} />
              <InfoTile label="Longitude" value={dog.longitude ?? 'Not added'} />
              <InfoTile label="Visibility" value={formatLabel(dog.visibility_type)} />
              <InfoTile label="Status" value={formatLabel(dog.status)} />
              <InfoTile label="Area" value={area ? `${area.city} - ${area.name}` : 'Area unavailable'} />
              <div className="rounded-2xl bg-secondary/30 p-4 md:col-span-2 xl:col-span-4">
                <p className="text-sm font-medium text-muted-foreground">Location description</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {dog.location_description || 'Not added'}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/30 p-4 md:col-span-2 xl:col-span-4">
                <p className="text-sm font-medium text-muted-foreground">Health notes</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {dog.health_notes || 'Not added'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sightings">
          <Card className="rounded-[2rem] border-white/70 bg-white/90">
            <CardHeader>
              <CardTitle>Sightings</CardTitle>
              <CardDescription>Recent observations for this dog.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {sightings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-sm text-muted-foreground">
                  No sightings are visible for this dog yet.
                </div>
              ) : (
                sightings.map((sighting) => (
                  <div key={sighting.id} className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 shadow-soft">
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(sighting.sighted_at).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {sighting.notes || 'No notes added.'}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="grid gap-4">
            {expenses.length === 0 ? (
              <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
                <CardContent className="space-y-2 p-10 text-center">
                  <h3 className="text-xl font-semibold text-foreground">No expenses yet</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    No expenses have been raised for this dog yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              expenses.map((expense) => {
                const currentUserContribution = getCurrentUserContribution(expense)
                const upiLink = getUpiPaymentLink(expense, paymentForm.amount)
                const receipt = getPrimaryReceipt(expense)
                const topSupporters = getContributorLeaderboard(expense).slice(0, 3)
                const contributionsClosed =
                  user?.id === expense.raised_by_user_id ||
                  expense.status === 'funded' ||
                  expense.status === 'closed'

                return (
                  <Card key={expense.id} className="rounded-[2rem] border-white/70 bg-white/90">
                    <CardHeader className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <CardTitle>{formatLabel(expense.expense_type)}</CardTitle>
                          <CardDescription>
                            Raised by {getExpenseRaiserName(expense)}
                          </CardDescription>
                        </div>
                        <Badge variant={getExpenseBadgeVariant(expense.status)}>
                          {formatExpenseStatus(expense.status)}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {expense.description || 'No description added.'}
                      </p>
                    </CardHeader>

                    <CardContent className="grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoTile label="Total Amount" value={`Rs. ${formatMoney(expense.total_amount)}`} />
                        <InfoTile label="Contributed" value={`Rs. ${formatMoney(expense.amount_contributed)}`} />
                        <InfoTile label="Pending" value={`Rs. ${formatMoney(expense.amount_pending)}`} />
                        <InfoTile label="Created" value={new Date(expense.created_at).toLocaleString()} />
                      </div>

                      {currentUserContribution ? (
                        <div className="rounded-2xl bg-secondary/20 p-4">
                          <p className="text-sm font-semibold text-foreground">Your contribution</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Amount contributed: Rs. {formatMoney(currentUserContribution.amount)}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            Contribution date: {new Date(currentUserContribution.contributed_at).toLocaleString()}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            Payment status: {formatContributionStatus(currentUserContribution.payment_status)}
                          </p>
                        </div>
                      ) : null}

                      {isAuthenticated ? (
                        <div className="rounded-[1.5rem] border border-border/70 bg-secondary/20 p-5">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div className="space-y-3">
                              <p className="text-lg font-semibold text-foreground">Support this appeal</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                <InfoTile label="Raised by" value={getExpenseRaiserName(expense)} />
                                <InfoTile label="UPI ID" value={expense.raised_by_profile?.upi_id || 'Not shared yet'} />
                                <InfoTile
                                  label="Receipt / Proof"
                                  value={receipt ? 'View receipt below' : 'Not added'}
                                />
                                <InfoTile label="Description" value={expense.description || 'Not added'} />
                              </div>
                              {receipt ? (
                                <a
                                  href={receipt.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                  View receipt
                                </a>
                              ) : null}
                              <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-amber-900">
                                Please review the receipt and verify the authenticity of the claim
                                before making payment. Contributions are voluntary and payment is made
                                directly to the person who raised the expense.
                              </div>
                            </div>

                            <div className="space-y-3">
                              {contributionsClosed ? (
                                <div className="rounded-2xl bg-white/80 p-4 text-sm leading-6 text-muted-foreground">
                                  {user?.id === expense.raised_by_user_id
                                    ? 'You raised this expense, so contribution actions are hidden.'
                                    : 'This expense is no longer accepting contributions.'}
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    Contribute
                                  </p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {quickContributionOptions.map((amount) => (
                                      <Button
                                        key={amount}
                                        type="button"
                                        variant="secondary"
                                        disabled={amount > Number(expense.amount_pending)}
                                        onClick={() => openPaymentModal(expense.id, amount)}
                                      >
                                        {amount === 50
                                          ? 'Rs. 50 Feed a dog'
                                          : amount === 100
                                            ? 'Rs. 100 Food for a day'
                                            : 'Rs. 200 Medical help'}
                                      </Button>
                                    ))}
                                    <Button
                                      type="button"
                                      onClick={() => openPaymentModal(expense.id)}
                                    >
                                      Custom amount
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {topSupporters.length ? (
                        <div className="rounded-2xl bg-secondary/20 p-4">
                          <p className="text-sm font-semibold text-foreground">Top supporters</p>
                          <div className="mt-3 grid gap-2">
                            {topSupporters.map((entry, index) => (
                              <p key={entry.contributor_user_id} className="text-sm leading-6 text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {index + 1}. {entry.full_name}
                                </span>{' '}
                                - Rs. {formatMoney(entry.amount)}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <Dialog
                        open={activePaymentExpenseId === expense.id}
                        onOpenChange={(open) => !open && hidePaymentModal()}
                      >
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Support this appeal</DialogTitle>
                            <DialogDescription>
                              Pay directly to {getExpenseRaiserName(expense)} and then record your contribution.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="space-y-4">
                              <div className="rounded-2xl bg-secondary/25 p-4">
                                <p className="text-sm font-medium text-muted-foreground">Raised by</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                  {getExpenseRaiserName(expense)}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-secondary/25 p-4">
                                <p className="text-sm font-medium text-muted-foreground">UPI ID</p>
                                <p className="mt-1 break-all text-sm font-semibold text-foreground">
                                  {expense.raised_by_profile?.upi_id || 'Not shared yet'}
                                </p>
                              </div>
                              {upiLink ? (
                                <div className="rounded-[1.5rem] bg-white p-4 shadow-soft">
                                  <div className="flex justify-center">
                                    <QRCodeSVG value={upiLink} size={192} includeMargin />
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="space-y-4">
                              <Input
                                required
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="Contribution amount"
                                value={paymentForm.amount}
                                onChange={(event) =>
                                  setPaymentForm((current) => ({
                                    ...current,
                                    amount: event.target.value,
                                  }))
                                }
                              />
                              <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-amber-900">
                                Scan this QR code in any UPI app, complete the payment, and then
                                return here to record your contribution.
                              </div>
                              <p className="text-sm leading-6 text-muted-foreground">
                                You can also pay manually to the UPI ID shown above if you prefer
                                not to scan the QR code.
                              </p>
                              <Textarea
                                placeholder="Notes (optional)"
                                value={paymentForm.notes}
                                onChange={(event) =>
                                  setPaymentForm((current) => ({
                                    ...current,
                                    notes: event.target.value,
                                  }))
                                }
                              />
                              <div className="rounded-2xl bg-secondary/20 p-4">
                                <p className="text-sm font-semibold text-foreground">
                                  Did you complete the payment?
                                </p>
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                  <Button type="button" variant="outline" onClick={hidePaymentModal}>
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    disabled={isSubmittingContribution}
                                    onClick={() => handleContributionSubmit(expense)}
                                  >
                                    {isSubmittingContribution ? 'Saving...' : 'Yes I Paid'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card className="rounded-[1.5rem] border-white/70 bg-white/90">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/30 p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function formatExpenseStatus(status) {
  switch (status) {
    case 'partially_funded':
      return 'Partially Funded'
    case 'funded':
      return 'Funded'
    case 'closed':
      return 'Closed'
    default:
      return 'Open'
  }
}

function formatContributionStatus(status) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'failed':
      return 'Failed'
    default:
      return 'Pending'
  }
}

function getExpenseBadgeVariant(status) {
  if (status === 'funded') {
    return 'success'
  }

  if (status === 'closed') {
    return 'outline'
  }

  if (status === 'partially_funded') {
    return 'warning'
  }

  return 'danger'
}
