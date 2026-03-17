import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  getDog,
  listAreas,
  listDogSightingsForDog,
  listExpensesForDog,
  recordContribution,
} from '../lib/communityData'
import { navigateTo } from '../lib/navigation'

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

  return (
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Dog Detail</p>
        <h2>Detailed view for one visible dog</h2>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-banner">{successMessage}</p> : null}

      {isLoading ? (
        <div className="panel empty-state">
          <h3>Loading dog detail</h3>
          <p>Checking the dog record and related sightings.</p>
        </div>
      ) : dog ? (
        <>
          <article className="panel">
            <div className="card-top">
              <div>
                <h3>{dog.dog_name_or_temp_name || 'Unnamed dog'}</h3>
                <p>{area ? `${area.city} - ${area.name}` : 'Area unavailable'}</p>
              </div>
              <span className="tag">{formatLabel(dog.visibility_type)}</span>
            </div>
            <div className="detail-grid">
              <p><strong>Approx age:</strong> {dog.approx_age || 'Not added'}</p>
              <p><strong>Gender:</strong> {formatLabel(dog.gender)}</p>
              <p><strong>Vaccination:</strong> {formatLabel(dog.vaccination_status)}</p>
              <p><strong>Sterilization:</strong> {formatLabel(dog.sterilization_status)}</p>
              <p><strong>Temperament:</strong> {dog.temperament || 'Not added'}</p>
              <p><strong>Status:</strong> {formatLabel(dog.status)}</p>
              <p><strong>Latitude:</strong> {dog.latitude ?? 'Not added'}</p>
              <p><strong>Longitude:</strong> {dog.longitude ?? 'Not added'}</p>
            </div>
            <p><strong>Location description:</strong> {dog.location_description || 'Not added'}</p>
            <p><strong>Health notes:</strong> {dog.health_notes || 'Not added'}</p>
            {isAuthenticated ? (
              <div className="hero-actions top-gap">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => navigateTo(`/dogs/${dog.id}/raise-expense`)}
                >
                  Raise Expense
                </button>
              </div>
            ) : null}
          </article>

          <div className="panel">
            <h3>Sightings</h3>
            {sightings.length === 0 ? (
              <p>No sightings are visible for this dog yet.</p>
            ) : (
              <div className="stack">
                {sightings.map((sighting) => (
                  <div key={sighting.id} className="sub-card">
                    <p><strong>Seen:</strong> {new Date(sighting.sighted_at).toLocaleString()}</p>
                    <p><strong>Notes:</strong> {sighting.notes || 'No notes added.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Expenses for this dog</h3>
            {expenses.length === 0 ? (
              <p>No expenses have been raised for this dog yet.</p>
            ) : (
              <div className="stack">
                {expenses.map((expense) => (
                  (() => {
                    const currentUserContribution = getCurrentUserContribution(expense)

                    return (
                      <article key={expense.id} className="sub-card expense-item">
                        <div className="card-top">
                          <div>
                            <h4>{formatLabel(expense.expense_type)}</h4>
                            <p>
                              Raised by {getExpenseRaiserName(expense)}
                            </p>
                          </div>
                          <span className={`tag ${getExpenseStatusClass(expense.status)}`}>
                            {formatExpenseStatus(expense.status)}
                          </span>
                        </div>
                        <p>{expense.description || 'No description added.'}</p>
                        <div className="detail-grid compact-grid">
                          <p><strong>Total Amount:</strong> Rs. {formatMoney(expense.total_amount)}</p>
                          <p><strong>Contributed:</strong> Rs. {formatMoney(expense.amount_contributed)}</p>
                          <p><strong>Pending:</strong> Rs. {formatMoney(expense.amount_pending)}</p>
                          <p><strong>Created:</strong> {new Date(expense.created_at).toLocaleString()}</p>
                        </div>
                        {currentUserContribution ? (
                          <div className="sub-card contribution-summary">
                            <h5>Your Contribution</h5>
                            <p><strong>Amount contributed:</strong> Rs. {formatMoney(currentUserContribution.amount)}</p>
                            <p>
                              <strong>Contribution date:</strong>{' '}
                              {new Date(currentUserContribution.contributed_at).toLocaleString()}
                            </p>
                            <p>
                              <strong>Payment status:</strong>{' '}
                              {formatContributionStatus(currentUserContribution.payment_status)}
                            </p>
                          </div>
                        ) : null}
                        {isAuthenticated ? (
                          <div className="expense-support-panel top-gap stack">
                            <div className="expense-support-copy stack">
                              <h5>Support this appeal</h5>
                              <div className="detail-grid compact-grid">
                                <p>
                                  <strong>Raised by:</strong>{' '}
                                  {getExpenseRaiserName(expense)}
                                </p>
                                <p>
                                  <strong>UPI ID:</strong>{' '}
                                  {expense.raised_by_profile?.upi_id || 'Not shared yet'}
                                </p>
                                <p>
                                  <strong>Receipt / Proof:</strong>{' '}
                                  {getPrimaryReceipt(expense) ? (
                                    <a
                                      href={getPrimaryReceipt(expense).file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View receipt
                                    </a>
                                  ) : (
                                    'Not added'
                                  )}
                                </p>
                                <p>
                                  <strong>Description:</strong> {expense.description || 'Not added'}
                                </p>
                                <p><strong>Total Amount:</strong> Rs. {formatMoney(expense.total_amount)}</p>
                                <p><strong>Contributed:</strong> Rs. {formatMoney(expense.amount_contributed)}</p>
                                <p><strong>Pending:</strong> Rs. {formatMoney(expense.amount_pending)}</p>
                              </div>
                              <p className="support-disclaimer">
                                Please review the receipt and verify the authenticity of the claim
                                before making payment. Contributions are voluntary and payment is made
                                directly to the person who raised the expense.
                              </p>
                            </div>

                            {user?.id === expense.raised_by_user_id ? (
                              <p className="helper-copy">You raised this expense, so contribution actions are hidden.</p>
                            ) : expense.status === 'funded' || expense.status === 'closed' ? (
                              <p className="helper-copy">This expense is no longer accepting contributions.</p>
                            ) : (
                              <div className="stack">
                                <div className="expense-action-row">
                                  <h5>Contribute</h5>
                                  <div className="quick-contribution-grid">
                                {quickContributionOptions.map((amount) => (
                                  <button
                                    key={amount}
                                    type="button"
                                    className="button button-secondary"
                                    disabled={amount > Number(expense.amount_pending)}
                                    onClick={() => openPaymentModal(expense.id, amount)}
                                  >
                                        {amount === 50
                                          ? 'Rs. 50 Feed a dog'
                                          : amount === 100
                                            ? 'Rs. 100 Food for a day'
                                            : 'Rs. 200 Medical help'}
                                  </button>
                                ))}
                                    <button
                                      type="button"
                                      className="button button-primary"
                                      onClick={() => openPaymentModal(expense.id)}
                                    >
                                      Custom amount
                                    </button>
                                  </div>
                                </div>

                                {activePaymentExpenseId === expense.id ? (
                                  <div className="payment-modal-backdrop">
                                    <div className="payment-modal stack">
                                      <div className="card-top">
                                        <div>
                                          <h5>Support this appeal</h5>
                                          <p>
                                            Raised by: {getExpenseRaiserName(expense)}
                                          </p>
                                          <p>UPI: {expense.raised_by_profile?.upi_id || 'Not shared yet'}</p>
                                        </div>
                                        <button
                                          type="button"
                                          className="text-button"
                                          onClick={hidePaymentModal}
                                        >
                                          Close
                                        </button>
                                      </div>

                                      <input
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

                                      {getUpiPaymentLink(expense, paymentForm.amount) ? (
                                        <div className="payment-qr-card">
                                          <QRCodeSVG
                                            value={getUpiPaymentLink(expense, paymentForm.amount)}
                                            size={192}
                                            includeMargin
                                          />
                                        </div>
                                      ) : null}

                                      <p className="support-disclaimer">
                                        Scan this QR code in any UPI app, complete the payment, and
                                        then return here to record your contribution.
                                      </p>
                                      <p className="helper-copy">
                                        You can also pay manually to the UPI ID shown above if you
                                        prefer not to scan the QR code.
                                      </p>

                                      <textarea
                                        placeholder="Notes (optional)"
                                        value={paymentForm.notes}
                                        onChange={(event) =>
                                          setPaymentForm((current) => ({
                                            ...current,
                                            notes: event.target.value,
                                          }))
                                        }
                                      />

                                      <div className="sub-card stack">
                                        <h5>Did you complete the payment?</h5>
                                        <div className="hero-actions">
                                          <button
                                            type="button"
                                            className="button button-primary"
                                            disabled={isSubmittingContribution}
                                            onClick={() => handleContributionSubmit(expense)}
                                          >
                                            {isSubmittingContribution ? 'Saving...' : 'Yes I Paid'}
                                          </button>
                                          <button
                                            type="button"
                                            className="button button-secondary"
                                            onClick={hidePaymentModal}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : null}
                        {getContributorLeaderboard(expense).length ? (
                          <div className="sub-card contribution-summary">
                            <h5>Top Supporters</h5>
                            <div className="stack">
                              {getContributorLeaderboard(expense).slice(0, 3).map((entry, index) => (
                                <p key={entry.contributor_user_id}>
                                  <strong>{index + 1}. {entry.full_name}</strong> - Rs. {formatMoney(entry.amount)}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    )
                  })()
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="panel empty-state">
          <h3>Dog not found</h3>
          <p>This dog may be outside your visibility scope or may not exist anymore.</p>
        </div>
      )}
    </section>
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

function getExpenseStatusClass(status) {
  if (status === 'funded') {
    return 'tag-safe'
  }

  if (status === 'closed') {
    return 'tag-neutral'
  }

  if (status === 'partially_funded') {
    return 'tag-warn'
  }

  return 'tag-alert'
}
