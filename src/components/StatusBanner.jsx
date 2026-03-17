import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../lib/utils'

const variants = {
  error: {
    wrapper: 'border-red-200 bg-red-50/90 text-red-700',
    icon: AlertCircle,
  },
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50/90 text-emerald-700',
    icon: CheckCircle2,
  },
  info: {
    wrapper: 'border-secondary bg-secondary/50 text-foreground',
    icon: Info,
  },
}

export function StatusBanner({ children, variant = 'info', className }) {
  const { wrapper, icon: Icon } = variants[variant]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6',
        wrapper,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
