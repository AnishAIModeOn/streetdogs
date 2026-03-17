import { HeartHandshake, PawPrint } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

export function AuthShell({ badge, title, description, asideTitle, asideCopy, children, footer }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 rounded-[2rem] border border-white/70 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            {badge}
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/85 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PawPrint className="h-4 w-4 text-accent" />
                Warm, simple workflow
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                StreetDog App keeps forms approachable for volunteers and neighbors on mobile.
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HeartHandshake className="h-4 w-4 text-accent" />
                Built for community trust
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Clear area-based records help people coordinate care without feeling overwhelmed.
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/90">
          <CardContent className="space-y-5 p-6 sm:p-7">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
                {asideTitle}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{asideCopy}</p>
            </div>
            {children}
            {footer ? <div className="pt-1">{footer}</div> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
