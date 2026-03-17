import { ArrowUpRight, MapPin, PawPrint } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'

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
    badges.push({ label: 'Medical Attention', variant: 'danger' })
  }

  if (badges.length === 0) {
    badges.push({ label: formatLabel(dog.status), variant: 'outline' })
  }

  return (
    <Card className="group overflow-hidden rounded-[1.75rem] border-white/60 bg-white/90 transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary/50">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={dog.dog_name_or_temp_name || 'Dog profile'}
            className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-hero-wash text-primary">
            <PawPrint className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant} className="border border-white/30 bg-white/88 backdrop-blur-sm">
              {badge.label}
            </Badge>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="max-w-[85%] rounded-[1.25rem] border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
            <p className="text-lg font-semibold text-white">
              {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
            </p>
            <p className="mt-1 text-sm text-white/80">
              {area ? `${area.city} - ${area.name}` : 'Area unavailable'}
            </p>
          </div>
        </div>
      </div>
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-xl">
          {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {area ? `${area.city} - ${area.name}` : 'Area unavailable'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-accent" />
          <div className="space-y-1">
            <p>{dog.location_description || 'Location details will be added by volunteers.'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full justify-between" onClick={onViewDetails}>
          View Details
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
