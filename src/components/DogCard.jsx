import { ArrowUpRight, MapPin, PawPrint } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

function formatLabel(value) {
  return value ? value.replaceAll('_', ' ') : 'Unknown'
}

function buildDogDisplayLocation(dog) {
  return (
    dog.locality_name ||
    dog.tagged_area_neighbourhood ||
    dog.society_name ||
    dog.tagged_society_name ||
    'Location unavailable'
  )
}

export function DogCard({ dog, area: _area, onViewDetails, compact = false }) {
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
  const areaLabel = buildDogDisplayLocation(dog)
  const cardClassName = compact
    ? 'rounded-[1.4rem] shadow-soft duration-300'
    : 'rounded-[1.75rem] shadow-soft duration-500'
  const contentClassName = compact ? 'gap-2.5 p-3' : 'gap-3 p-4'
  const badgeClassName = compact ? 'text-[0.62rem]' : 'text-[0.7rem]'
  const imageNameClassName = compact ? 'text-[0.85rem]' : 'text-[0.95rem]'
  const imageLocationClassName = compact ? 'text-[0.7rem]' : 'text-xs'

  return (
    <div
      className={[
        'group flex h-full flex-col overflow-hidden border border-white/55 bg-white/95 transition-all hover:-translate-y-1 hover:shadow-float',
        cardClassName,
      ].join(' ')}
    >
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
              className={`border border-white/30 bg-white/90 shadow-sm backdrop-blur-sm ${badgeClassName}`}
            >
              {badge.label}
            </Badge>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="rounded-[1.1rem] border border-white/18 bg-black/30 px-3.5 py-2.5 backdrop-blur-md">
            <p className={`font-bold leading-tight text-white ${imageNameClassName}`}>{dogName}</p>
            <p className={`mt-0.5 font-medium text-white/75 ${imageLocationClassName}`}>{areaLabel}</p>
          </div>
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${contentClassName}`}>
        <div className={`flex items-start gap-2 text-muted-foreground ${compact ? 'text-[0.78rem]' : 'text-sm'}`}>
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="line-clamp-2 leading-5">
            {dog.location_description || 'Location details will be added by volunteers.'}
          </p>
        </div>

        <Button
          variant="secondary"
          className={`mt-auto w-full justify-between rounded-xl font-semibold ${compact ? 'h-10 px-3 text-[0.78rem]' : ''}`}
          onClick={onViewDetails}
        >
          View Full Profile
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
