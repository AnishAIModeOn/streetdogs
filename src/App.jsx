import { useState } from 'react'
import './App.css'

const initialDogs = [
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

const initialInventory = [
  { id: 1, item: 'Dry kibble bags', quantity: 6, unit: 'bags', threshold: 8, owner: 'Inventory admin' },
  { id: 2, item: 'Rice sacks', quantity: 3, unit: 'sacks', threshold: 4, owner: 'Inventory admin' },
  { id: 3, item: 'Supplements', quantity: 18, unit: 'packs', threshold: 10, owner: 'Clinic volunteer' },
]

const initialExpenses = [
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

function App() {
  const [dogs, setDogs] = useState(initialDogs)
  const [inventory, setInventory] = useState(initialInventory)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [dogForm, setDogForm] = useState({
    name: '',
    area: '',
    age: '',
    health: '',
    feeding: '',
  })
  const [inventoryForm, setInventoryForm] = useState({
    item: '',
    quantity: '',
    unit: 'bags',
    threshold: '',
    owner: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    requester: '',
    amount: '',
    reason: '',
  })

  const totalFoodUnits = inventory.reduce((sum, entry) => sum + Number(entry.quantity), 0)
  const lowStockCount = inventory.filter((entry) => entry.quantity <= entry.threshold).length
  const totalRequested = expenses.reduce((sum, entry) => sum + entry.amount, 0)
  const totalRaised = expenses.reduce((sum, entry) => sum + entry.raised, 0)

  const handleDogSubmit = (event) => {
    event.preventDefault()
    setDogs((current) => [
      {
        id: Date.now(),
        ...dogForm,
      },
      ...current,
    ])
    setDogForm({ name: '', area: '', age: '', health: '', feeding: '' })
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
    setInventoryForm({ item: '', quantity: '', unit: 'bags', threshold: '', owner: '' })
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
    setExpenseForm({ title: '', requester: '', amount: '', reason: '' })
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
      <header className="hero">
        <nav className="topbar">
          <div>
            <p className="eyebrow">Street Dog Community Welfare</p>
            <h1>Packed for rescue, feeding, and shared community funding.</h1>
          </div>
          <div className="nav-links">
            <a href="#dashboard">Dashboard</a>
            <a href="#dogs">Dog Profiles</a>
            <a href="#inventory">Food Inventory</a>
            <a href="#expenses">Expenses</a>
          </div>
        </nav>

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="lead">
              Track every dog in the area, monitor food stock, and coordinate volunteer
              reimbursements from one responsive dashboard.
            </p>
            <div className="hero-actions">
              <a href="#dogs" className="button button-primary">
                Add a dog profile
              </a>
              <a href="#expenses" className="button button-secondary">
                Review active expenses
              </a>
            </div>
          </section>

          <aside className="hero-panel">
            <p className="panel-title">Care pulse</p>
            <div className="pulse-row">
              <span>Dogs tracked</span>
              <strong>{dogs.length}</strong>
            </div>
            <div className="pulse-row">
              <span>Food units in stock</span>
              <strong>{totalFoodUnits}</strong>
            </div>
            <div className="pulse-row">
              <span>Funding progress</span>
              <strong>{Math.round((totalRaised / totalRequested) * 100) || 0}%</strong>
            </div>
          </aside>
        </div>
      </header>

      <main className="content">
        <section id="dashboard" className="section">
          <div className="section-heading">
            <p className="eyebrow">Dashboard</p>
            <h2>Community snapshot</h2>
          </div>

          <div className="stats-grid">
            <article className="stat-card accent-sand">
              <span>Dog profiles</span>
              <strong>{dogs.length}</strong>
              <p>Live records for feeding, health notes, and locality.</p>
            </article>
            <article className="stat-card accent-leaf">
              <span>Low stock items</span>
              <strong>{lowStockCount}</strong>
              <p>Items at or below threshold that need procurement attention.</p>
            </article>
            <article className="stat-card accent-coral">
              <span>Requested funds</span>
              <strong>Rs. {totalRequested.toLocaleString()}</strong>
              <p>Combined reimbursement needs currently open to volunteers.</p>
            </article>
            <article className="stat-card accent-sky">
              <span>Raised so far</span>
              <strong>Rs. {totalRaised.toLocaleString()}</strong>
              <p>Volunteer contributions already committed against open requests.</p>
            </article>
          </div>
        </section>

        <section id="dogs" className="section split-layout">
          <div className="section-heading">
            <p className="eyebrow">Dog Profiles</p>
            <h2>Add and monitor community dogs</h2>
          </div>

          <div className="panel form-panel">
            <h3>Create profile</h3>
            <form className="stack" onSubmit={handleDogSubmit}>
              <input
                required
                placeholder="Dog name"
                value={dogForm.name}
                onChange={(event) => setDogForm({ ...dogForm, name: event.target.value })}
              />
              <input
                required
                placeholder="Area / street"
                value={dogForm.area}
                onChange={(event) => setDogForm({ ...dogForm, area: event.target.value })}
              />
              <input
                required
                placeholder="Approximate age"
                value={dogForm.age}
                onChange={(event) => setDogForm({ ...dogForm, age: event.target.value })}
              />
              <textarea
                required
                placeholder="Health status"
                value={dogForm.health}
                onChange={(event) => setDogForm({ ...dogForm, health: event.target.value })}
              />
              <textarea
                required
                placeholder="Feeding notes"
                value={dogForm.feeding}
                onChange={(event) => setDogForm({ ...dogForm, feeding: event.target.value })}
              />
              <button type="submit" className="button button-primary">
                Save profile
              </button>
            </form>
          </div>

          <div className="card-grid">
            {dogs.map((dog) => (
              <article key={dog.id} className="panel dog-card">
                <div className="card-top">
                  <div>
                    <h3>{dog.name}</h3>
                    <p>{dog.area}</p>
                  </div>
                  <span className="tag">{dog.age}</span>
                </div>
                <p>
                  <strong>Health:</strong> {dog.health}
                </p>
                <p>
                  <strong>Feeding:</strong> {dog.feeding}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="inventory" className="section split-layout">
          <div className="section-heading">
            <p className="eyebrow">Food Procurement</p>
            <h2>Inventory controls for the admin team</h2>
          </div>

          <div className="panel form-panel">
            <h3>Add stock item</h3>
            <form className="stack" onSubmit={handleInventorySubmit}>
              <input
                required
                placeholder="Food item"
                value={inventoryForm.item}
                onChange={(event) => setInventoryForm({ ...inventoryForm, item: event.target.value })}
              />
              <div className="dual-field">
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="Quantity"
                  value={inventoryForm.quantity}
                  onChange={(event) =>
                    setInventoryForm({ ...inventoryForm, quantity: event.target.value })
                  }
                />
                <select
                  value={inventoryForm.unit}
                  onChange={(event) => setInventoryForm({ ...inventoryForm, unit: event.target.value })}
                >
                  <option value="bags">bags</option>
                  <option value="packs">packs</option>
                  <option value="kg">kg</option>
                  <option value="sacks">sacks</option>
                </select>
              </div>
              <input
                required
                type="number"
                min="0"
                placeholder="Procurement threshold"
                value={inventoryForm.threshold}
                onChange={(event) =>
                  setInventoryForm({ ...inventoryForm, threshold: event.target.value })
                }
              />
              <input
                required
                placeholder="Responsible admin / volunteer"
                value={inventoryForm.owner}
                onChange={(event) => setInventoryForm({ ...inventoryForm, owner: event.target.value })}
              />
              <button type="submit" className="button button-primary">
                Add inventory entry
              </button>
            </form>
          </div>

          <div className="list-panel">
            {inventory.map((entry) => {
              const needsRefill = entry.quantity <= entry.threshold

              return (
                <article key={entry.id} className="panel inventory-row">
                  <div>
                    <div className="card-top">
                      <h3>{entry.item}</h3>
                      <span className={needsRefill ? 'tag tag-alert' : 'tag tag-safe'}>
                        {needsRefill ? 'Refill needed' : 'Healthy stock'}
                      </span>
                    </div>
                    <p>
                      {entry.quantity} {entry.unit} available, threshold {entry.threshold} {entry.unit}
                    </p>
                    <p>Owner: {entry.owner}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="expenses" className="section split-layout">
          <div className="section-heading">
            <p className="eyebrow">Volunteer Contributions</p>
            <h2>Raise expenses and collect support transparently</h2>
          </div>

          <div className="panel form-panel">
            <h3>Raise an expense</h3>
            <form className="stack" onSubmit={handleExpenseSubmit}>
              <input
                required
                placeholder="Expense title"
                value={expenseForm.title}
                onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })}
              />
              <input
                required
                placeholder="Raised by"
                value={expenseForm.requester}
                onChange={(event) =>
                  setExpenseForm({ ...expenseForm, requester: event.target.value })
                }
              />
              <input
                required
                type="number"
                min="1"
                placeholder="Amount needed"
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
              />
              <textarea
                required
                placeholder="Reason for reimbursement or support"
                value={expenseForm.reason}
                onChange={(event) => setExpenseForm({ ...expenseForm, reason: event.target.value })}
              />
              <button type="submit" className="button button-primary">
                Publish expense request
              </button>
            </form>
          </div>

          <div className="card-grid">
            {expenses.map((expense) => {
              const progress = Math.round((expense.raised / expense.amount) * 100)

              return (
                <article key={expense.id} className="panel expense-card">
                  <div className="card-top">
                    <div>
                      <h3>{expense.title}</h3>
                      <p>Raised by {expense.requester}</p>
                    </div>
                    <span className="tag">
                      Rs. {expense.raised.toLocaleString()} / {expense.amount.toLocaleString()}
                    </span>
                  </div>
                  <p>{expense.reason}</p>
                  <div className="progress-track" aria-hidden="true">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p>{progress}% funded</p>
                  <div className="contribution-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => contributeToExpense(expense.id, 250)}
                    >
                      Contribute Rs. 250
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => contributeToExpense(expense.id, 500)}
                    >
                      Contribute Rs. 500
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
