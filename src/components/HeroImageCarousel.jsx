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
        'relative overflow-hidden rounded-[2rem] border border-white/25 bg-secondary/30 shadow-float',
        className,
      )}
    >
      <div className="relative aspect-[0.88] min-h-[420px] w-full sm:aspect-[1.05] lg:min-h-[560px]">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-white/10" />
            </div>
          )
        })}

        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div className="max-w-sm rounded-[1.6rem] border border-white/20 bg-black/20 p-4 backdrop-blur-md shadow-float">
            <div className="flex flex-wrap gap-2">
              {getSlideBadges(slides[activeIndex]).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
                >
                  {badge}
                </span>
              ))}
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{slides[activeIndex].name}</p>
            <p className="mt-1 text-sm text-white/80">{slides[activeIndex].location}</p>
            <p className="mt-3 text-sm leading-6 text-white/88">{slides[activeIndex].summary}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-2 backdrop-blur-md">
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`Show slide ${index + 1}`}
                className={cn(
                  'h-2.5 rounded-full transition-all duration-500',
                  index === activeIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/45',
                )}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getSlideBadges(slide) {
  return Array.isArray(slide?.badges) ? slide.badges : []
}
