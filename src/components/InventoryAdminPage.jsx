import { useEffect, useMemo, useState } from 'react'
import {
  listInventoryRequestsForReporting,
  updateInventoryRequestStatus,
} from '../lib/communityData'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingRequestId, setIsSavingRequestId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const canManageInventory =
    profile?.role === 'inventory_admin' || profile?.role === 'superadmin'
  const isSuperadmin = profile?.role === 'superadmin'

  useEffect(() => {
    if (!canManageInventory) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadRequests = async () => {
      try {
        setErrorMessage('')
        const nextRequests = await listInventoryRequestsForReporting({
          areaId: profile?.primary_area_id,
          includeAllAreas: isSuperadmin,
        })

        if (isMounted) {
          setRequests(nextRequests)
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
        }
      }
    }

    loadRequests()

    return () => {
      isMounted = false
    }
  }, [canManageInventory, isSuperadmin, profile?.primary_area_id])

  const reloadRequests = async () => {
    const nextRequests = await listInventoryRequestsForReporting({
      areaId: profile?.primary_area_id,
      includeAllAreas: isSuperadmin,
    })
    setRequests(nextRequests)
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
    }
  }, [requests])

  if (!canManageInventory) {
    return (
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-2 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">Unauthorized</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Only inventory admins and superadmins can access inventory reporting.
            </p>
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
            Inventory Admin
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Inventory reporting dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Review requests, item balances, and commitment activity across the areas visible to
              your account.
            </p>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Reporting snapshot</CardTitle>
            <CardDescription>Quick totals for visible inventory activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatTile label="Requests" value={stats.requests} />
            <StatTile label="Items" value={stats.items} />
            <StatTile label="Commitments" value={stats.commitments} />
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
          <CardContent className="space-y-2 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">No inventory requests found</h3>
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
              <Card key={request.id} className="rounded-[2rem] border-white/70 bg-white/90">
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <CardTitle>{request.title}</CardTitle>
                      <CardDescription>{request.description || 'No description added.'}</CardDescription>
                    </div>
                    <Badge variant="outline">{formatLabel(request.status)}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoTile
                      label="Area"
                      value={
                        request.area ? `${request.area.city} - ${request.area.name}` : 'Area unavailable'
                      }
                    />
                    <InfoTile
                      label="Created by"
                      value={request.created_by_profile?.full_name || 'Name not available'}
                    />
                    <InfoTile label="Created" value={new Date(request.created_at).toLocaleString()} />
                    <InfoTile label="Status" value={formatLabel(request.status)} />
                  </div>

                  {canUpdateStatus ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        disabled={isSavingRequestId === request.id}
                        onClick={() => handleStatusChange(request)}
                      >
                        {isSavingRequestId === request.id
                          ? 'Saving...'
                          : request.status === 'closed'
                            ? 'Reopen request'
                            : 'Mark request as closed'}
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>

                <CardContent className="grid gap-4">
                  {request.inventory_request_items?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-5 shadow-soft"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-foreground">{item.item_name}</p>
                          <p className="text-sm text-muted-foreground">{formatLabel(item.category)}</p>
                        </div>
                        <Badge variant="warning">
                          {item.quantity_remaining} {item.unit} remaining
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoTile label="Required" value={`${item.quantity_required} ${item.unit}`} />
                        <InfoTile label="Committed" value={`${item.quantity_committed} ${item.unit}`} />
                        <InfoTile label="Remaining" value={`${item.quantity_remaining} ${item.unit}`} />
                        <InfoTile label="Unit" value={item.unit} />
                      </div>

                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Commitments
                        </p>
                        {item.inventory_commitments?.length ? (
                          item.inventory_commitments.map((commitment) => (
                            <div key={commitment.id} className="rounded-2xl bg-white/80 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {commitment.committed_by_profile?.full_name || 'Name not available'}
                                </p>
                                <Badge variant={getCommitmentVariant(commitment.status)}>
                                  {formatCommitmentStatus(commitment.status)}
                                </Badge>
                              </div>
                              <div className="mt-2 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2">
                                <p>
                                  Quantity: {commitment.quantity} {item.unit}
                                </p>
                                <p>Committed at: {new Date(commitment.created_at).toLocaleString()}</p>
                                <p className="md:col-span-2">
                                  Notes: {commitment.notes || 'No notes added.'}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted-foreground">
                            No commitments recorded for this item yet.
                          </div>
                        )}
                      </div>
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

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-secondary/35 p-4 shadow-soft">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
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
