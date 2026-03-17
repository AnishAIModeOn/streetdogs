import { useEffect, useState } from 'react'
import {
  getProfile,
  listInventoryRequestsForArea,
  recordInventoryCommitment,
} from '../lib/communityData'
import { navigateTo } from '../lib/navigation'

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

  return (
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Inventory</p>
        <h2>Requests for your area</h2>
        <p className="helper-copy">Create and review supply requests for your primary area.</p>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-banner">{successMessage}</p> : null}

      {canCreateInventory ? (
        <div className="hero-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigateTo('/inventory/new')}
          >
            New inventory request
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="panel empty-state">
          <h3>Loading inventory requests</h3>
          <p>Checking requests for your area.</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="panel empty-state">
          <h3>No requests yet</h3>
          <p>Create the first inventory request for your area.</p>
        </div>
      ) : (
        <div className="stack">
          {requests.map((request) => (
            <article key={request.id} className="panel">
              <div className="card-top">
                <div>
                  <h3>{request.title}</h3>
                  <p>
                    Created by {request.created_by_profile?.full_name || 'Name not available'}
                  </p>
                </div>
                <span className="tag">{formatLabel(request.status)}</span>
              </div>
              <p>{request.description || 'No description added.'}</p>
              <p className="helper-copy">
                Created {new Date(request.created_at).toLocaleString()}
              </p>
              <div className="stack">
                {request.inventory_request_items?.map((item) => (
                  <div key={item.id} className="sub-card stack">
                    <div className="card-top">
                      <div>
                        <p><strong>{item.item_name}</strong></p>
                        <p>{formatLabel(item.category)} - {item.quantity_required} {item.unit}</p>
                      </div>
                      <span className="tag">
                        {Number(item.quantity_remaining) > 0 ? 'Open' : 'Fully committed'}
                      </span>
                    </div>
                    <div className="detail-grid compact-grid">
                      <p><strong>Required:</strong> {item.quantity_required} {item.unit}</p>
                      <p><strong>Committed:</strong> {item.quantity_committed} {item.unit}</p>
                      <p><strong>Remaining:</strong> {item.quantity_remaining} {item.unit}</p>
                    </div>

                    {getCurrentUserCommitment(item) ? (
                      <div className="sub-card contribution-summary">
                        <h5>Your Commitment</h5>
                        <p>
                          <strong>Quantity committed:</strong> {getCurrentUserCommitment(item).quantity} {item.unit}
                        </p>
                        <p>
                          <strong>Commitment date:</strong>{' '}
                          {new Date(getCurrentUserCommitment(item).created_at).toLocaleString()}
                        </p>
                        <p>
                          <strong>Status:</strong> {formatCommitmentStatus(getCurrentUserCommitment(item).status)}
                        </p>
                      </div>
                    ) : null}

                    {Number(item.quantity_remaining) > 0 ? (
                      <div className="stack">
                        <div className="hero-actions">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => openCommitmentForm(item.id)}
                          >
                            I&apos;ll get this
                          </button>
                        </div>

                        {activeItemId === item.id ? (
                          <form
                            className="stack contribution-form"
                            onSubmit={(event) => {
                              event.preventDefault()
                              handleCommitmentSubmit(item)
                            }}
                          >
                            <input
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
                            <textarea
                              placeholder="Notes (optional)"
                              value={commitmentForm.notes}
                              onChange={(event) =>
                                setCommitmentForm((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                            />
                            <div className="hero-actions">
                              <button
                                type="submit"
                                className="button button-primary"
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? 'Saving...' : 'Confirm Commitment'}
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={closeCommitmentForm}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    ) : (
                      <p className="helper-copy">This item has already been fully committed.</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
