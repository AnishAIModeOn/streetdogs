import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

export function FormField({ className, ...props }) {
  return <div className={cn('grid gap-2', className)} {...props} />
}

export function FormLabel({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

export function FormDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function FormMessage({ className, ...props }) {
  return <p className={cn('text-sm font-medium text-destructive', className)} {...props} />
}
