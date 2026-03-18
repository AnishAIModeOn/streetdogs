import { useEffect, useMemo, useState } from 'react'
import { Boxes, HeartHandshake, PackageCheck, PackagePlus } from 'lucide-react'
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

        if (!filterAreaId) {
          throw new Error('Your profile does not have a primary area yet.')
        }

        const nextRequests = await listInventoryRequestsForArea(filterAreaId)
        if (isMounted) {
          setRequests(nextRequests)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load inventory requests.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadRequests()
    return () => { isMounted = false }
  }, [profile?.primary_area_id, user?.id])

  const reloadRequests = async () => {
    const nextRequests = await listInventoryRequestsForArea(profile.primary_area_id)
    setRequests(nextRequests)
  }

  const getCurrentUserCommitment = (item) => {
    const matches = (item.inventory_commitments ?? []).filter(
      (commitment) => commitment.committed_by_user_id === user?.id,
    )
    if (matches.length === 0) return null
    const totalQuantity = matches.reduce((sum, c) => sum + Number(c.quantity ?? 0), 0)
    const latestCommitment = [...matches].sort(
      (l, r) => new Date(r.created_at) - new Date(l.created_at),
    )[0]
    return { quantity: totalQuantity, created_at: latestCommitment.created_at, status: latestCommitment.status }
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
      setSuccessMessage('Commitment recorded. Thank you for helping out!')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your commitment.')
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
      {/* Page header */}
      <div className="grid gap-4 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Community supplies
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Supply needs for your area
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              Browse open requests, see what&apos;s still needed, and commit to help — no admin
              access required.
            </p>
          </div>
          {canCreateInventory ? (
            <Button onClick={() => navigateTo('/inventory/new')}>
              <PackagePlus className="h-4 w-4" />
              New supply request
            </Button>
          ) : null}
        </div>

        {/* Snapshot */}
        <Card className="rounded-[1.75rem] border-white/65 bg-white/92">
          <CardHeader className="pb-3">
            <CardTitle>Area snapshot</CardTitle>
            <CardDescription>A quick view of what your area still needs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: 'Open requests', value: stats.requests, icon: Boxes, color: 'bg-primary/10 text-primary' },
              { label: 'Items listed', value: stats.items, icon: PackageCheck, color: 'bg-amber-50 text-amber-600' },
              { label: 'Qty still needed', value: stats.remaining, icon: HeartHandshake, color: 'bg-rose-50 text-rose-500' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-[1.3rem] bg-secondary/30 px-4 py-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-extrabold tracking-tight text-foreground">{item.value}</p>
                  </div>
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
            <div key={index} className="h-48 animate-pulse rounded-[2rem] border border-border/50 bg-white/65" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <PackageCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">All supplied!</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              No open supply requests for your area right now.
            </p>
            {canCreateInventory ? (
              <Button onClick={() => navigateTo('/inventory/new')}>Create first request</Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden rounded-[2rem] border-white/65 bg-white/95 shadow-soft">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <CardDescription>
                      Requested by{' '}
                      {request.created_by_profile?.full_name || 'a community member'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={request.status === 'closed' ? 'outline' : 'success'}
                    className="self-start"
                  >
                    {formatLabel(request.status)}
                  </Badge>
                </div>
                {request.description ? (
                  <p className="text-sm leading-6 text-muted-foreground">{request.description}</p>
                ) : null}
                <p className="text-[0.68rem] text-muted-foreground/70">
                  {new Date(request.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </CardHeader>

              <CardContent className="grid gap-4">
                {request.inventory_request_items?.map((item) => {
                  const userCommitment = getCurrentUserCommitment(item)

                  return (
                    <div
                      key={item.id}
                      className="rounded-[1.5rem] border border-border/55 bg-secondary/20 p-5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-bold text-foreground">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatLabel(item.category)} · {item.quantity_required} {item.unit} needed
                          </p>
                        </div>
                        <Badge variant={Number(item.quantity_remaining) > 0 ? 'warning' : 'success'}>
                          {Number(item.quantity_remaining) > 0 ? 'Open' : 'Fully committed'}
                        </Badge>
                      </div>

                      {/* Progress tiles */}
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <MetricTile label="Required" value={`${item.quantity_required} ${item.unit}`} />
                        <MetricTile label="Committed" value={`${item.quantity_committed} ${item.unit}`} />
                        <MetricTile label="Still needed" value={`${item.quantity_remaining} ${item.unit}`} highlight={Number(item.quantity_remaining) > 0} />
                      </div>

                      {/* User's commitment */}
                      {userCommitment ? (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">Your commitment</p>
                            <Badge variant={getStatusBadge(userCommitment.status)}>
                              {formatCommitmentStatus(userCommitment.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {userCommitment.quantity} {item.unit} · {new Date(userCommitment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ) : null}

                      {Number(item.quantity_remaining) > 0 ? (
                        <div className="mt-4">
                          <Button
                            variant="secondary"
                            onClick={() => openCommitmentForm(item.id)}
                          >
                            <HeartHandshake className="h-4 w-4" />
                            I&apos;ll contribute this
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">
                          This item has been fully committed. Thank you, community!
                        </p>
                      )}

                      <Dialog
                        open={activeItemId === item.id}
                        onOpenChange={(open) => !open && closeCommitmentForm()}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm your commitment</DialogTitle>
                            <DialogDescription>
                              How much {item.item_name} can you bring for this request?
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
                              <FormLabel>Quantity</FormLabel>
                              <Input
                                required
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder={`Quantity (max ${item.quantity_remaining} ${item.unit})`}
                                value={commitmentForm.quantity}
                                onChange={(event) =>
                                  setCommitmentForm((current) => ({ ...current, quantity: event.target.value }))
                                }
                              />
                            </FormField>
                            <FormField>
                              <FormLabel>Notes (optional)</FormLabel>
                              <Textarea
                                placeholder="Any details for the area coordinator…"
                                value={commitmentForm.notes}
                                onChange={(event) =>
                                  setCommitmentForm((current) => ({ ...current, notes: event.target.value }))
                                }
                              />
                            </FormField>
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                              <Button type="button" variant="outline" onClick={closeCommitmentForm}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving…' : 'Confirm commitment'}
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

function MetricTile({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${highlight ? 'bg-amber-50 border border-amber-100' : 'bg-white/80'}`}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-bold ${highlight ? 'text-amber-700' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}
