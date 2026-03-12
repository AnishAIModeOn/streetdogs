import { useState } from 'react'
import './App.css'
import { DashboardSection } from './components/DashboardSection'
import { DogsSection } from './components/DogsSection'
import { ExpensesSection } from './components/ExpensesSection'
import { HeroSection } from './components/HeroSection'
import { InventorySection } from './components/InventorySection'
import {
  emptyDogForm,
  emptyExpenseForm,
  emptyInventoryForm,
  initialDogs,
  initialExpenses,
  initialInventory,
} from './data/seedData'
import { usePersistentState } from './hooks/usePersistentState'

function App() {
  const [dogs, setDogs] = usePersistentState('streetdogs.dogs', initialDogs)
  const [inventory, setInventory] = usePersistentState('streetdogs.inventory', initialInventory)
  const [expenses, setExpenses] = usePersistentState('streetdogs.expenses', initialExpenses)
  const [dogForm, setDogForm] = useState(emptyDogForm)
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm)
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm)

  const totalFoodUnits = inventory.reduce((sum, entry) => sum + Number(entry.quantity), 0)
  const lowStockCount = inventory.filter((entry) => entry.quantity <= entry.threshold).length
  const totalRequested = expenses.reduce((sum, entry) => sum + entry.amount, 0)
  const totalRaised = expenses.reduce((sum, entry) => sum + entry.raised, 0)
  const fundingProgress = Math.round((totalRaised / totalRequested) * 100) || 0

  const updateDogForm = (field, value) => {
    setDogForm((current) => ({ ...current, [field]: value }))
  }

  const updateInventoryForm = (field, value) => {
    setInventoryForm((current) => ({ ...current, [field]: value }))
  }

  const updateExpenseForm = (field, value) => {
    setExpenseForm((current) => ({ ...current, [field]: value }))
  }

  const handleDogSubmit = (event) => {
    event.preventDefault()
    setDogs((current) => [{ id: Date.now(), ...dogForm }, ...current])
    setDogForm(emptyDogForm)
  }

  const handleInventorySubmit = (event) => {
    event.preventDefault()
    setInventory((current) => [
      {
        id: Date.now(),
        item: inventoryForm.item,
        quantity: Number(inventoryForm.quantity),
        unit: inventoryForm.unit,
        threshold: Number(inventoryForm.threshold),
        owner: inventoryForm.owner,
      },
      ...current,
    ])
    setInventoryForm(emptyInventoryForm)
  }

  const handleExpenseSubmit = (event) => {
    event.preventDefault()
    setExpenses((current) => [
      {
        id: Date.now(),
        title: expenseForm.title,
        requester: expenseForm.requester,
        amount: Number(expenseForm.amount),
        raised: 0,
        reason: expenseForm.reason,
      },
      ...current,
    ])
    setExpenseForm(emptyExpenseForm)
  }

  const contributeToExpense = (expenseId, contribution) => {
    setExpenses((current) =>
      current.map((entry) =>
        entry.id === expenseId
          ? { ...entry, raised: Math.min(entry.amount, entry.raised + contribution) }
          : entry,
      ),
    )
  }

  return (
    <div className="app-shell">
      <HeroSection
        dogsCount={dogs.length}
        totalFoodUnits={totalFoodUnits}
        fundingProgress={fundingProgress}
      />

      <main className="content">
        <DashboardSection
          dogsCount={dogs.length}
          lowStockCount={lowStockCount}
          totalRequested={totalRequested}
          totalRaised={totalRaised}
        />
        <DogsSection
          dogs={dogs}
          dogForm={dogForm}
          onFormChange={updateDogForm}
          onSubmit={handleDogSubmit}
        />
        <InventorySection
          inventory={inventory}
          inventoryForm={inventoryForm}
          onFormChange={updateInventoryForm}
          onSubmit={handleInventorySubmit}
        />
        <ExpensesSection
          expenses={expenses}
          expenseForm={expenseForm}
          onFormChange={updateExpenseForm}
          onSubmit={handleExpenseSubmit}
          onContribute={contributeToExpense}
        />
      </main>
    </div>
  )
}

export default App
