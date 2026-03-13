import { useEffect, useState } from 'react'
import './App.css'
import { DashboardSection } from './components/DashboardSection'
import { DogsSection } from './components/DogsSection'
import { ExpensesSection } from './components/ExpensesSection'
import { HeroSection } from './components/HeroSection'
import { InventorySection } from './components/InventorySection'
import { TasksSection } from './components/TasksSection'
import {
  createContribution,
  createDonationAppeal,
  listContributions,
  listDonationAppeals,
  listTasks,
  updateContribution,
  updateDonationAppeal,
} from './lib/communityData'
import { hasSupabaseEnv } from './lib/supabaseClient'
import {
  emptyContributionForm,
  emptyDogForm,
  emptyExpenseForm,
  emptyInventoryForm,
  initialDogs,
  initialInventory,
} from './data/seedData'
import { usePersistentState } from './hooks/usePersistentState'

function App() {
  const [dogs, setDogs] = usePersistentState('streetdogs.dogs', initialDogs)
  const [inventory, setInventory] = usePersistentState('streetdogs.inventory', initialInventory)
  const [appeals, setAppeals] = useState([])
  const [contributions, setContributions] = useState([])
  const [tasks, setTasks] = useState([])
  const [dogForm, setDogForm] = useState(emptyDogForm)
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm)
  const [appealForm, setAppealForm] = useState(emptyExpenseForm)
  const [contributionForm, setContributionForm] = useState(emptyContributionForm)
  const [isLoadingRemoteData, setIsLoadingRemoteData] = useState(hasSupabaseEnv)
  const [statusMessage, setStatusMessage] = useState('')

  const totalFoodUnits = inventory.reduce((sum, entry) => sum + Number(entry.quantity), 0)
  const lowStockCount = inventory.filter((entry) => entry.quantity <= entry.threshold).length
  const totalRequested = appeals.reduce((sum, entry) => sum + Number(entry.amount_needed), 0)
  const totalRaised = contributions.reduce((sum, entry) => sum + Number(entry.amount), 0)
  const fundingProgress = Math.round((totalRaised / totalRequested) * 100) || 0
  const activeAppealsCount = appeals.filter((entry) => entry.status !== 'closed').length
  const openTasksCount = tasks.filter((task) => task.status !== 'done').length
  const contributionsByAppeal = contributions.reduce((grouped, contribution) => {
    const appealContributions = grouped[contribution.appeal_id] ?? []
    appealContributions.push(contribution)
    grouped[contribution.appeal_id] = appealContributions
    return grouped
  }, {})

  const loadRemoteData = async () => {
    if (!hasSupabaseEnv) {
      setIsLoadingRemoteData(false)
      return
    }

    try {
      setIsLoadingRemoteData(true)
      setStatusMessage('')
      const [appealsData, contributionsData, tasksData] = await Promise.all([
        listDonationAppeals(),
        listContributions(),
        listTasks(),
      ])
      setAppeals(appealsData)
      setContributions(contributionsData)
      setTasks(tasksData)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsLoadingRemoteData(false)
    }
  }

  useEffect(() => {
    loadRemoteData()
  }, [])

  const updateDogForm = (field, value) => {
    setDogForm((current) => ({ ...current, [field]: value }))
  }

  const updateInventoryForm = (field, value) => {
    setInventoryForm((current) => ({ ...current, [field]: value }))
  }

  const updateAppealForm = (field, value) => {
    setAppealForm((current) => ({ ...current, [field]: value }))
  }

  const updateContributionForm = (field, value) => {
    setContributionForm((current) => ({ ...current, [field]: value }))
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

  const handleAppealSubmit = async (event) => {
    event.preventDefault()

    try {
      setStatusMessage('')
      await createDonationAppeal({
        ...appealForm,
        amount_needed: Number(appealForm.amount_needed),
      })
      setAppealForm(emptyExpenseForm)
      await loadRemoteData()
      setStatusMessage('Donation appeal saved to Supabase.')
    } catch (error) {
      setStatusMessage(error.message)
    }
  }

  const handleContributionSubmit = async (event) => {
    event.preventDefault()

    try {
      setStatusMessage('')
      await createContribution({
        ...contributionForm,
        amount: Number(contributionForm.amount),
      })
      setContributionForm(emptyContributionForm)
      await loadRemoteData()
      setStatusMessage('Contribution saved to Supabase.')
    } catch (error) {
      setStatusMessage(error.message)
    }
  }

  const handleAppealStatusChange = async (appealId, status) => {
    try {
      setStatusMessage('')
      await updateDonationAppeal(appealId, { status })
      await loadRemoteData()
      setStatusMessage('Appeal status updated.')
    } catch (error) {
      setStatusMessage(error.message)
    }
  }

  const handleContributionStatusChange = async (contributionId, status) => {
    try {
      setStatusMessage('')
      await updateContribution(contributionId, { status })
      await loadRemoteData()
      setStatusMessage('Contribution status updated.')
    } catch (error) {
      setStatusMessage(error.message)
    }
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
          activeAppealsCount={activeAppealsCount}
          openTasksCount={openTasksCount}
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
          appeals={appeals}
          appealForm={appealForm}
          contributionForm={contributionForm}
          contributionsByAppeal={contributionsByAppeal}
          statusMessage={statusMessage}
          onAppealFormChange={updateAppealForm}
          onContributionFormChange={updateContributionForm}
          onAppealSubmit={handleAppealSubmit}
          onContributionSubmit={handleContributionSubmit}
          onAppealStatusChange={handleAppealStatusChange}
          onContributionStatusChange={handleContributionStatusChange}
          isSupabaseReady={hasSupabaseEnv}
          isLoading={isLoadingRemoteData}
        />
        <TasksSection
          tasks={tasks}
          isSupabaseReady={hasSupabaseEnv}
          isLoading={isLoadingRemoteData}
        />
      </main>
    </div>
  )
}

export default App
