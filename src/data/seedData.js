export const emptySignUpForm = {
  full_name: '',
  email: '',
  password: '',
}

export const emptySignInForm = {
  email: '',
  password: '',
}

export const emptyProfileCompletionForm = {
  full_name: '',
  primary_area_id: '',
  upi_id: '',
}

export const emptyDogForm = {
  dog_name_or_temp_name: '',
  area_id: '',
  added_by_guest: false,
  guest_contact: '',
  photo_url: '',
  location_description: '',
  latitude: '',
  longitude: '',
  gender: 'unknown',
  approx_age: '',
  vaccination_status: 'unknown',
  sterilization_status: 'unknown',
  health_notes: '',
  temperament: '',
  visibility_type: 'normal_area_visible',
  status: 'active',
}

export const emptyGuestReportForm = {
  dog_name_or_temp_name: '',
  area_id: '',
  guest_contact: '',
  location_description: '',
  photo_url: '',
  approx_age: '',
  health_notes: '',
}

export const emptyExpenseForm = {
  expense_type: 'food',
  total_amount: '',
  description: '',
  disclaimer_accepted: false,
  receipt_url: '',
}

export const emptyInventoryRequestForm = {
  title: '',
  description: '',
  items: [
    {
      item_name: '',
      category: 'food',
      quantity_required: '',
      unit: 'kg',
    },
  ],
}
