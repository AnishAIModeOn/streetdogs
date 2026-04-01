import { Clock3, Image as ImageIcon, ShieldAlert } from 'lucide-react'
import { SocietyPicker } from './SocietyPicker'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export function DogFilters({
  areaLabel,
  pincode,
  neighbourhood,
  selectedSociety,
  onSocietyChange,
  statusFilter,
  onStatusFilterChange,
  toggles,
  onToggleChange,
}) {
  const toggleItems = [
    { key: 'recent', label: 'Recently added', icon: Clock3 },
    { key: 'needsHelp', label: 'Needs help', icon: ShieldAlert },
    { key: 'withPhoto', label: 'With photo', icon: ImageIcon },
  ]

  return (
    <div className="grid gap-3 rounded-[1.75rem] border border-white/70 bg-white/92 p-4 shadow-soft">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">Filters</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full bg-secondary/45 px-3 py-1 text-xs text-foreground">
            Area: {areaLabel || 'Select area'}
          </Badge>
          {selectedSociety?.name ? (
            <Badge variant="secondary" className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
              Society: {selectedSociety.name}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.25rem] border border-white/75 bg-secondary/15 px-3 py-2">
          <SocietyPicker
            pincode={pincode}
            neighbourhood={neighbourhood}
            onSelect={onSocietyChange}
            draftName={selectedSociety?.name && selectedSociety._pending ? selectedSociety.name : ''}
            onDraftChange={() => {}}
          />
        </div>

        <div className="space-y-2 rounded-[1.25rem] border border-white/75 bg-secondary/15 p-3">
          <p className="text-sm font-semibold text-foreground">Status</p>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="bg-white/90">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="vaccinated">Vaccinated</SelectItem>
              <SelectItem value="neutered">Neutered</SelectItem>
              <SelectItem value="injured">Injured</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {toggleItems.map((item) => {
          const Icon = item.icon
          const isActive = Boolean(toggles[item.key])

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleChange(item.key, !isActive)}
              className={[
                'flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'border-primary/20 bg-primary text-primary-foreground shadow-soft'
                  : 'border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,233,0.96))] text-foreground hover:-translate-y-0.5 hover:shadow-soft',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
