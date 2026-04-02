import { navigateTo } from '../lib/navigation'
import { Card, CardContent } from './ui/card'

export function UrgentNeeds({ items }) {
  const visibleItems = items.filter((item) => item.count > 0)

  if (!visibleItems.length) {
    return null
  }

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,248,242,0.98),rgba(255,255,255,0.94))] shadow-soft">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary/80">
            Urgent needs
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Urgent needs</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {visibleItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigateTo(item.path)}
                className={[
                  'flex min-h-[104px] flex-col justify-between rounded-[1.2rem] border border-white/80 p-3 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float',
                  item.tone,
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={[
                      'flex h-10 w-10 items-center justify-center rounded-2xl',
                      item.iconClassName,
                    ].join(' ')}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-2xl font-extrabold tracking-tight text-foreground">{item.count}</span>
                </div>
                <span className="text-sm font-semibold leading-5 text-foreground">{item.label}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
