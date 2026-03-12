export const initialDogs = [
  {
    id: 1,
    name: 'Ladoo',
    area: 'Maple Street',
    age: '3 years',
    health: 'Vaccinated and energetic',
    feeding: 'Morning and evening',
  },
  {
    id: 2,
    name: 'Mitti',
    area: 'Community Park',
    age: '5 years',
    health: 'Needs joint supplements',
    feeding: 'Soft food at noon',
  },
  {
    id: 3,
    name: 'Sheru',
    area: 'Temple Corner',
    age: '2 years',
    health: 'Recovering after treatment',
    feeding: 'Protein mix at night',
  },
]

export const initialInventory = [
  {
    id: 1,
    item: 'Dry kibble bags',
    quantity: 6,
    unit: 'bags',
    threshold: 8,
    owner: 'Inventory admin',
  },
  {
    id: 2,
    item: 'Rice sacks',
    quantity: 3,
    unit: 'sacks',
    threshold: 4,
    owner: 'Inventory admin',
  },
  {
    id: 3,
    item: 'Supplements',
    quantity: 18,
    unit: 'packs',
    threshold: 10,
    owner: 'Clinic volunteer',
  },
]

export const initialExpenses = [
  {
    id: 1,
    title: 'Emergency vet visit for Sheru',
    requester: 'Anaya',
    amount: 3200,
    raised: 2200,
    reason: 'Wound dressing, antibiotics, and transport',
  },
  {
    id: 2,
    title: 'Weekend food drive top-up',
    requester: 'Rohan',
    amount: 1800,
    raised: 900,
    reason: 'Chicken, rice, and rehydration stock',
  },
]

export const emptyDogForm = {
  name: '',
  area: '',
  age: '',
  health: '',
  feeding: '',
}

export const emptyInventoryForm = {
  item: '',
  quantity: '',
  unit: 'bags',
  threshold: '',
  owner: '',
}

export const emptyExpenseForm = {
  title: '',
  requester: '',
  amount: '',
  reason: '',
}
