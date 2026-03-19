import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Clock3,
  HeartHandshake,
  MapPin,
  PawPrint,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  Wallet,
} from 'lucide-react'
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

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePrimaryContribution = () => {
    const openExpense = expenses.find((expense) => {
      const isClosed = expense.status === 'funded' || expense.status === 'closed'
      const canContribute =
        user?.id !== expense.raised_by_user_id && Number(expense.amount_pending) > 0
      return !isClosed && canContribute
    })

    if (openExpense) {
      openPaymentModal(openExpense.id)
      return
    }

    scrollToSection('dog-contributions')
  }

  const dogName = dog?.dog_name_or_temp_name || 'Community dog'
  const areaLabel = area ? `${area.city} · ${area.name}` : 'Area unavailable'
  const careSummary = dog?.ai_summary || dog?.location_description || dog?.health_notes || ''
  const friendlySummary = careSummary
    ? careSummary
    : 'Neighbors and volunteers are keeping an eye on this dog and sharing updates here.'
  const healthTone =
    dog?.health_notes && dog.health_notes.trim()
      ? 'Community notes mention care details that volunteers may want to review.'
      : 'No urgent health notes are visible right now.'

  const fundingTotals = useMemo(
    () =>
      expenses.reduce(
        (totals, expense) => ({
          total: totals.total + Number(expense.total_amount ?? 0),
          contributed: totals.contributed + Number(expense.amount_contributed ?? 0),
          pending: totals.pending + Number(expense.amount_pending ?? 0),
        }),
        { total: 0, contributed: 0, pending: 0 },
      ),
    [expenses],
  )

  const recentActivity = useMemo(() => {
    const sightingItems = sightings.map((sighting) => ({
      id: `sighting-${sighting.id}`,
      icon: MapPin,
      tone: 'bg-secondary/20 text-secondary',
      label: 'Community sighting',
      title: sighting.location_description || 'New location update shared',
      copy: sighting.notes || 'A nearby volunteer logged a fresh observation for this dog.',
      date: sighting.sighted_at,
    }))

    const expenseItems = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      icon: Wallet,
      tone: 'bg-primary/12 text-primary',
      label: 'Support appeal',
      title: `${formatLabel(expense.expense_type)} support request`,
      copy: expense.description || 'A community member raised support for this dog.',
      date: expense.created_at,
    }))

    return [...sightingItems, ...expenseItems]
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 5)
  }, [expenses, sightings])

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="grid gap-4">
          <div className="h-72 animate-pulse rounded-[2rem] border border-border/70 bg-white/70" />
          <div className="h-44 animate-pulse rounded-[2rem] border border-border/70 bg-white/70" />
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
    <section className="space-y-6 lg:space-y-7">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/90 shadow-float">
          <div className="relative aspect-[4/4.2] overflow-hidden bg-secondary/30 sm:aspect-[5/4] lg:aspect-[16/11]">
            {dog.photo_url ? (
              <img
                src={dog.photo_url}
                alt={dogName}
                className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,rgba(248,233,211,0.98),rgba(233,244,236,0.96))] text-primary/70">
                <PawPrint className="h-16 w-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,25,22,0.06),rgba(20,16,12,0.22)_42%,rgba(18,13,10,0.72)_100%)]" />
            <div className="absolute inset-x-4 bottom-4 rounded-[1.65rem] border border-white/20 bg-black/25 p-5 backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-white/25 bg-white/14 text-white" variant="outline">
                  {formatLabel(dog.status)}
                </Badge>
                <Badge className="border-white/25 bg-white/14 text-white" variant="outline">
                  {formatLabel(dog.visibility_type)}
                </Badge>
                {dog.vaccination_status === 'vaccinated' ? (
                  <Badge className="bg-emerald-100/95 text-emerald-800">Vaccinated</Badge>
                ) : null}
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {dogName}
                </p>
                <p className="flex items-center gap-2 text-sm font-medium text-white/86">
                  <MapPin className="h-4 w-4" />
                  {areaLabel}
                </p>
                <p className="max-w-2xl text-sm leading-7 text-white/84 sm:text-[0.95rem]">
                  {friendlySummary}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-[linear-gradient(150deg,rgba(255,255,255,0.97),rgba(249,242,229,0.96)_52%,rgba(236,246,239,0.96))] shadow-soft">
            <CardHeader className="space-y-4">
              <div className="space-y-2">
                <Badge className="w-fit" variant="secondary">
                  Community profile
                </Badge>
                <CardTitle className="text-[1.9rem] leading-tight sm:text-[2.2rem]">
                  A clearer care snapshot for this dog
                </CardTitle>
                <CardDescription className="text-sm leading-7">
                  Scan the current condition, see where support is already happening, and take the
                  next helpful step quickly.
                </CardDescription>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <HeroStat
                  icon={ShieldCheck}
                  label="Condition"
                  value={formatLabel(dog.status)}
                  tone="bg-primary/12 text-primary"
                />
                <HeroStat
                  icon={Wallet}
                  label="Open support"
                  value={
                    expenses.length
                      ? `${expenses.length} appeal${expenses.length > 1 ? 's' : ''}`
                      : 'No appeals yet'
                  }
                  tone="bg-secondary/18 text-secondary"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] bg-white/78 p-4 shadow-soft">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Quick read
                </p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  {dog.location_description || 'Location notes are still being added by volunteers.'}
                </p>
              </div>
              <div className="grid gap-3">
                <Button
                  size="lg"
                  className="w-full justify-between shadow-soft"
                  onClick={handlePrimaryContribution}
                >
                  Contribute
                  <HeartHandshake className="h-4 w-4" />
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  {isAuthenticated ? (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full justify-between"
                      onClick={() => navigateTo(`/dogs/${dog.id}/raise-expense`)}
                    >
                      Volunteer
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => scrollToSection('dog-activity')}
                  >
                    Follow updates
                    <Clock3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,240,228,0.96))] shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Funding snapshot</CardTitle>
              <CardDescription>
                How the community is already showing up for this dog.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <FundingTile
                label="Needed"
                value={`Rs. ${formatMoney(fundingTotals.total)}`}
                tone="bg-accent/95 text-foreground"
              />
              <FundingTile
                label="Contributed"
                value={`Rs. ${formatMoney(fundingTotals.contributed)}`}
                tone="bg-secondary/16 text-foreground"
              />
              <FundingTile
                label="Pending"
                value={`Rs. ${formatMoney(fundingTotals.pending)}`}
                tone="bg-primary/10 text-primary"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/95 shadow-soft" id="dog-summary">
          <CardHeader className="pb-3">
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              A friendly overview that helps volunteers understand this dog quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Dog name" value={dogName} />
              <InfoTile label="Area" value={areaLabel} />
              <InfoTile label="Approx age" value={dog.approx_age || 'Not added'} />
              <InfoTile label="Gender" value={formatLabel(dog.gender)} />
              <InfoTile label="Temperament" value={dog.temperament || 'Still being observed'} />
              <InfoTile label="Visibility" value={formatLabel(dog.visibility_type)} />
            </div>
            <div className="rounded-[1.65rem] bg-secondary/16 p-5">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Community summary
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">{friendlySummary}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="rounded-[2rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,244,0.95))] shadow-soft"
          id="dog-condition"
        >
          <CardHeader className="pb-3">
            <CardTitle>Condition and health details</CardTitle>
            <CardDescription>
              Simple, scannable care details for the next volunteer.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard icon={ShieldCheck} label="Status" value={formatLabel(dog.status)} />
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
              <MetricCard
                icon={ReceiptText}
                label="Support records"
                value={
                  expenses.length
                    ? `${expenses.length} active record${expenses.length > 1 ? 's' : ''}`
                    : 'No expense records'
                }
              />
            </div>
            <div className="rounded-[1.65rem] bg-white/78 p-5 shadow-soft">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Health notes
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground">
                {dog.health_notes || 'No health notes have been added yet.'}
              </p>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">{healthTone}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/95 shadow-soft" id="dog-activity">
          <CardHeader className="pb-3">
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Latest sightings and support moments gathered into one feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentActivity.length ? (
              recentActivity.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-[1.5rem] border border-white/65 bg-secondary/12 p-4"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {item.label}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState
                icon={Activity}
                message="Fresh sightings or support updates will appear here as the community adds them."
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,240,228,0.95))] shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle>Notes and observations</CardTitle>
            <CardDescription>
              Context that helps the next visit feel more informed and human.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ObservationTile
              icon={MapPin}
              label="Location details"
              value={dog.location_description || 'Exact location details are still being added.'}
            />
            <ObservationTile
              icon={Stethoscope}
              label="Care observations"
              value={dog.health_notes || 'No observations have been written yet.'}
            />
            <ObservationTile
              icon={PawPrint}
              label="Temperament"
              value={dog.temperament || 'Temperament notes are still being observed.'}
            />
          </CardContent>
        </Card>
      </div>

      <div id="dog-contributions" className="space-y-4">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-primary/90">
            Contributions and funding
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[2rem]">
            Support this dog with clear, trustworthy next steps
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Open appeals, community contributions, and receipts stay together here so the page feels
            more actionable and easier to trust on mobile.
          </p>
        </div>

        <div className="grid gap-4">
          {expenses.length === 0 ? (
            <Card className="rounded-[2rem] border-dashed border-border bg-white/92">
              <CardContent className="space-y-3 p-10 text-center">
                <h3 className="text-xl font-semibold text-foreground">No support appeals yet</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  This dog does not have an active expense record right now.
                </p>
                {isAuthenticated ? (
                  <div>
                    <Button onClick={() => navigateTo(`/dogs/${dog.id}/raise-expense`)}>
                      Start a support appeal
                    </Button>
                  </div>
                ) : null}
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
                <Card
                  key={expense.id}
                  className="overflow-hidden rounded-[2rem] border-white/70 bg-white/95 shadow-soft"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getExpenseBadgeVariant(expense.status)}>
                            {formatExpenseStatus(expense.status)}
                          </Badge>
                          <Badge variant="outline">{formatLabel(expense.expense_type)}</Badge>
                        </div>
                        <CardTitle className="text-2xl">
                          {formatLabel(expense.expense_type)} support appeal
                        </CardTitle>
                        <CardDescription>
                          Raised by {getExpenseRaiserName(expense)}
                        </CardDescription>
                      </div>
                      {!contributionsClosed ? (
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => openPaymentModal(expense.id)}
                        >
                          Contribute now
                        </Button>
                      ) : null}
                    </div>
                    <div className="rounded-[1.55rem] bg-secondary/14 p-4">
                      <p className="text-sm leading-7 text-foreground">
                        {expense.description || 'No description added.'}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <FundingTile
                        label="Total amount"
                        value={`Rs. ${formatMoney(expense.total_amount)}`}
                        tone="bg-accent/95 text-foreground"
                      />
                      <FundingTile
                        label="Contributed"
                        value={`Rs. ${formatMoney(expense.amount_contributed)}`}
                        tone="bg-secondary/16 text-foreground"
                      />
                      <FundingTile
                        label="Pending"
                        value={`Rs. ${formatMoney(expense.amount_pending)}`}
                        tone="bg-primary/10 text-primary"
                      />
                      <FundingTile
                        label="Created"
                        value={new Date(expense.created_at).toLocaleDateString()}
                        tone="bg-white text-foreground"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoTile label="Raised by" value={getExpenseRaiserName(expense)} />
                          <InfoTile
                            label="UPI ID"
                            value={expense.raised_by_profile?.upi_id || 'Not shared yet'}
                          />
                        </div>

                        {currentUserContribution ? (
                          <div className="rounded-[1.55rem] bg-secondary/16 p-4">
                            <p className="text-sm font-semibold text-foreground">
                              Your contribution
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              Amount contributed: Rs. {formatMoney(currentUserContribution.amount)}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              Contribution date:{' '}
                              {new Date(currentUserContribution.contributed_at).toLocaleString()}
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              Payment status:{' '}
                              {formatContributionStatus(currentUserContribution.payment_status)}
                            </p>
                          </div>
                        ) : null}

                        {topSupporters.length ? (
                          <div className="rounded-[1.55rem] bg-[linear-gradient(145deg,rgba(255,250,242,0.98),rgba(240,247,242,0.96))] p-4 shadow-soft">
                            <p className="text-sm font-semibold text-foreground">Top supporters</p>
                            <div className="mt-3 grid gap-2">
                              {topSupporters.map((entry, index) => (
                                <p
                                  key={entry.contributor_user_id}
                                  className="text-sm leading-6 text-muted-foreground"
                                >
                                  <span className="font-semibold text-foreground">
                                    {index + 1}. {entry.full_name}
                                  </span>{' '}
                                  - Rs. {formatMoney(entry.amount)}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        {receipt ? (
                          <div className="rounded-[1.55rem] border border-white/70 bg-white/88 p-4 shadow-soft">
                            <p className="text-sm font-semibold text-foreground">Receipt or proof</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              Review the uploaded proof before making payment.
                            </p>
                            <a
                              href={receipt.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
                            >
                              View receipt
                            </a>
                          </div>
                        ) : null}

                        <div className="rounded-[1.55rem] bg-orange-50/90 p-4 text-sm leading-6 text-amber-900">
                          Please review any receipt and verify the request before paying.
                          Contributions are voluntary and go directly to the person who raised the
                          appeal.
                        </div>

                        {isAuthenticated ? (
                          <div className="rounded-[1.65rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,251,244,0.97),rgba(239,246,241,0.95))] p-5 shadow-soft">
                            {contributionsClosed ? (
                              <div className="text-sm leading-6 text-muted-foreground">
                                {user?.id === expense.raised_by_user_id
                                  ? 'You raised this expense, so contribution actions are hidden.'
                                  : 'This expense is no longer accepting contributions.'}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-primary/85">
                                    Quick actions
                                  </p>
                                  <p className="mt-1 text-lg font-semibold text-foreground">
                                    Contribute in a couple of taps
                                  </p>
                                </div>
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
                                        ? 'Rs. 50 Feed support'
                                        : amount === 100
                                          ? 'Rs. 100 Daily care'
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
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <Dialog
                      open={activePaymentExpenseId === expense.id}
                      onOpenChange={(open) => !open && hidePaymentModal()}
                    >
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Support this appeal</DialogTitle>
                          <DialogDescription>
                            Pay directly to {getExpenseRaiserName(expense)} and then record your
                            contribution.
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
                              You can also pay manually to the UPI ID shown above if you prefer not
                              to scan the QR code.
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={hidePaymentModal}
                                >
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
      </div>
    </section>
  )
}

function HeroStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-[1.35rem] bg-white/72 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

function FundingTile({ label, value, tone = 'bg-secondary/20 text-foreground' }) {
  return (
    <div className={`rounded-[1.4rem] p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-75">{label}</p>
      <p className="mt-2 text-lg font-extrabold leading-tight">{value}</p>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card className="rounded-[1.5rem] border-white/70 bg-white/90 shadow-soft">
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

function ObservationTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-secondary/16 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85 text-primary shadow-soft">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[1.35rem] bg-secondary/18 p-4">
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
