export function DogsSection({ dogs, dogForm, onFormChange, onSubmit }) {
  return (
    <section id="dogs" className="section split-layout">
      <div className="section-heading">
        <p className="eyebrow">Dog Profiles</p>
        <h2>Add and monitor community dogs</h2>
      </div>

      <div className="panel form-panel">
        <h3>Create profile</h3>
        <form className="stack" onSubmit={onSubmit}>
          <input
            required
            placeholder="Dog name"
            value={dogForm.name}
            onChange={(event) => onFormChange('name', event.target.value)}
          />
          <input
            required
            placeholder="Area / street"
            value={dogForm.area}
            onChange={(event) => onFormChange('area', event.target.value)}
          />
          <input
            required
            placeholder="Approximate age"
            value={dogForm.age}
            onChange={(event) => onFormChange('age', event.target.value)}
          />
          <textarea
            required
            placeholder="Health status"
            value={dogForm.health}
            onChange={(event) => onFormChange('health', event.target.value)}
          />
          <textarea
            required
            placeholder="Feeding notes"
            value={dogForm.feeding}
            onChange={(event) => onFormChange('feeding', event.target.value)}
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
  )
}
