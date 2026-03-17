import { useEffect, useState } from 'react'
import { HeartHandshake, PawPrint, ShieldCheck, Sparkles, Stethoscope, Wallet } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const heroImages = [
  '/landing/dog1.jpg',
  '/landing/dog2.jpg',
  '/landing/dog3.AVIF',
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

  useEffect(() => {
    let isMounted = true

    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/landing-metrics')
        const payload = await response.json()

        if (isMounted && response.ok && payload?.metrics) {
          setMetrics(payload.metrics)
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
      <section className="grid gap-6 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div className="flex flex-col justify-center gap-5">
          <Badge className="w-fit" variant="secondary">
            StreetDog App
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Community Care for Street Dogs
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              StreetDog App helps neighborhoods track dogs, organize care, share
              expenses, and coordinate volunteer support with a warm, easy-to-use
              workflow built for real community action.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => onNavigate('/report-dog')}>
              Report a Dog
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onNavigate('/dogs')}>
              Browse Dogs
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('/signin')}>
              Sign In
            </Button>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-soft">
              Guest-friendly dog reporting
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-soft">
              Volunteer-ready care workflows
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-soft">
              Built for trust and coordination
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-2 shadow-soft">
            <img
              src={heroImages[0]}
              alt="Street dog receiving community care"
              className="h-full min-h-[340px] w-full rounded-[1.35rem] object-cover"
            />
          </div>
          <div className="grid gap-4">
            {heroImages.slice(1).map((image, index) => (
              <div
                key={image}
                className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-2 shadow-soft"
              >
                <img
                  src={image}
                  alt={index === 0 ? 'Puppy portrait' : 'Street dog in the community'}
                  className="h-[160px] w-full rounded-[1.35rem] object-cover sm:h-[190px]"
                />
              </div>
            ))}
          </div>
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
        <Card className="rounded-2xl border-white/70 bg-white/90">
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

        <Card className="rounded-2xl border-white/70 bg-white/90">
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
