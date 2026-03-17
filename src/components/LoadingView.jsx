import { AuthShell } from './AuthShell'

export function LoadingView({ title, message }) {
  return (
    <AuthShell
      badge="StreetDog App"
      title={title}
      description={message}
      asideTitle="Preparing your workspace"
      asideCopy="We are loading the next step so the experience stays calm and predictable."
    >
      <div className="grid gap-3">
        <div className="h-11 animate-pulse rounded-2xl border border-border/70 bg-secondary/40" />
        <div className="h-11 animate-pulse rounded-2xl border border-border/70 bg-secondary/40" />
        <div className="h-28 animate-pulse rounded-[1.75rem] border border-border/70 bg-secondary/40" />
      </div>
    </AuthShell>
  )
}
