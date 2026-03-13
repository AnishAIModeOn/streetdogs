const appealStatuses = ['open', 'funded', 'closed']
const contributionStatuses = ['pledged', 'received', 'cancelled']

export function ExpensesSection({
  appeals,
  appealForm,
  contributionForm,
  contributionsByAppeal,
  statusMessage,
  onAppealFormChange,
  onContributionFormChange,
  onAppealSubmit,
  onContributionSubmit,
  onAppealStatusChange,
  onContributionStatusChange,
  isSupabaseReady,
  isLoading,
}) {
  return (
    <section id="expenses" className="section split-layout expenses-layout">
      <div className="section-heading">
        <p className="eyebrow">Volunteer Contributions</p>
        <h2>Raise donation appeals and track contributions from Supabase</h2>
      </div>

      <div className="stack">
        <div className="panel form-panel">
          <h3>Create donation appeal</h3>
          <form className="stack" onSubmit={onAppealSubmit}>
            <input
              required
              placeholder="Appeal title"
              value={appealForm.title}
              onChange={(event) => onAppealFormChange('title', event.target.value)}
            />
            <input
              required
              placeholder="Requester name"
              value={appealForm.requester_name}
              onChange={(event) => onAppealFormChange('requester_name', event.target.value)}
            />
            <input
              type="email"
              placeholder="Requester email"
              value={appealForm.requester_email}
              onChange={(event) => onAppealFormChange('requester_email', event.target.value)}
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Amount needed"
              value={appealForm.amount_needed}
              onChange={(event) => onAppealFormChange('amount_needed', event.target.value)}
            />
            <textarea
              required
              placeholder="Reason for support"
              value={appealForm.reason}
              onChange={(event) => onAppealFormChange('reason', event.target.value)}
            />
            <button type="submit" className="button button-primary" disabled={!isSupabaseReady}>
              Save appeal
            </button>
          </form>
        </div>

        <div className="panel form-panel">
          <h3>Create contribution</h3>
          <form className="stack" onSubmit={onContributionSubmit}>
            <select
              required
              value={contributionForm.appeal_id}
              onChange={(event) => onContributionFormChange('appeal_id', event.target.value)}
            >
              <option value="">Select an appeal</option>
              {appeals.map((appeal) => (
                <option key={appeal.id} value={appeal.id}>
                  {appeal.title}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Contributor name"
              value={contributionForm.contributor_name}
              onChange={(event) => onContributionFormChange('contributor_name', event.target.value)}
            />
            <input
              type="email"
              placeholder="Contributor email"
              value={contributionForm.contributor_email}
              onChange={(event) => onContributionFormChange('contributor_email', event.target.value)}
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Contribution amount"
              value={contributionForm.amount}
              onChange={(event) => onContributionFormChange('amount', event.target.value)}
            />
            <select
              value={contributionForm.status}
              onChange={(event) => onContributionFormChange('status', event.target.value)}
            >
              {contributionStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Notes"
              value={contributionForm.notes}
              onChange={(event) => onContributionFormChange('notes', event.target.value)}
            />
            <button type="submit" className="button button-secondary" disabled={!isSupabaseReady}>
              Save contribution
            </button>
          </form>
        </div>

        {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}
      </div>

      <div className="card-grid">
        {!isSupabaseReady ? (
          <div className="panel empty-state">
            <h3>Supabase setup required</h3>
            <p>
              Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values to
              enable appeals, contributions, and task syncing.
            </p>
          </div>
        ) : null}

        {isSupabaseReady && isLoading ? (
          <div className="panel empty-state">
            <h3>Loading live community data</h3>
            <p>Fetching donation appeals, contributions, and tasks from Supabase.</p>
          </div>
        ) : null}

        {isSupabaseReady &&
          !isLoading &&
          appeals.map((appeal) => {
            const appealContributions = contributionsByAppeal[appeal.id] ?? []
            const raised = appealContributions.reduce(
              (sum, contribution) => sum + Number(contribution.amount),
              0,
            )
            const progress = Math.round((raised / Number(appeal.amount_needed)) * 100) || 0

            return (
              <article key={appeal.id} className="panel expense-card">
                <div className="card-top">
                  <div>
                    <h3>{appeal.title}</h3>
                    <p>Raised by {appeal.requester_name}</p>
                  </div>
                  <span className="tag">
                    Rs. {raised.toLocaleString()} / {Number(appeal.amount_needed).toLocaleString()}
                  </span>
                </div>
                <p>{appeal.reason}</p>
                <div className="field-row compact-row">
                  <label className="field-label" htmlFor={`appeal-status-${appeal.id}`}>
                    Appeal status
                  </label>
                  <select
                    id={`appeal-status-${appeal.id}`}
                    value={appeal.status}
                    onChange={(event) => onAppealStatusChange(appeal.id, event.target.value)}
                  >
                    {appealStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="progress-track" aria-hidden="true">
                  <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <p>{Math.min(progress, 100)}% funded</p>

                <div className="subsection">
                  <h4>Contributions</h4>
                  {appealContributions.length === 0 ? (
                    <p>No contributions recorded yet.</p>
                  ) : (
                    <div className="stack contribution-list">
                      {appealContributions.map((contribution) => (
                        <div key={contribution.id} className="sub-card">
                          <div className="card-top">
                            <strong>{contribution.contributor_name}</strong>
                            <span className="tag">
                              Rs. {Number(contribution.amount).toLocaleString()}
                            </span>
                          </div>
                          <p>{contribution.notes || 'No notes added.'}</p>
                          <div className="field-row compact-row">
                            <label
                              className="field-label"
                              htmlFor={`contribution-status-${contribution.id}`}
                            >
                              Contribution status
                            </label>
                            <select
                              id={`contribution-status-${contribution.id}`}
                              value={contribution.status}
                              onChange={(event) =>
                                onContributionStatusChange(contribution.id, event.target.value)
                              }
                            >
                              {contributionStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            )
          })}

        {isSupabaseReady && !isLoading && appeals.length === 0 ? (
          <div className="panel empty-state">
            <h3>No donation appeals yet</h3>
            <p>Create the first appeal once your Supabase tables are ready.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
