export type ProfileRole = 'end_user' | 'inventory_admin' | 'superadmin' | 'volunteer' | 'admin'
export type DogStatus = 'active' | 'adopted' | 'missing' | 'deceased'
export type VaccinationStatus =
  | 'unknown'
  | 'not_vaccinated'
  | 'partially_vaccinated'
  | 'vaccinated'
export type SterilizationStatus =
  | 'unknown'
  | 'not_sterilized'
  | 'scheduled'
  | 'sterilized'
export type HealthStatus = 'observation' | 'needs_food' | 'medical_attention' | 'stable'
export type ExpenseStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'open'
  | 'funded'
  | 'settled'
  | 'cancelled'
  | 'partially_funded'
  | 'closed'
export type ContributionStatus = 'pending' | 'confirmed' | 'refunded' | 'failed'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: ProfileRole
  city: string | null
  neighbourhood?: string | null
  neighbourhood_id?: string | null
  pincode?: string | null
  society_id?: string | null
  upi_id?: string | null
  status?: 'active' | 'inactive' | null
  societies?: {
    id?: string | null
    name?: string | null
    locality_id?: string | null
    pincode?: string | null
    neighbourhood?: string | null
  } | null
  created_at: string
  updated_at: string
}

export interface Dog {
  id: string
  created_by: string | null
  updated_by: string | null
  area_id?: string | null
  locality_name?: string | null
  society_name?: string | null
  added_by_user_id?: string | null
  tagged_by_user_id?: string | null
  tagged_society_id?: string | null
  tagged_society_name?: string | null
  society_status?: 'pending' | 'confirmed' | 'rejected' | null
  tagged_area_pincode?: string | null
  tagged_area_neighbourhood?: string | null
  added_by_guest?: boolean
  guest_contact?: string | null
  dog_name_or_temp_name: string | null
  slug: string | null
  city: string | null
  area_name: string | null
  location_description: string
  latitude: number | null
  longitude: number | null
  gender?: string | null
  approx_age?: string | null
  dog_status: DogStatus
  status?: string | null
  vaccination_status: VaccinationStatus
  sterilization_status: SterilizationStatus
  health_status: HealthStatus
  health_notes?: string | null
  temperament?: string | null
  ai_summary?: string | null
  ai_condition?: string | null
  ai_urgency?: string | null
  ai_breed_guess?: string | null
  ai_color?: string | null
  ai_age_band?: string | null
  ai_injuries?: string | null
  ai_raw_json?: Record<string, unknown> | null
  ai_processed_at?: string | null
  visibility_type?: string | null
  notes: string | null
  photo_path: string | null
  photo_url: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  dog_id: string | null
  created_by?: string | null
  raised_by_user_id?: string | null
  area_id?: string | null
  target_scope?: 'dog' | 'area' | 'society' | null
  target_society_id?: string | null
  target_society_name?: string | null
  title?: string | null
  expense_type?: string | null
  description: string | null
  amount?: number | null
  total_amount?: number | null
  amount_contributed?: number | null
  amount_pending?: number | null
  expense_status?: ExpenseStatus | null
  status?: ExpenseStatus | null
  incurred_at?: string | null
  approved_by?: string | null
  approved_at?: string | null
  disclaimer_accepted?: boolean
  receipt_path: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
  raised_by_profile?: {
    full_name?: string | null
    upi_id?: string | null
  } | null
  expense_receipts?: Array<{
    id: string
    file_url: string
    uploaded_at?: string | null
  }>
}

export interface Contribution {
  id: string
  expense_id: string
  contributor_id?: string | null
  contributor_user_id?: string | null
  contributor_name?: string | null
  contributor_email?: string | null
  amount: number
  payment_method: string
  contribution_status?: ContributionStatus | null
  payment_status?: ContributionStatus | null
  note?: string | null
  notes?: string | null
  contributed_at?: string | null
  created_at: string
  updated_at: string
  contributor_profile?: {
    full_name?: string | null
  } | null
}

export interface ExpenseWithContributions extends Expense {
  contributions?: Contribution[]
}

export interface AuthSessionState {
  session: unknown | null
  user: { id: string; email?: string | null } | null
  profile: Profile | null
}
