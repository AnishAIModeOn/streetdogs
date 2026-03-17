import { useEffect, useState } from 'react'
import { ArrowRight, MapPin, PawPrint } from 'lucide-react'
import { navigateTo } from '../lib/navigation'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { HeroImageCarousel } from './HeroImageCarousel'

const heroImages = [
  {
    src: '/landing/dog1.jpg',
    alt: 'Street dog resting calmly in warm afternoon light',
    name: 'Milo',
    location: 'Bandra West, Mumbai',
    summary: 'A gentle street dog watched over by neighbors and feeders in the area.',
    badges: ['Vaccinated', 'Friendly'],
  },
  {
    src: '/landing/dog2.jpg',
    alt: 'Puppy portrait with soft premium background',
    name: 'Luna',
    location: 'Koramangala, Bengaluru',
    summary: 'A recently spotted puppy who needs visibility, food support, and local follow-up.',
    badges: ['Needs Food'],
  },
  {
    src: '/landing/dog3.AVIF',
    alt: 'Street dog looking toward nearby volunteers',
    name: 'Rocky',
    location: 'Adyar, Chennai',
    summary: 'Shared sightings and medical notes help volunteers respond with confidence.',
    badges: ['Medical Attention'],
  },
]

export function LandingPage({ onNavigate }) {
  const [metrics, setMetrics] = useState({
    totalDogs: 0,
    vaccinatedDogs: 0,
    expensesRaised: 0,
    inventoryFulfilled: 0,
  })
  const [featuredDogs, setFeaturedDogs] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/landing-metrics')
        const payload = await response.json()

        if (isMounted && response.ok && payload?.metrics) {
          setMetrics(payload.metrics)
          setFeaturedDogs(payload.featuredDogs ?? [])
        }
      } catch {
        // Leave fallback values if metrics fail.
      }
    }

    loadMetrics()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-hero-wash p-4 shadow-float sm:p-6 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_70%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="order-2 flex flex-col justify-center gap-5 lg:order-1">
            <Badge className="w-fit bg-white/85 text-primary shadow-soft" variant="secondary">
              StreetDog App
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                StreetDog App 🐶
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                A warm, community-first space to report, track, and support street dogs through
                local sightings, care updates, and shared neighborhood action.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="shadow-float" onClick={() => onNavigate('/report-dog')}>
                Report a Dog
              </Button>
              <Button size="lg" variant="secondary" className="shadow-soft" onClick={() => onNavigate('/dogs')}>
                Browse Dogs
              </Button>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-2xl bg-white/82 px-4 py-4 shadow-soft">
                Report dogs quickly without a complicated flow.
              </div>
              <div className="rounded-2xl bg-white/82 px-4 py-4 shadow-soft">
                Help volunteers spot who needs care, food, or treatment.
              </div>
            </div>
          </div>

          <HeroImageCarousel slides={heroImages} className="order-1 lg:order-2" />
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline">Recently added dogs</Badge>
            <h2 className="text-3xl font-semibold tracking-tight">Dogs your community just shared</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              A lightweight horizontal feed inspired by modern pet social apps, built to feel good
              on mobile first.
            </p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate('/dogs')}>
            Browse Dogs
          </Button>
        </div>

        {featuredDogs.length ? (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {featuredDogs.map((dog) => (
              <button
                key={dog.id}
                type="button"
                className="group min-w-[270px] flex-1 text-left sm:min-w-[300px]"
                onClick={() => navigateTo(`/dogs/${dog.id}`)}
              >
                <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-white/90 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
                  <div className="relative aspect-[1.05] overflow-hidden bg-secondary/40">
                    {dog.photo_url ? (
                      <img
                        src={dog.photo_url}
                        alt={dog.dog_name_or_temp_name || 'Dog profile'}
                        className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-hero-wash text-primary">
                        <PawPrint className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="rounded-[1.25rem] border border-white/20 bg-black/20 p-4 backdrop-blur-md">
                        <p className="text-lg font-semibold text-white">
                          {dog.dog_name_or_temp_name || `Dog ${dog.id.slice(0, 6)}`}
                        </p>
                        <p className="mt-1 text-sm text-white/80">
                          {dog.area ? `${dog.area.city} - ${dog.area.name}` : 'Area unavailable'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-2">
                      {getDogBadges(dog).map((badge) => (
                        <Badge key={badge.label} variant={badge.variant}>
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {dog.location_description || 'Location details will be added by volunteers.'}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      View details
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        ) : (
          <Card className="rounded-[2rem] border-dashed border-border bg-white/80">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary shadow-soft">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold">Featured dogs will appear here</h3>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                As soon as community dog records with photos are available, this section will turn
                into an image-first feed.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <Badge variant="outline">Community impact</Badge>
          <h2 className="text-3xl font-semibold tracking-tight">A quick snapshot of local care</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total dogs', value: metrics.totalDogs },
            { label: 'Vaccinated', value: metrics.vaccinatedDogs },
            { label: 'Expenses raised', value: `Rs. ${Number(metrics.expensesRaised).toLocaleString()}` },
            { label: 'Inventory fulfilled', value: metrics.inventoryFulfilled },
          ].map((metric) => (
            <Card key={metric.label} className="rounded-2xl border-white/70 bg-white/90 shadow-lg">
              <CardContent className="space-y-2 p-5">
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-8">
        <Card className="rounded-[2rem] border-white/70 bg-primary text-primary-foreground shadow-float">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
                Join the community
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">See a dog that needs help?</h2>
              <p className="max-w-2xl text-sm leading-6 text-primary-foreground/80">
                Report a dog in your area and help nearby volunteers respond faster with the right
                local context.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="lg" onClick={() => onNavigate('/report-dog')}>
                Report a Dog
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function getDogBadges(dog) {
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

  return badges.length ? badges : [{ label: 'Community record', variant: 'outline' }]
}
