import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border !border-border !bg-card !text-card-foreground !shadow-soft',
          title: '!text-sm !font-semibold',
          description: '!text-sm !text-muted-foreground',
        },
      }}
    />
  )
}
