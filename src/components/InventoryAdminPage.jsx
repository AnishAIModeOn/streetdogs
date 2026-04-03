import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ClipboardList, Lock, MapPin, Package, ReceiptText, Users, XCircle } from 'lucide-react'
import {
  approveExpense,
  listPendingExpenseApprovals,
  listPendingSocietyDogsForReview,
  rejectExpense,
  listInventoryRequestsForReporting,
  reviewPendingSocietyDog,
  updateInventoryRequestStatus,
} from '../lib/communityData'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

function formatLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'Not added'
}

function buildDogDisplayLocation(dog) {
  return (
    dog?.locality_name ||
    dog?.tagged_area_neighbourhood ||
    dog?.society_name ||
    dog?.tagged_society_name ||
    dog?.location_description ||
    'Location unavailable'
  )
}

function formatCommitmentStatus(status) {
  switch (status) {
    case 'fulfilled':
      return 'Fulfilled'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Committed'
  }
}

function getCommitmentVariant(status) {
  switch (status) {
    case 'fulfilled':
      return 'success'
    case 'cancelled':
      return 'danger'
    default:
      return 'outline'
  }
}

export function InventoryAdminPage({ user, profile }) {
  const [requests, setRequests] = useState([])
  const [pendingSocietyDogs, setPendingSocietyDogs] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPendingSocietiesLoading, setIsPendingSocietiesLoading] = useState(true)
  const [isSavingRequestId, setIsSavingRequestId] = useState(null)
  const [isReviewingDogId, setIsReviewingDogId] = useState(null)
  const [isReviewingExpenseId, setIsReviewingExpenseId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const canManageInventory =
    profile?.role === 'inventory_admin' || profile?.role === 'superadmin'
  const isSuperadmin = profile?.role === 'superadmin'
  const scopedAreaId = profile?.neighbourhood_id || null

  useEffect(() => {
    if (!canManageInventory) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadRequests = async () => {
      try {
        setErrorMessage('')
        const [nextRequests, nextPendingSocietyDogs, nextPendingExpenses] = await Promise.all([
          listInventoryRequestsForReporting({
            areaId: scopedAreaId,
            includeAllAreas: isSuperadmin,
          }),
          listPendingSocietyDogsForReview({
            areaId: scopedAreaId,
            includeAllAreas: isSuperadmin,
          }),
          listPendingExpenseApprovals({
            areaId: scopedAreaId,
            includeAllAreas: isSuperadmin,
          }),
        ])
        if (isMounted) {
          setRequests(nextRequests)
          setPendingSocietyDogs(nextPendingSocietyDogs)
          setPendingExpenses(nextPendingExpenses)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load inventory reporting.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsPendingSocietiesLoading(false)
        }
      }
    }

    loadRequests()
    return () => { isMounted = false }
  }, [canManageInventory, isSuperadmin, scopedAreaId])

  const reloadRequests = async () => {
    const [nextRequests, nextPendingSocietyDogs, nextPendingExpenses] = await Promise.all([
      listInventoryRequestsForReporting({
        areaId: scopedAreaId,
        includeAllAreas: isSuperadmin,
      }),
      listPendingSocietyDogsForReview({
        areaId: scopedAreaId,
        includeAllAreas: isSuperadmin,
      }),
      listPendingExpenseApprovals({
        areaId: scopedAreaId,
        includeAllAreas: isSuperadmin,
      }),
    ])
    setRequests(nextRequests)
    setPendingSocietyDogs(nextPendingSocietyDogs)
    setPendingExpenses(nextPendingExpenses)
  }

  const handleStatusChange = async (request) => {
    const nextStatus = request.status === 'closed' ? 'open' : 'closed'
    try {
      setIsSavingRequestId(request.id)
      setErrorMessage('')
      setSuccessMessage('')
      await updateInventoryRequestStatus(request.id, nextStatus)
      await reloadRequests()
      setSuccessMessage(
        nextStatus === 'closed' ? 'Request marked as closed.' : 'Request reopened successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update request status.',
      )
    } finally {
      setIsSavingRequestId(null)
    }
  }

  const stats = useMemo(() => {
    const items = requests.flatMap((request) => request.inventory_request_items ?? [])
    const commitments = items.flatMap((item) => item.inventory_commitments ?? [])
    return {
      requests: requests.length,
      items: items.length,
      commitments: commitments.length,
      pendingSocieties: pendingSocietyDogs.length,
      pendingExpenses: pendingExpenses.length,
    }
  }, [pendingExpenses.length, pendingSocietyDogs.length, requests])

  const handlePendingSocietyReview = async (dog, action) => {
    try {
      setIsReviewingDogId(dog.id)
      setErrorMessage('')
      setSuccessMessage('')
      await reviewPendingSocietyDog({ dogId: dog.id, action })
      await reloadRequests()
      setSuccessMessage(
        action === 'confirm'
          ? 'Pending society confirmed successfully.'
          : 'Pending society rejected successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to review pending society.',
      )
    } finally {
      setIsReviewingDogId(null)
    }
  }

  const handlePendingExpenseReview = async (expense, action) => {
    try {
      setIsReviewingExpenseId(expense.id)
      setErrorMessage('')
      setSuccessMessage('')
      if (action === 'approve') {
        await approveExpense(expense.id, user.id)
      } else {
        await rejectExpense(expense.id)
      }
      await reloadRequests()
      setSuccessMessage(
        action === 'approve'
          ? 'Expense approved and now visible for contributions.'
          : 'Expense rejected successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to review that expense.',
      )
    } finally {
      setIsReviewingExpenseId(null)
    }
  }

  if (!canManageInventory) {
    return (
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-3 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Access restricted</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Only inventory admins and superadmins can access supply reporting.
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* Page header */}
      <div className="grid gap-4 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Supply admin
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Supply &amp; inventory overview
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Review requests, item balances, and commitment activity across the areas visible to
              your account.
            </p>
          </div>
        </div>

        {/* Stats snapshot */}
        <Card className="rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>Reporting snapshot</CardTitle>
            <CardDescription>Quick totals for visible inventory activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
            <SnapTile icon={ClipboardList} label="Open requests" value={stats.requests} color="bg-primary/10 text-primary" />
            <SnapTile icon={Package} label="Items listed" value={stats.items} color="bg-amber-50 text-amber-600" />
            <SnapTile icon={Users} label="Commitments" value={stats.commitments} color="bg-emerald-50 text-emerald-600" />
            <SnapTile icon={BadgeCheck} label="Pending societies" value={stats.pendingSocieties} color="bg-blue-50 text-blue-600" />
            <SnapTile icon={ReceiptText} label="Pending expenses" value={stats.pendingExpenses} color="bg-rose-50 text-rose-600" />
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      {isLoading ? (
        <div className="h-36 animate-pulse rounded-[2rem] border border-border/50 bg-white/65" />
      ) : pendingExpenses.length ? (
        <Card className="rounded-[2rem] border-white/65 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle>Pending expense approvals</CardTitle>
            <CardDescription>
              Approve or reject newly raised expense appeals before they appear on dashboards or accept contributions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {pendingExpenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-[1.5rem] border border-border/55 bg-secondary/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-foreground">
                        {formatLabel(expense.expense_type)} expense
                      </p>
                      <Badge variant="warning">Pending approval</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Raised by {expense.raised_by_profile?.full_name || 'Community member'}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoTile
                        label="Amount"
                        value={`Rs. ${Number(expense.total_amount ?? expense.amount ?? 0).toLocaleString()}`}
                      />
                      <InfoTile
                        label="Scope"
                        value={formatLabel(expense.target_scope)}
                      />
                      <InfoTile
                        label="Area"
                        value={expense.area ? `${expense.area.city} · ${expense.area.name}` : 'Area unavailable'}
                      />
                      <InfoTile
                        label="Created"
                        value={new Date(expense.created_at).toLocaleDateString()}
                      />
                    </div>
                    {expense.target_society_name ? (
                      <InfoTile label="Society" value={expense.target_society_name} />
                    ) : null}
                    <div className="rounded-xl bg-white/70 px-3 py-2.5">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Description</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {expense.description || 'No description added.'}
                      </p>
                    </div>
                    {expense.expense_receipts?.[0]?.file_url ? (
                      <a
                        href={expense.expense_receipts[0].file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        <ReceiptText className="h-4 w-4" />
                        View receipt
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button
                      disabled={isReviewingExpenseId === expense.id}
                      onClick={() => handlePendingExpenseReview(expense, 'approve')}
                    >
                      <BadgeCheck className="h-4 w-4" />
                      {isReviewingExpenseId === expense.id ? 'Saving...' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isReviewingExpenseId === expense.id}
                      onClick={() => handlePendingExpenseReview(expense, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isPendingSocietiesLoading ? (
        <div className="h-36 animate-pulse rounded-[2rem] border border-border/50 bg-white/65" />
      ) : pendingSocietyDogs.length ? (
        <Card className="rounded-[2rem] border-white/65 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle>Pending society confirmation</CardTitle>
            <CardDescription>
              Review guest-submitted society names before they become confirmed societies in this area.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {pendingSocietyDogs.map((dog) => (
              <div
                key={dog.id}
                className="rounded-[1.5rem] border border-border/55 bg-secondary/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-foreground">
                        {dog.tagged_society_name || 'Unnamed pending society'}
                      </p>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {dog.dog_name_or_temp_name || 'Guest dog report'}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <InfoTile
                        label="Location"
                        value={buildDogDisplayLocation(dog)}
                      />
                      <InfoTile
                        label="Pincode"
                        value={dog.tagged_area_pincode || 'Not added'}
                      />
                      <InfoTile
                        label="Submitted"
                        value={new Date(dog.created_at).toLocaleDateString()}
                      />
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2.5">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Location</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{dog.location_description || 'No location description added.'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button
                      disabled={isReviewingDogId === dog.id}
                      onClick={() => handlePendingSocietyReview(dog, 'confirm')}
                    >
                      <BadgeCheck className="h-4 w-4" />
                      {isReviewingDogId === dog.id ? 'Saving...' : 'Confirm society'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isReviewingDogId === dog.id}
                      onClick={() => handlePendingSocietyReview(dog, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-[2rem] border border-border/50 bg-white/65" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-2 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No requests yet</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              There are no visible inventory requests for this reporting view yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const canUpdateStatus = isSuperadmin || request.created_by_profile?.id === user?.id

            return (
              <Card
                key={request.id}
                className="overflow-hidden rounded-[2rem] border-white/65 bg-white/95 shadow-soft"
              >
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <CardDescription>{request.description || 'No description added.'}</CardDescription>
                    </div>
                    <Badge
                      variant={request.status === 'closed' ? 'outline' : 'success'}
                      className="self-start"
                    >
                      {formatLabel(request.status)}
                    </Badge>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <InfoTile
                      label="Area"
                      value={request.area ? `${request.area.city} · ${request.area.name}` : 'Area unavailable'}
                    />
                    <InfoTile
                      label="Created by"
                      value={request.created_by_profile?.full_name || 'Name unavailable'}
                    />
                    <InfoTile label="Created" value={new Date(request.created_at).toLocaleDateString()} />
                    <InfoTile label="Status" value={formatLabel(request.status)} />
                  </div>

                  {canUpdateStatus ? (
                    <div>
                      <Button
                        variant={request.status === 'closed' ? 'outline' : 'secondary'}
                        disabled={isSavingRequestId === request.id}
                        onClick={() => handleStatusChange(request)}
                      >
                        {isSavingRequestId === request.id
                          ? 'Saving…'
                          : request.status === 'closed'
                            ? 'Reopen request'
                            : 'Mark as closed'}
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>

                <CardContent className="grid gap-4">
                  {request.inventory_request_items?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.5rem] border border-border/55 bg-secondary/20 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-0.5">
                          <p className="text-base font-bold text-foreground">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{formatLabel(item.category)}</p>
                        </div>
                        <Badge variant={Number(item.quantity_remaining) > 0 ? 'warning' : 'success'}>
                          {Number(item.quantity_remaining) > 0
                            ? `${item.quantity_remaining} ${item.unit} remaining`
                            : 'Fully committed'}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoTile label="Required" value={`${item.quantity_required} ${item.unit}`} />
                        <InfoTile label="Committed" value={`${item.quantity_committed} ${item.unit}`} />
                        <InfoTile label="Remaining" value={`${item.quantity_remaining} ${item.unit}`} />
                        <InfoTile label="Unit" value={item.unit} />
                      </div>

                      {item.inventory_commitments?.length ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Commitments
                          </p>
                          {item.inventory_commitments.map((commitment) => (
                            <div
                              key={commitment.id}
                              className="flex flex-wrap items-start gap-2 rounded-xl bg-white/80 p-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {commitment.committed_by_profile?.full_name || 'Name unavailable'}
                                  </p>
                                  <Badge variant={getCommitmentVariant(commitment.status)}>
                                    {formatCommitmentStatus(commitment.status)}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {commitment.quantity} {item.unit} · {new Date(commitment.created_at).toLocaleDateString()}
                                </p>
                                {commitment.notes ? (
                                  <p className="mt-0.5 text-xs text-muted-foreground">{commitment.notes}</p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-border bg-white/60 p-3 text-xs text-muted-foreground">
                          No commitments recorded for this item yet.
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SnapTile({ icon: Icon, label, value, color = 'bg-secondary/40 text-foreground' }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.3rem] bg-secondary/30 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-extrabold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}


