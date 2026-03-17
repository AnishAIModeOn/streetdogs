import { requireSupabase } from '../integrations/supabase/client'
import type { Contribution, Expense, ExpenseWithContributions } from '../types/supabase'

export interface CreateExpenseInput {
  dog_id: string
  title: string
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
}

export async function listExpenses(dogId?: string) {
  const supabase = requireSupabase()
  let query = supabase
    .from('expenses')
    .select('*, contributions(*)')
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
    .select('*, contributions(*)')
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

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as Expense
}

export async function createContribution(input: CreateContributionInput) {
  const supabase = requireSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
