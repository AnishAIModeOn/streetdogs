import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

const variants = {
  default: {
    wrapper: 'border-border bg-muted/50 text-foreground',
    bar: 'bg-border',
    icon: Info,
    iconColor: 'text-muted-foreground',
  },
  warning: {
    wrapper: 'border-amber-200/80 bg-amber-50/80 text-amber-800',
    bar: 'bg-amber-400',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  error: {
    wrapper: 'border-red-200/80 bg-red-50/80 text-red-700',
    bar: 'bg-red-400',
    icon: XCircle,
    iconColor: 'text-red-400',
  },
  success: {
    wrapper: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700',
    bar: 'bg-emerald-400',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
}

export function Alert({ className, variant = 'default', children, ...props }) {
  const { wrapper, bar, icon: Icon, iconColor } = variants[variant] ?? variants.default

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-sm leading-6 shadow-sm',
        wrapper,
        className,
      )}
      {...props}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="flex-1 space-y-0.5">{children}</div>
    </div>
  )
}

export function AlertTitle({ className, ...props }) {
  return <p className={cn('font-semibold leading-snug', className)} {...props} />
}

export function AlertDescription({ className, ...props }) {
  return <p className={cn('text-[0.82rem] leading-5 opacity-85', className)} {...props} />
}
