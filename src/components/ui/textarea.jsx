import { cn } from '../../lib/utils'

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'flex min-h-[120px] w-full rounded-2xl border border-input bg-white/90 px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
