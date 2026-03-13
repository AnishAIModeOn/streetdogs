export function DashboardSection({
  dogsCount,
  lowStockCount,
  totalRequested,
  totalRaised,
  activeAppealsCount,
  openTasksCount,
}) {
  return (
    <section id="dashboard" className="section">
      <div className="section-heading">
        <p className="eyebrow">Dashboard</p>
        <h2>Community snapshot</h2>
      </div>

      <div className="stats-grid stats-grid-wide">
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
          <span>Active appeals</span>
          <strong>{activeAppealsCount}</strong>
          <p>Donation requests currently open or awaiting final closure.</p>
        </article>
        <article className="stat-card accent-sky">
          <span>Requested funds</span>
          <strong>Rs. {totalRequested.toLocaleString()}</strong>
          <p>Combined reimbursement needs currently open to volunteers.</p>
        </article>
        <article className="stat-card accent-sand">
          <span>Raised so far</span>
          <strong>Rs. {totalRaised.toLocaleString()}</strong>
          <p>Contribution records synced from Supabase in real time.</p>
        </article>
        <article className="stat-card accent-leaf">
          <span>Open tasks</span>
          <strong>{openTasksCount}</strong>
          <p>Operational follow-ups still pending with volunteers or admins.</p>
        </article>
      </div>
    </section>
  )
}
