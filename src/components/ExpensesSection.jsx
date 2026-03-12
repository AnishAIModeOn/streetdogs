export function ExpensesSection({
  expenses,
  expenseForm,
  onFormChange,
  onSubmit,
  onContribute,
}) {
  return (
    <section id="expenses" className="section split-layout">
      <div className="section-heading">
        <p className="eyebrow">Volunteer Contributions</p>
        <h2>Raise expenses and collect support transparently</h2>
      </div>

      <div className="panel form-panel">
        <h3>Raise an expense</h3>
        <form className="stack" onSubmit={onSubmit}>
          <input
            required
            placeholder="Expense title"
            value={expenseForm.title}
            onChange={(event) => onFormChange('title', event.target.value)}
          />
          <input
            required
            placeholder="Raised by"
            value={expenseForm.requester}
            onChange={(event) => onFormChange('requester', event.target.value)}
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Amount needed"
            value={expenseForm.amount}
            onChange={(event) => onFormChange('amount', event.target.value)}
          />
          <textarea
            required
            placeholder="Reason for reimbursement or support"
            value={expenseForm.reason}
            onChange={(event) => onFormChange('reason', event.target.value)}
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
                  onClick={() => onContribute(expense.id, 250)}
                >
                  Contribute Rs. 250
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onContribute(expense.id, 500)}
                >
                  Contribute Rs. 500
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
