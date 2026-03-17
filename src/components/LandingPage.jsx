import { useEffect, useState } from 'react'
import { HeartHandshake, MapPin, PawPrint, ShieldCheck, Sparkles, Stethoscope, Wallet } from 'lucide-react'
import { navigateTo } from '../lib/navigation'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { DogCard } from './DogCard'
import { HeroImageCarousel } from './HeroImageCarousel'

const heroImages = [
  {
    src: '/landing/dog1.jpg',
    alt: 'Street dog resting calmly in warm afternoon light',
  },
  {
    src: '/landing/dog2.jpg',
    alt: 'Puppy portrait with soft premium background',
  },
  {
    src: '/landing/dog3.AVIF',
    alt: 'Street dog looking toward nearby volunteers',
  },
]

const features = [
  {
    title: 'Track Dogs',
    copy: 'Create living dog profiles with sightings, vaccination status, and neighborhood updates.',
    icon: PawPrint,
  },
  {
    title: 'Share Expenses',
    copy: 'Raise care appeals and make it easier for nearby volunteers to contribute with trust.',
    icon: Wallet,
  },
  {
    title: 'Coordinate Supplies',
    copy: 'Manage food, medicine, and feeding support requests without losing area-level context.',
    icon: HeartHandshake,
  },
]

const steps = [
  'Report or add a dog from your area.',
  'Volunteers update health, location, and care details.',
  'Communities share expenses and supplies.',
  'StreetDog App keeps everyone aligned around the same dog record.',
]

export function LandingPage({ onNavigate }) {
  const [metrics, setMetrics] = useState({
    totalDogs: 0,
    vaccinatedDogs: 0,
    sterilizedDogs: 0,
    expensesRaised: 0,
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
                Premium community care for the dogs who already belong to your streets.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                StreetDog App helps neighborhoods report dogs, track care, share support, and keep
                local volunteers aligned around one warm, image-first community record.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="shadow-float" onClick={() => onNavigate('/report-dog')}>
                Report a Dog
              </Button>
              <Button size="lg" variant="secondary" className="shadow-soft" onClick={() => onNavigate('/dogs')}>
                Browse Dogs
              </Button>
              <Button size="lg" variant="outline" className="bg-white/75" onClick={() => onNavigate('/signin')}>
                Sign In
              </Button>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl bg-white/82 px-4 py-4 shadow-soft">
                Guest-friendly dog reporting
              </div>
              <div className="rounded-2xl bg-white/82 px-4 py-4 shadow-soft">
                Image-first volunteer coordination
              </div>
              <div className="rounded-2xl bg-white/82 px-4 py-4 shadow-soft">
                Warm, trusted neighborhood action
              </div>
            </div>
          </div>

          <HeroImageCarousel slides={heroImages} className="order-1 lg:order-2" />
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <Badge variant="outline">What the app does</Badge>
          <h2 className="text-3xl font-semibold tracking-tight">A calm, shared workspace for local dog care</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <Card key={feature.title} className="rounded-2xl border-white/70 bg-white/90">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">
                  {feature.copy}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline">Featured dogs</Badge>
            <h2 className="text-3xl font-semibold tracking-tight">Recent dogs from the community</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              A quick visual look at dogs recently added or updated in StreetDog App.
            </p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate('/dogs')}>
            Browse all dogs
          </Button>
        </div>

        {featuredDogs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredDogs.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                area={dog.area}
                onViewDetails={() => navigateTo(`/dogs/${dog.id}`)}
              />
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
          <Badge variant="outline">Impact</Badge>
          <h2 className="text-3xl font-semibold tracking-tight">A live snapshot of local effort</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total dogs', value: metrics.totalDogs },
            { label: 'Vaccinated dogs', value: metrics.vaccinatedDogs },
            { label: 'Sterilized dogs', value: metrics.sterilizedDogs },
            { label: 'Expenses raised', value: `Rs. ${Number(metrics.expensesRaised).toLocaleString()}` },
          ].map((metric) => (
            <Card key={metric.label} className="rounded-2xl border-white/70 bg-white/90">
              <CardContent className="space-y-2 p-6">
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden rounded-2xl border-white/70 bg-white/90">
          <CardHeader>
            <Badge variant="outline" className="w-fit">How it works</Badge>
            <CardTitle className="text-3xl">A clear 4-step volunteer flow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl bg-muted/70 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/70 bg-white/90">
          <CardHeader>
            <Badge variant="outline" className="w-fit">AI support</Badge>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <Sparkles className="h-6 w-6 text-accent" />
              AI-assisted dog review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3 rounded-2xl bg-secondary/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                AI can suggest age, gender, temperament, and visible features from a dog photo,
                while volunteers stay fully in control of every final field.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl bg-secondary/70 p-4">
              <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                Same-image analysis caching helps reduce repeated AI calls and supports duplicate
                review for repeated uploads of the same dog image.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="pb-8">
        <Card className="rounded-[2rem] border-white/70 bg-primary text-primary-foreground shadow-float">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
                Join the effort
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Help dogs in your area get seen, supported, and cared for.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-primary-foreground/80">
                Report a dog, browse community records, or sign in to coordinate care as a volunteer.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="lg" onClick={() => onNavigate('/report-dog')}>
                Report a Dog
              </Button>
              <Button variant="outline" size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => onNavigate('/signin')}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
