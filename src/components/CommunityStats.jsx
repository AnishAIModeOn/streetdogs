import { Card, CardContent } from './ui/card'

export function CommunityStats({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <Card
            key={stat.label}
            className="rounded-[1.4rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,243,235,0.95))] shadow-soft"
          >
            <CardContent className="flex min-h-[118px] flex-col justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/50 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
              <p className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
