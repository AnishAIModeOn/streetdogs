const inventoryUnits = ['bags', 'packs', 'kg', 'sacks']

export function InventorySection({ inventory, inventoryForm, onFormChange, onSubmit }) {
  return (
    <section id="inventory" className="section split-layout">
      <div className="section-heading">
        <p className="eyebrow">Food Procurement</p>
        <h2>Inventory controls for the admin team</h2>
      </div>

      <div className="panel form-panel">
        <h3>Add stock item</h3>
        <form className="stack" onSubmit={onSubmit}>
          <input
            required
            placeholder="Food item"
            value={inventoryForm.item}
            onChange={(event) => onFormChange('item', event.target.value)}
          />
          <div className="dual-field">
            <input
              required
              type="number"
              min="0"
              placeholder="Quantity"
              value={inventoryForm.quantity}
              onChange={(event) => onFormChange('quantity', event.target.value)}
            />
            <select
              value={inventoryForm.unit}
              onChange={(event) => onFormChange('unit', event.target.value)}
            >
              {inventoryUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <input
            required
            type="number"
            min="0"
            placeholder="Procurement threshold"
            value={inventoryForm.threshold}
            onChange={(event) => onFormChange('threshold', event.target.value)}
          />
          <input
            required
            placeholder="Responsible admin / volunteer"
            value={inventoryForm.owner}
            onChange={(event) => onFormChange('owner', event.target.value)}
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
  )
}
