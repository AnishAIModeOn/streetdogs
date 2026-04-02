import { ArrowRight, PawPrint } from 'lucide-react'
import { navigateTo } from '../lib/navigation'
import { DogCard } from './DogCard'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export function RecentDogs({ dogs, areaMap }) {
  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/95 shadow-soft">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary/80">
              Recent dogs
            </p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent dogs</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-auto rounded-full px-0 py-0 text-sm font-semibold text-primary hover:bg-transparent"
            onClick={() => navigateTo('/dogs')}
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {dogs.length ? (
          <div className="grid grid-cols-2 gap-3">
            {dogs.map((dog) => (
              <div key={dog.id}>
                <DogCard
                  dog={dog}
                  area={areaMap?.[dog.area_id]}
                  compact
                  onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[1.35rem] border border-dashed border-border bg-secondary/16 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft">
              <PawPrint className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No recent dogs yet</p>
              <p className="text-sm text-muted-foreground">
                Add the first dog in this area to start the feed.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
