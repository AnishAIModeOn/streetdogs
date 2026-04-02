import { requireSupabase } from '../integrations/supabase/client'
import type { Contribution, Expense, ExpenseWithContributions } from '../types/supabase'

function toExpenseError(error: any, fallbackMessage: string) {
  if (!error) {
    return new Error(fallbackMessage)
  }

  if (error instanceof Error) {
    return error
  }

  const parts = [error.message, error.details, error.hint].filter(Boolean)
  return new Error(parts[0] || fallbackMessage)
}

export interface CreateExpenseInput {
  dog_id?: string | null
  area_id?: string | null
  target_scope?: 'dog' | 'area' | 'society'
  target_society_id?: string | null
  target_society_name?: string | null
  title?: string | null
  description?: string | null
  amount: number
  incurred_at?: string
  expense_status?: Expense['expense_status']
  receipt_path?: string | null
  receipt_url?: string | null
}

export interface CreateContributionInput {
  expense_id: string
  amount: number
  payment_method?: string
  note?: string | null
  contributor_name?: string | null
  contributor_email?: string | null
  contributor_user_id?: string | null
  payment_status?: string
  notes?: string | null
}

export interface CreateExpenseReceiptInput {
  expense_id: string
  uploaded_by_user_id: string
  file_url: string
}

export async function listExpenses(dogId?: string) {
  const supabase = requireSupabase()
  let query = supabase
    .from('expenses')
    .select(
      `
        *,
        raised_by_profile:profiles!expenses_raised_by_user_id_fkey (
          full_name,
          upi_id
        ),
        expense_receipts (
          id,
          file_url,
          uploaded_at
        ),
        contributions (
          id,
          contributor_user_id,
          amount,
          payment_status,
          contributed_at,
          contributor_profile:profiles!contributions_contributor_user_id_fkey (
            full_name
          )
        )
      `,
    )
    .order('created_at', { ascending: false })

  if (dogId) {
    query = query.eq('dog_id', dogId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data as ExpenseWithContributions[]
}

export async function getExpenseById(expenseId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
        *,
        raised_by_profile:profiles!expenses_raised_by_user_id_fkey (
          full_name,
          upi_id
        ),
        expense_receipts (
          id,
          file_url,
          uploaded_at
        ),
        contributions (
          id,
          contributor_user_id,
          amount,
          payment_status,
          contributed_at,
          contributor_profile:profiles!contributions_contributor_user_id_fkey (
            full_name
          )
        )
      `,
    )
    .eq('id', expenseId)
    .single()

  if (error) {
    throw error
  }

  return data as ExpenseWithContributions
}

export async function createExpense(input: CreateExpenseInput) {
  const supabase = requireSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated.')
  }

  const isLegacyExpensePayload =
    'raised_by_user_id' in input ||
    'expense_type' in input ||
    'total_amount' in input ||
    'amount_pending' in input

  if (isLegacyExpensePayload) {
    const legacyInput = input as CreateExpenseInput & {
      raised_by_user_id?: string
      area_id?: string
      expense_type?: string
      total_amount?: number
      amount_contributed?: number
      amount_pending?: number
      disclaimer_accepted?: boolean
      status?: string
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        dog_id: legacyInput.dog_id ?? null,
        raised_by_user_id: legacyInput.raised_by_user_id ?? user.id,
        area_id: legacyInput.area_id ?? null,
        target_scope: legacyInput.target_scope ?? (legacyInput.dog_id ? 'dog' : 'area'),
        target_society_id: legacyInput.target_society_id ?? null,
        target_society_name: legacyInput.target_society_name ?? null,
        expense_type: legacyInput.expense_type ?? 'other',
        description: legacyInput.description ?? null,
        total_amount: legacyInput.total_amount ?? legacyInput.amount ?? 0,
        amount_contributed: legacyInput.amount_contributed ?? 0,
        amount_pending: legacyInput.amount_pending ?? legacyInput.amount ?? 0,
        disclaimer_accepted: Boolean(legacyInput.disclaimer_accepted),
        status: legacyInput.status ?? 'open',
      })
      .select('*')
      .single()

    if (error) {
      throw toExpenseError(error, 'Unable to create the expense.')
    }

    return data as Expense
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    throw toExpenseError(error, 'Unable to create the expense.')
  }

  return data as Expense
}

export async function createContribution(input: CreateContributionInput) {
  const supabase = requireSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLegacyContributionPayload =
    'contributor_user_id' in input || 'payment_status' in input || 'notes' in input

  if (isLegacyContributionPayload) {
    const legacyInput = input as CreateContributionInput
    const { data, error } = await supabase
      .from('contributions')
      .insert({
        expense_id: legacyInput.expense_id,
        contributor_user_id: legacyInput.contributor_user_id ?? user?.id ?? null,
        amount: legacyInput.amount,
        payment_method: legacyInput.payment_method ?? 'upi',
        payment_status: legacyInput.payment_status ?? 'confirmed',
        notes: legacyInput.notes ?? legacyInput.note ?? null,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return data as Contribution
  }

  const { data, error } = await supabase
    .from('contributions')
    .insert({
      ...input,
      contributor_id: user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as Contribution
}

export async function createExpenseReceipt(input: CreateExpenseReceiptInput) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('expense_receipts')
    .insert({
      expense_id: input.expense_id,
      uploaded_by_user_id: input.uploaded_by_user_id,
      file_url: input.file_url,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function uploadExpenseReceipt(file: File, userId: string) {
  const supabase = requireSupabase()
  const extension = file.name.split('.').pop() || 'jpg'
  const filePath = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('expense-receipts').upload(filePath, file, {
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    throw error
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from('expense-receipts')
    .createSignedUrl(filePath, 60 * 60)

  if (signedUrlError) {
    throw signedUrlError
  }

  return {
    receipt_path: filePath,
    receipt_url: data.signedUrl,
  }
}
