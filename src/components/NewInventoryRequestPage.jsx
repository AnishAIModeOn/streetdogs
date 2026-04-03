import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { emptyInventoryRequestForm } from '../data/seedData'
import { createInventoryRequest, createInventoryRequestItems } from '../lib/communityData'
import { navigateTo } from '../lib/navigation'
import { StatusBanner } from './StatusBanner'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

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
  const scopedAreaId = profile?.neighbourhood_id || null

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

      if (!scopedAreaId) {
        throw new Error('Please assign an area before creating an inventory request.')
      }

      const createdRequest = await createInventoryRequest({
        area_id: scopedAreaId,
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
      <section className="space-y-6">
        <Card className="rounded-[2rem] border-dashed border-border bg-white/90">
          <CardContent className="space-y-2 p-10 text-center">
            <h3 className="text-xl font-semibold text-foreground">Unauthorized</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Only inventory admins and superadmins can create inventory requests.
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
            Inventory
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Create a new inventory request
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Organize area needs into one clean request so volunteers and contributors know
              exactly what to bring.
            </p>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Request scope</CardTitle>
            <CardDescription>
              This request will be created for your primary area only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-2xl bg-secondary/40 p-4">
              Add a short title so others can identify the request quickly.
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              Break down supplies into clear item rows with category, quantity, and unit.
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <StatusBanner variant="error">{errorMessage}</StatusBanner> : null}
      {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <Card className="rounded-[2rem] border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Request details</CardTitle>
            <CardDescription>
              Keep the request title and description brief and practical.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <FormField>
              <FormLabel>Request title</FormLabel>
              <Input
                required
                placeholder="Request title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </FormField>
            <FormField>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </FormField>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/90">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Request items</CardTitle>
                <CardDescription>Add all items needed for this request.</CardDescription>
              </div>
              <Button type="button" variant="secondary" onClick={addItemRow}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {form.items.map((item, index) => (
              <div
                key={`${index + 1}-${item.item_name}`}
                className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-5 shadow-soft"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">Item {index + 1}</p>
                    <p className="text-sm text-muted-foreground">{formatLabel(item.category)}</p>
                  </div>
                  {form.items.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeItemRow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField className="md:col-span-2">
                    <FormLabel>Item name</FormLabel>
                    <Input
                      required
                      placeholder="Item name"
                      value={item.item_name}
                      onChange={(event) => updateItem(index, 'item_name', event.target.value)}
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={item.category}
                      onValueChange={(value) => updateItem(index, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {formatLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField>
                    <FormLabel>Unit</FormLabel>
                    <Select value={item.unit} onValueChange={(value) => updateItem(index, 'unit', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField className="md:col-span-2">
                    <FormLabel>Quantity required</FormLabel>
                    <Input
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
                  </FormField>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigateTo('/inventory')}>
            Back to inventory
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Creating request...' : 'Create inventory request'}
          </Button>
        </div>
      </form>
    </section>
  )
}
