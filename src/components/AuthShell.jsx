import { HeartHandshake, PawPrint, Star } from 'lucide-react'
import { Badge } from './ui/badge'

export function AuthShell({ badge, title, description, asideTitle, asideCopy, children, footer, hideFeatures = false }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 rounded-[2rem] border border-white/65 bg-hero-wash p-6 shadow-float lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: headline */}
        <div className="space-y-5">
          <Badge className="w-fit" variant="secondary">
            {badge}
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
              {description}
            </p>
          </div>

          {/* Feature highlights */}
          {!hideFeatures && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureTile
                icon={PawPrint}
                title="Simple, warm workflow"
                body="Forms stay approachable for volunteers and neighbors on mobile and desktop."
              />
              <FeatureTile
                icon={HeartHandshake}
                title="Built for community trust"
                body="Area-based records help people coordinate care without feeling overwhelmed."
              />
              <FeatureTile
                icon={Star}
                title="Care without accounts"
                body="Guests can report dogs without signing up — local volunteers take it from there."
              />
            </div>
          )}
        </div>

        {/* Right: form card */}
        <div className="rounded-[1.75rem] border border-white/65 bg-white/93 p-6 shadow-soft sm:p-7">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
              {asideTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{asideCopy}</p>
          </div>
          {children}
          {footer ? <div className="mt-5 pt-4 border-t border-border/40">{footer}</div> : null}
        </div>
      </section>
    </main>
  )
}

function FeatureTile({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-white/65 bg-white/80 p-4 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  )
}
