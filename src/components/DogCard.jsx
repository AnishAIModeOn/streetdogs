import { ArrowUpRight, MapPin, PawPrint } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

function formatLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'Unknown'
}

export function DogCard({ dog, area, onViewDetails }) {
  const badges = []

  if (dog.vaccination_status === 'vaccinated') {
    badges.push({ label: 'Vaccinated', variant: 'success' })
  }

  if ((dog.health_notes || '').toLowerCase().includes('food')) {
    badges.push({ label: 'Needs Food', variant: 'warning' })
  }

  if ((dog.health_notes || '').toLowerCase().includes('medical')) {
    badges.push({ label: 'Medical', variant: 'danger' })
  }

  if (badges.length === 0) {
    badges.push({ label: formatLabel(dog.status), variant: 'outline' })
  }

  const dogName = dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`
  const areaLabel = area ? `${area.city} - ${area.name}` : 'Area unavailable'

  return (
    <div className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/95 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-secondary/40">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={dogName}
            className="h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-hero-wash">
            <PawPrint className="h-14 w-14 text-primary/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <Badge
              key={badge.label}
              variant={badge.variant}
              className="border border-white/30 bg-white/90 text-[0.7rem] shadow-sm backdrop-blur-sm"
            >
              {badge.label}
            </Badge>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="rounded-[1.1rem] border border-white/18 bg-black/30 px-3.5 py-2.5 backdrop-blur-md">
            <p className="text-[0.95rem] font-bold leading-tight text-white">{dogName}</p>
            <p className="mt-0.5 text-xs font-medium text-white/75">{areaLabel}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="line-clamp-2 leading-5">
            {dog.location_description || 'Location details will be added by volunteers.'}
          </p>
        </div>

        <Button
          variant="secondary"
          className="mt-auto w-full justify-between rounded-xl font-semibold"
          onClick={onViewDetails}
        >
          View Full Profile
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
