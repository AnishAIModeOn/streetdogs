import { useState } from 'react'
import { emptyInventoryRequestForm } from '../data/seedData'
import {
  createInventoryRequest,
  createInventoryRequestItems,
} from '../lib/communityData'
import { navigateTo } from '../lib/navigation'

const categoryOptions = ['food', 'medical', 'feeding_support', 'rescue', 'hygiene']
const unitOptions = ['kg', 'packets', 'pieces', 'boxes', 'bottles', 'units']

function formatLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'Not added'
}

function createEmptyItem() {
  return {
    item_name: '',
    category: 'food',
    quantity_required: '',
    unit: 'kg',
  }
}

export function NewInventoryRequestPage({ user, profile }) {
  const [form, setForm] = useState(emptyInventoryRequestForm)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const canManageInventory =
    profile?.role === 'inventory_admin' || profile?.role === 'superadmin'

  const validateForm = () => {
    if (!form.title.trim()) {
      return 'Please add a title for this inventory request.'
    }

    if (form.items.length === 0) {
      return 'Please add at least one inventory item.'
    }

    for (const [index, item] of form.items.entries()) {
      if (!item.item_name.trim()) {
        return `Please add an item name for row ${index + 1}.`
      }

      if (!item.category) {
        return `Please choose a category for row ${index + 1}.`
      }

      if (!item.unit) {
        return `Please choose a unit for row ${index + 1}.`
      }

      if (!item.quantity_required || Number(item.quantity_required) <= 0) {
        return `Quantity required must be greater than 0 for row ${index + 1}.`
      }
    }

    return ''
  }

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const addItemRow = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()],
    }))
  }

  const removeItemRow = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const createdRequest = await createInventoryRequest({
        area_id: profile.primary_area_id,
        created_by_user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: 'open',
      })

      await createInventoryRequestItems(
        form.items.map((item) => {
          const quantityRequired = Number(item.quantity_required)

          return {
            inventory_request_id: createdRequest.id,
            item_name: item.item_name.trim(),
            category: item.category,
            quantity_required: quantityRequired,
            quantity_committed: 0,
            quantity_remaining: quantityRequired,
            unit: item.unit,
          }
        }),
      )

      setSuccessMessage('Inventory request created successfully. Redirecting to inventory...')
      window.setTimeout(() => {
        navigateTo('/inventory')
      }, 1000)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create this inventory request.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!canManageInventory) {
    return (
      <section className="section stack">
        <div className="panel empty-state">
          <h3>Unauthorized</h3>
          <p>Only inventory admins and superadmins can create inventory requests.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section stack">
      <div className="section-heading">
        <p className="eyebrow">Inventory</p>
        <h2>Create a new inventory request</h2>
        <p className="helper-copy">This request will be created for your primary area only.</p>
      </div>

      {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
      {successMessage ? <p className="status-banner">{successMessage}</p> : null}

      <form className="panel stack" onSubmit={handleSubmit}>
        <input
          required
          placeholder="Request title"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
        />

        <div className="stack">
          <div className="card-top">
            <div>
              <h3>Request items</h3>
              <p>Add all items needed for this request.</p>
            </div>
            <button type="button" className="button button-secondary" onClick={addItemRow}>
              Add item
            </button>
          </div>

          {form.items.map((item, index) => (
            <div key={`${index + 1}-${item.item_name}`} className="sub-card stack">
              <div className="card-top">
                <div>
                  <h4>Item {index + 1}</h4>
                  <p>{formatLabel(item.category)}</p>
                </div>
                {form.items.length > 1 ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => removeItemRow(index)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <input
                required
                placeholder="Item name"
                value={item.item_name}
                onChange={(event) => updateItem(index, 'item_name', event.target.value)}
              />
              <div className="dual-field">
                <select
                  value={item.category}
                  onChange={(event) => updateItem(index, 'category', event.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
                <select
                  value={item.unit}
                  onChange={(event) => updateItem(index, 'unit', event.target.value)}
                >
                  {unitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="Quantity required"
                value={item.quantity_required}
                onChange={(event) =>
                  updateItem(index, 'quantity_required', event.target.value)
                }
              />
            </div>
          ))}
        </div>

        <div className="hero-actions">
          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving ? 'Creating request...' : 'Create inventory request'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigateTo('/inventory')}
          >
            Back to inventory
          </button>
        </div>
      </form>
    </section>
  )
}
