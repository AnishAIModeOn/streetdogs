export const EXPENSE_PENDING_APPROVAL_STATUS = 'pending_approval'
export const EXPENSE_APPROVED_STATUS = 'approved'
export const EXPENSE_REJECTED_STATUS = 'rejected'

export const VISIBLE_EXPENSE_STATUSES = [
  EXPENSE_APPROVED_STATUS,
  'partially_funded',
  'funded',
  'settled',
  'closed',
  'cancelled',
]

export function isVisibleExpenseStatus(status?: string | null) {
  return VISIBLE_EXPENSE_STATUSES.includes(status ?? '')
}

export function canContributeToExpenseStatus(status?: string | null) {
  return status === EXPENSE_APPROVED_STATUS || status === 'partially_funded'
}

export function isPendingExpenseApprovalStatus(status?: string | null) {
  return status === EXPENSE_PENDING_APPROVAL_STATUS
}
