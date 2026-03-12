export function HeroSection({ dogsCount, totalFoodUnits, fundingProgress }) {
  return (
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
            <strong>{dogsCount}</strong>
          </div>
          <div className="pulse-row">
            <span>Food units in stock</span>
            <strong>{totalFoodUnits}</strong>
          </div>
          <div className="pulse-row">
            <span>Funding progress</span>
            <strong>{fundingProgress}%</strong>
          </div>
        </aside>
      </div>
    </header>
  )
}
