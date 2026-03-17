import { MapPin, PawPrint } from 'lucide-react'
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
    <Card className="overflow-hidden rounded-2xl border-white/70 bg-white/90">
      <div className="aspect-[4/3] bg-secondary/50">
        {dog.photo_url ? (
          <img src={dog.photo_url} alt={dog.dog_name_or_temp_name || 'Dog profile'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-hero-wash text-primary">
            <PawPrint className="h-12 w-12" />
          </div>
        )}
      </div>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant}>
              {badge.label}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-xl">
          {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-accent" />
          <div className="space-y-1">
            <p>{dog.location_description || 'Location details will be added by volunteers.'}</p>
            <p className="font-medium text-foreground">
              {area ? `${area.city} - ${area.name}` : 'Area unavailable'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full" onClick={onViewDetails}>
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
