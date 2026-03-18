import { cn } from '../../lib/utils'

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-2xl bg-secondary/55', className)}
      {...props}
    />
  )
}
