const taskStatusLabels = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export function TasksSection({ tasks, isSupabaseReady, isLoading }) {
  return (
    <section id="tasks" className="section">
      <div className="section-heading">
        <p className="eyebrow">Community Tasks</p>
        <h2>Operational follow-ups from Supabase</h2>
      </div>

      {!isSupabaseReady ? (
        <div className="panel empty-state">
          <h3>Supabase setup required</h3>
          <p>Tasks will appear here after you connect the project to your Supabase database.</p>
        </div>
      ) : null}

      {isSupabaseReady && isLoading ? (
        <div className="panel empty-state">
          <h3>Loading tasks</h3>
          <p>Pulling current community work items from Supabase.</p>
        </div>
      ) : null}

      {isSupabaseReady && !isLoading ? (
        <div className="card-grid task-grid">
          {tasks.map((task) => (
            <article key={task.id} className="panel task-card">
              <div className="card-top">
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.area || 'Community wide'}</p>
                </div>
                <span className="tag">{taskStatusLabels[task.status] ?? task.status}</span>
              </div>
              <p>{task.details || 'No task details added.'}</p>
              <p>
                <strong>Assignee:</strong> {task.assignee_name || 'Unassigned'}
              </p>
              <p>
                <strong>Priority:</strong> {task.priority}
              </p>
              <p>
                <strong>Due:</strong> {task.due_date || 'Not set'}
              </p>
            </article>
          ))}

          {tasks.length === 0 ? (
            <div className="panel empty-state">
              <h3>No tasks yet</h3>
              <p>Add tasks in Supabase and they will appear here automatically.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
