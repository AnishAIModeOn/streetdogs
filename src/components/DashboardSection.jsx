export function DashboardSection({
  dogsCount,
  lowStockCount,
  totalRequested,
  totalRaised,
}) {
  return (
    <section id="dashboard" className="section">
      <div className="section-heading">
        <p className="eyebrow">Dashboard</p>
        <h2>Community snapshot</h2>
      </div>

      <div className="stats-grid">
        <article className="stat-card accent-sand">
          <span>Dog profiles</span>
          <strong>{dogsCount}</strong>
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
  )
}
