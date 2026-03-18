import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../lib/utils'

const variants = {
  error: {
    wrapper: 'border-red-200/80 bg-red-50/90 text-red-700',
    leftBar: 'bg-red-400',
    icon: AlertCircle,
    iconColor: 'text-red-400',
  },
  success: {
    wrapper: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700',
    leftBar: 'bg-emerald-400',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  info: {
    wrapper: 'border-secondary bg-secondary/50 text-foreground',
    leftBar: 'bg-accent',
    icon: Info,
    iconColor: 'text-accent',
  },
}

export function StatusBanner({ children, variant = 'info', className }) {
  const { wrapper, leftBar, icon: Icon, iconColor } = variants[variant]

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-2xl border py-3.5 pl-4 pr-5 text-sm leading-6 shadow-sm',
        wrapper,
        className,
      )}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 ${leftBar}`} />
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <p>{children}</p>
    </div>
  )
}
