import { useEffect, useState } from 'react'
import { cn } from '../lib/utils'

export function HeroImageCarousel({ slides, intervalMs = 5000, className }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!slides?.length || slides.length < 2) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, slides])

  if (!slides?.length) {
    return null
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 shadow-float backdrop-blur-sm',
        className,
      )}
    >
      <div className="relative aspect-[4/5] min-h-[320px] w-full sm:aspect-[5/4] sm:min-h-[420px] lg:min-h-[540px]">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex

          return (
            <div
              key={slide.src}
              className={cn(
                'absolute inset-0 transition-all duration-[1800ms] ease-out',
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-[6000ms] ease-out',
                  isActive ? 'scale-[1.06]' : 'scale-100',
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-white/12" />
            </div>
          )
        })}

        <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-end sm:inset-x-5 sm:top-5">
          <div className="rounded-full border border-white/60 bg-white/55 px-3 py-2 backdrop-blur-md shadow-soft">
            <div className="pointer-events-auto flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  aria-label={`Show slide ${index + 1}`}
                  className={cn(
                    'h-2.5 rounded-full transition-all duration-500',
                    index === activeIndex ? 'w-8 bg-primary' : 'w-2.5 bg-primary/35',
                  )}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/65 bg-[linear-gradient(180deg,rgba(255,252,245,0.94),rgba(248,241,229,0.88))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {getSlideBadges(slides[activeIndex]).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-primary/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {slides[activeIndex].name}
              </p>
              <p className="text-sm text-muted-foreground">{slides[activeIndex].location}</p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {slides[activeIndex].summary}
          </p>
        </div>
      </div>
    </div>
  )
}

function getSlideBadges(slide) {
  return Array.isArray(slide?.badges) ? slide.badges : []
}
