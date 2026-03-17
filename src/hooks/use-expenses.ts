import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContribution,
  createExpense,
  getExpenseById,
  listExpenses,
  uploadExpenseReceipt,
  type CreateContributionInput,
  type CreateExpenseInput,
} from '../services/expenses.service'

export function useExpenses(dogId?: string) {
  return useQuery({
    queryKey: ['expenses', { dogId: dogId ?? 'all' }],
    queryFn: () => listExpenses(dogId),
  })
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: ['expenses', expenseId],
    queryFn: () => getExpenseById(expenseId),
    enabled: Boolean(expenseId),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => createExpense(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useCreateContribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateContributionInput) => createContribution(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useUploadExpenseReceipt() {
  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) =>
      uploadExpenseReceipt(file, userId),
  })
}
