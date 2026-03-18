import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({ className, side = 'right', children, ...props }) {
  const sideClasses = {
    left: 'left-0 top-0 h-full w-[88vw] max-w-sm rounded-r-3xl',
    right: 'right-0 top-0 h-full w-[88vw] max-w-sm rounded-l-3xl',
    bottom: 'bottom-0 left-0 w-full rounded-t-3xl',
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-md" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 border border-border bg-card/95 p-6 shadow-float backdrop-blur-xl',
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
