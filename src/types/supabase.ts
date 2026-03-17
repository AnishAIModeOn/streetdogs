export type ProfileRole = 'volunteer' | 'admin'
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
export type ExpenseStatus = 'open' | 'funded' | 'settled' | 'cancelled'
export type ContributionStatus = 'pending' | 'confirmed' | 'refunded'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: ProfileRole
  city: string | null
  area_name: string | null
  primary_area_id?: string | null
  created_at: string
  updated_at: string
}

export interface Dog {
  id: string
  created_by: string | null
  updated_by: string | null
  area_id?: string | null
  added_by_user_id?: string | null
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
  dog_id: string
  created_by: string
  title: string
  description: string | null
  amount: number
  expense_status: ExpenseStatus
  incurred_at: string
  receipt_path: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

export interface Contribution {
  id: string
  expense_id: string
  contributor_id: string | null
  contributor_name: string | null
  contributor_email: string | null
  amount: number
  payment_method: string
  contribution_status: ContributionStatus
  note: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseWithContributions extends Expense {
  contributions?: Contribution[]
}

export interface AuthSessionState {
  session: unknown | null
  user: { id: string; email?: string | null } | null
  profile: Profile | null
}
