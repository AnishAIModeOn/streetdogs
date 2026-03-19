import { Loader2, MapPin } from 'lucide-react'
import { SocietyPicker } from './SocietyPicker'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'

export function AreaSocietyFields({
  flow,
  deferSocietyCreate = false,
  cardTitle = 'Area and society',
  cardCopy = 'Use your location or type your neighbourhood so StreetDog App can route this dog to the right community.',
}) {
  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="text-sm leading-6 text-muted-foreground">{cardCopy}</p>

        <FormField>
          <FormLabel className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Area
          </FormLabel>

          {flow.detecting ? (
            <div className="flex h-11 items-center gap-2.5 rounded-2xl border border-input bg-secondary/30 px-4 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Detecting your location…
            </div>
          ) : null}

          {!flow.detecting && !flow.manual && flow.detectedLabel ? (
            <>
              <div className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="flex-1 font-medium text-emerald-800">{flow.detectedLabel}</span>
              </div>
              <FormDescription>
                Auto-detected ·{' '}
                <button
                  type="button"
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                  onClick={() => flow.setManual()}
                >
                  not your area?
                </button>
              </FormDescription>
            </>
          ) : null}

          {!flow.detecting && (flow.manual || !flow.detectedLabel) ? (
            <div className="relative">
              <Input
                placeholder="e.g. Bellandur, Koramangala, Baner…"
                value={flow.areaInput}
                onChange={(event) => flow.setAreaInput(event.target.value)}
                onFocus={() => flow.setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => flow.setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {flow.isFetchingSuggestions ? (
                <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
              {flow.showSuggestions && flow.areaSuggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
                  {flow.areaSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.neighbourhood}-${suggestion.pincode || index}`}
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/40"
                      onMouseDown={() => flow.selectSuggestion(suggestion)}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{suggestion.neighbourhood || suggestion.pincode}</span>
                      {suggestion.pincode && suggestion.neighbourhood ? (
                        <span className="text-xs text-muted-foreground">{suggestion.pincode}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              <FormDescription>
                Type your neighbourhood to find matching societies nearby.
              </FormDescription>
            </div>
          ) : null}
        </FormField>

        <div className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-4">
          <SocietyPicker
            pincode={flow.areaContext.pincode}
            neighbourhood={flow.areaContext.neighbourhood}
            onSelect={flow.setSelectedSociety}
            deferCreate={deferSocietyCreate}
          />
        </div>
      </CardContent>
    </Card>
  )
}
