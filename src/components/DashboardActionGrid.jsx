import { Heart, HeartHandshake, PawPrint, Wallet } from 'lucide-react'
import { navigateTo } from '../lib/navigation'
import { Card, CardContent } from './ui/card'

const actions = [
  {
    label: 'Report Dog',
    icon: PawPrint,
    path: '/report-dog',
    className:
      'border-primary/15 bg-[linear-gradient(180deg,rgba(244,176,93,0.18),rgba(255,255,255,0.96))] text-foreground',
    iconClassName: 'bg-primary text-primary-foreground shadow-soft',
  },
  {
    label: 'Raise Expense',
    icon: Wallet,
    path: '/dogs',
    className:
      'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,244,236,0.96))] text-foreground',
    iconClassName: 'bg-secondary/70 text-primary',
  },
  {
    label: 'Contribute',
    icon: HeartHandshake,
    path: '/inventory',
    className:
      'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,230,0.96))] text-foreground',
    iconClassName: 'bg-secondary/70 text-primary',
  },
  {
    label: 'Adopt / Help',
    icon: Heart,
    path: '/dogs',
    className:
      'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,243,235,0.96))] text-foreground',
    iconClassName: 'bg-secondary/70 text-primary',
  },
]

export function DashboardActionGrid() {
  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(255,255,255,0.95))] shadow-soft">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-primary/80">
            Quick actions
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">What do you want to do?</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {actions.map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.label}
                type="button"
                onClick={() => navigateTo(action.path)}
                className={[
                  'flex aspect-square w-full flex-col justify-between gap-3 rounded-2xl border p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0 active:scale-[0.98]',
                  action.className,
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-2xl',
                    action.iconClassName,
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold leading-5 text-foreground sm:text-[0.95rem]">
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
