import { useEffect, useMemo, useState } from 'react'
import { Boxes, HeartHandshake, PackageCheck } from 'lucide-react'
import {
  getProfile,
  listInventoryRequestsForArea,
  recordInventoryCommitment,
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
import { FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

function formatLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'Not added'
}

function formatCommitmentStatus(status) {
  switch (status) {
    case 'fulfilled':
      return 'Fulfilled'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Active'
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'fulfilled':
      return 'success'
    case 'cancelled':
      return 'danger'
    default:
      return 'outline'
  }
}

export function InventoryPage({ user, profile }) {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeItemId, setActiveItemId] = useState(null)
  const [commitmentForm, setCommitmentForm] = useState({ quantity: '', notes: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canCreateInventory =
    profile?.role === 'inventory_admin' || profile?.role === 'superadmin'

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadRequests = async () => {
      try {
        setErrorMessage('')
        setSuccessMessage('')
        const currentProfile = await getProfile(user.id)
        const filterAreaId = currentProfile?.primary_area_id || profile?.primary_area_id || null

        console.log('[inventory-debug] auth user id:', user.id)
        console.log('[inventory-debug] profile.primary_area_id:', currentProfile?.primary_area_id)
        console.log('[inventory-debug] inventory query filter value:', filterAreaId)

        if (!filterAreaId) {
          throw new Error('Your profile does not have a primary area yet.')
        }

        const nextRequests = await listInventoryRequestsForArea(filterAreaId)
        console.log('[inventory-debug] inventory query result:', nextRequests)

        if (isMounted) {
          setRequests(nextRequests)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load inventory requests.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      isMounted = false
    }
  }, [profile?.primary_area_id, user?.id])

  const reloadRequests = async () => {
    const nextRequests = await listInventoryRequestsForArea(profile.primary_area_id)
    setRequests(nextRequests)
  }

  const getCurrentUserCommitment = (item) => {
    const matches = (item.inventory_commitments ?? []).filter(
      (commitment) => commitment.committed_by_user_id === user?.id,
    )

    if (matches.length === 0) {
      return null
    }

    const totalQuantity = matches.reduce(
      (sum, commitment) => sum + Number(commitment.quantity ?? 0),
      0,
    )
    const latestCommitment = [...matches].sort(
      (left, right) => new Date(right.created_at) - new Date(left.created_at),
    )[0]

    return {
      quantity: totalQuantity,
      created_at: latestCommitment.created_at,
      status: latestCommitment.status,
    }
  }

  const openCommitmentForm = (itemId) => {
    setErrorMessage('')
    setSuccessMessage('')
    setActiveItemId(itemId)
    setCommitmentForm({ quantity: '', notes: '' })
  }

  const closeCommitmentForm = () => {
    setActiveItemId(null)
    setCommitmentForm({ quantity: '', notes: '' })
  }

  const handleCommitmentSubmit = async (item) => {
    const quantity = Number(commitmentForm.quantity)

    if (!commitmentForm.quantity || quantity <= 0) {
      setErrorMessage('Please enter a quantity greater than 0.')
      return
    }

    if (quantity > Number(item.quantity_remaining)) {
      setErrorMessage('Commitment quantity cannot exceed the remaining quantity.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')
      await recordInventoryCommitment(item.id, quantity, commitmentForm.notes.trim() || null)
      await reloadRequests()
      closeCommitmentForm()
      setSuccessMessage('Commitment recorded successfully.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save your commitment.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = useMemo(() => {
    const items = requests.flatMap((request) => request.inventory_request_items ?? [])

    return {
      requests: requests.length,
      items: items.length,
      remaining: items.reduce((sum, item) => sum + Number(item.quantity_remaining ?? 0), 0),
    }
  }, [requests])

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Inventory
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Requests for your area
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Review supply needs, see what is still open, and record commitments without leaving
              the StreetDog App workflow.
            </p>
          </div>
          {canCreateInventory ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigateTo('/inventory/new')}>New inventory request</Button>
            </div>
          ) : null}
        </div>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Inventory snapshot</CardTitle>
            <CardDescription>
              A quick view of what your area still needs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: 'Open requests', value: stats.requests, icon: Boxes },
              { label: 'Items listed', value: stats.items, icon: PackageCheck },
              { label: 'Qty remaining', value: stats.remaining, icon: HeartHandshake },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-2xl bg-secondary/35 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                    {item.value}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-[2rem] border border-border/70 bg-white/70"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-3 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">No requests yet</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Create the first inventory request for your area.
            </p>
            {canCreateInventory ? (
              <div>
                <Button onClick={() => navigateTo('/inventory/new')}>Create request</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="rounded-[2rem] border-white/70 bg-white/90">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <CardTitle>{request.title}</CardTitle>
                    <CardDescription>
                      Created by {request.created_by_profile?.full_name || 'Name not available'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{formatLabel(request.status)}</Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {request.description || 'No description added.'}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Created {new Date(request.created_at).toLocaleString()}
                </p>
              </CardHeader>

              <CardContent className="grid gap-4">
                {request.inventory_request_items?.map((item) => {
                  const userCommitment = getCurrentUserCommitment(item)

                  return (
                    <div
                      key={item.id}
                      className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-5 shadow-soft"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-foreground">{item.item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatLabel(item.category)} - {item.quantity_required} {item.unit}
                          </p>
                        </div>
                        <Badge
                          variant={Number(item.quantity_remaining) > 0 ? 'warning' : 'success'}
                        >
                          {Number(item.quantity_remaining) > 0 ? 'Open' : 'Fully committed'}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <MetricCard
                          label="Required"
                          value={`${item.quantity_required} ${item.unit}`}
                        />
                        <MetricCard
                          label="Committed"
                          value={`${item.quantity_committed} ${item.unit}`}
                        />
                        <MetricCard
                          label="Remaining"
                          value={`${item.quantity_remaining} ${item.unit}`}
                        />
                      </div>

                      {userCommitment ? (
                        <div className="mt-4 rounded-2xl bg-white/80 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">Your commitment</p>
                            <Badge variant={getStatusBadge(userCommitment.status)}>
                              {formatCommitmentStatus(userCommitment.status)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Quantity committed: {userCommitment.quantity} {item.unit}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            Commitment date: {new Date(userCommitment.created_at).toLocaleString()}
                          </p>
                        </div>
                      ) : null}

                      {Number(item.quantity_remaining) > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button variant="secondary" onClick={() => openCommitmentForm(item.id)}>
                            I&apos;ll get this
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-muted-foreground">
                          This item has already been fully committed.
                        </p>
                      )}

                      <Dialog
                        open={activeItemId === item.id}
                        onOpenChange={(open) => !open && closeCommitmentForm()}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm commitment</DialogTitle>
                            <DialogDescription>
                              Record how much of {item.item_name} you can bring for this request.
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            className="grid gap-4"
                            onSubmit={(event) => {
                              event.preventDefault()
                              handleCommitmentSubmit(item)
                            }}
                          >
                            <FormField>
                              <FormLabel>Quantity to commit</FormLabel>
                              <Input
                                required
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="Quantity to commit"
                                value={commitmentForm.quantity}
                                onChange={(event) =>
                                  setCommitmentForm((current) => ({
                                    ...current,
                                    quantity: event.target.value,
                                  }))
                                }
                              />
                            </FormField>
                            <FormField>
                              <FormLabel>Notes</FormLabel>
                              <Textarea
                                placeholder="Notes (optional)"
                                value={commitmentForm.notes}
                                onChange={(event) =>
                                  setCommitmentForm((current) => ({
                                    ...current,
                                    notes: event.target.value,
                                  }))
                                }
                              />
                            </FormField>
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                              <Button type="button" variant="outline" onClick={closeCommitmentForm}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Confirm Commitment'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
