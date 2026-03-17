import { useEffect, useState } from 'react'
import {
  listInventoryRequestsForReporting,
  updateInventoryRequestStatus,
} from '../lib/communityData'

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

  if (!canManageInventory) {
    return (
      <section className="section stack">
        <div className="panel empty-state">
          <h3>Unauthorized</h3>
          <p>Only inventory admins and superadmins can access inventory reporting.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Inventory Admin</p>
        <h2>Inventory reporting dashboard</h2>
        <p className="helper-copy">
          Review requests, item balances, and contributor activity across visible areas.
        </p>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-banner">{successMessage}</p> : null}

      {isLoading ? (
        <div className="panel empty-state">
          <h3>Loading inventory reporting</h3>
          <p>Gathering requests, items, and commitments.</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="panel empty-state">
          <h3>No inventory requests found</h3>
          <p>There are no visible inventory requests for this reporting view yet.</p>
        </div>
      ) : (
        <div className="stack">
          {requests.map((request) => {
            const canUpdateStatus =
              isSuperadmin || request.created_by_profile?.id === user?.id

            return (
              <article key={request.id} className="panel stack">
                <div className="card-top">
                  <div>
                    <h3>{request.title}</h3>
                    <p>{request.description || 'No description added.'}</p>
                  </div>
                  <span className="tag">{formatLabel(request.status)}</span>
                </div>

                <div className="detail-grid compact-grid">
                  <p>
                    <strong>Area:</strong>{' '}
                    {request.area ? `${request.area.city} - ${request.area.name}` : 'Area unavailable'}
                  </p>
                  <p>
                    <strong>Created by:</strong>{' '}
                    {request.created_by_profile?.full_name || 'Name not available'}
                  </p>
                  <p><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</p>
                  <p><strong>Status:</strong> {formatLabel(request.status)}</p>
                </div>

                {canUpdateStatus ? (
                  <div className="hero-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={isSavingRequestId === request.id}
                      onClick={() => handleStatusChange(request)}
                    >
                      {isSavingRequestId === request.id
                        ? 'Saving...'
                        : request.status === 'closed'
                          ? 'Reopen request'
                          : 'Mark request as closed'}
                    </button>
                  </div>
                ) : null}

                <div className="stack">
                  {request.inventory_request_items?.map((item) => (
                    <div key={item.id} className="sub-card stack">
                      <div className="card-top">
                        <div>
                          <h4>{item.item_name}</h4>
                          <p>{formatLabel(item.category)}</p>
                        </div>
                        <span className="tag">
                          {item.quantity_remaining} {item.unit} remaining
                        </span>
                      </div>

                      <div className="detail-grid compact-grid">
                        <p><strong>Required:</strong> {item.quantity_required} {item.unit}</p>
                        <p><strong>Committed:</strong> {item.quantity_committed} {item.unit}</p>
                        <p><strong>Remaining:</strong> {item.quantity_remaining} {item.unit}</p>
                        <p><strong>Unit:</strong> {item.unit}</p>
                      </div>

                      <div className="stack">
                        <p className="panel-title">Commitments</p>
                        {item.inventory_commitments?.length ? (
                          item.inventory_commitments.map((commitment) => (
                            <div key={commitment.id} className="sub-card inventory-commitment-card">
                              <p>
                                <strong>Committed by:</strong>{' '}
                                {commitment.committed_by_profile?.full_name || 'Name not available'}
                              </p>
                              <p><strong>Quantity:</strong> {commitment.quantity} {item.unit}</p>
                              <p><strong>Status:</strong> {formatCommitmentStatus(commitment.status)}</p>
                              <p><strong>Notes:</strong> {commitment.notes || 'No notes added.'}</p>
                              <p>
                                <strong>Committed at:</strong>{' '}
                                {new Date(commitment.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="helper-copy">No commitments recorded for this item yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
