import { useEffect, useState } from 'react'
import { emptyExpenseForm } from '../data/seedData'
import { createExpense, createExpenseReceipt, getDog, getProfile, listAreas } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'

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
      <section className="section stack">
        <div className="panel empty-state">
          <h3>Loading dog</h3>
          <p>Checking that this dog is available for expense creation.</p>
        </div>
      </section>
    )
  }

  if (!dog) {
    return (
      <section className="section stack">
        <div className="panel empty-state">
          <h3>Dog not available</h3>
          <p>This dog could not be found or is outside your access scope.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Raise Expense</p>
        <h2>Create an expense for {dog.dog_name_or_temp_name || 'this dog'}</h2>
        <p className="helper-copy">{area ? `${area.city} - ${area.name}` : 'Area unavailable'}</p>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-banner">{successMessage}</p> : null}

      {!profile?.upi_id ? (
        <div className="panel empty-state">
          <h3>UPI ID required</h3>
          <p>To raise an expense appeal you must first add your UPI ID.</p>
          <div className="hero-actions top-gap">
            <button
              type="button"
              className="button button-primary"
              onClick={() => navigateTo('/profile')}
            >
              Add UPI ID
            </button>
          </div>
        </div>
      ) : null}

      {profile?.upi_id ? (
        <form className="panel stack" onSubmit={handleSubmit}>
          <select
            value={form.expense_type}
            onChange={(event) => setForm((current) => ({ ...current, expense_type: event.target.value }))}
          >
            {expenseTypes.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min="1"
            step="0.01"
            placeholder="Total amount"
            value={form.total_amount}
            onChange={(event) => setForm((current) => ({ ...current, total_amount: event.target.value }))}
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <input
            type="url"
            placeholder="Receipt URL (optional)"
            value={form.receipt_url}
            onChange={(event) => setForm((current) => ({ ...current, receipt_url: event.target.value }))}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.disclaimer_accepted}
              onChange={(event) =>
                setForm((current) => ({ ...current, disclaimer_accepted: event.target.checked }))
              }
            />
            <span>I confirm this expense is valid and I accept the disclaimer requirement.</span>
          </label>
          <div className="hero-actions">
            <button type="submit" className="button button-primary" disabled={isSaving}>
              {isSaving ? 'Raising expense...' : 'Raise Expense'}
            </button>
            <button type="button" className="button button-secondary" onClick={() => navigateTo(`/dogs/${dog.id}`)}>
              Back to Dog
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
