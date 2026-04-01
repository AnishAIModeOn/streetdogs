import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, MapPin } from 'lucide-react'
import { SocietyPicker } from './SocietyPicker'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { FormDescription, FormField, FormLabel } from './ui/form'
import { Input } from './ui/input'
import { normalizeAreaLabel, useAreaSocietyFlow } from '../hooks/use-area-society-flow'

export function AreaSocietyFields({
  flow,
  deferSocietyCreate = false,
  cardTitle = 'Area and society',
  cardCopy = 'Use your location or type your neighbourhood so StreetDog App can route this dog to the right community.',
  compact = false,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const draftFlow = useAreaSocietyFlow({
    initialAreaLabel: flow.areaInput || flow.areaLabel || '',
    initialPincode: flow.pincode || '',
    initialSociety: flow.selectedSociety ?? null,
    autoDetect: false,
  })
  const areaLabel = useMemo(
    () => normalizeAreaLabel(flow.areaContext.neighbourhood || flow.areaLabel) || 'Select area',
    [flow.areaContext.neighbourhood, flow.areaLabel],
  )
  const societyLabel = flow.selectedSociety?.name || 'No society'

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    draftFlow.applySnapshot({
      areaInput: flow.areaInput,
      pincode: flow.pincode,
      selectedSociety: flow.selectedSociety,
      manual: flow.manual,
      detectedLabel: flow.detectedLabel,
      detectedNeighbourhood: flow.effectiveNeighbourhood,
      societyDraftName: flow.societyDraftName,
    })
  }, [
    draftFlow,
    flow.areaInput,
    flow.detectedLabel,
    flow.effectiveNeighbourhood,
    flow.manual,
    flow.pincode,
    flow.selectedSociety,
    flow.societyDraftName,
    isModalOpen,
  ])

  if (compact) {
    return (
      <>
        <FormField className="gap-2">
          <FormLabel>Location</FormLabel>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-white/75 bg-white/92 px-3 py-2 text-left shadow-soft transition-colors hover:bg-white"
          >
            <span className="min-w-0 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-primary/80" />
              <span className="min-w-0 truncate font-medium text-foreground">
                {areaLabel}
                <span className="mx-1.5 text-muted-foreground">•</span>
                <span className="font-normal text-muted-foreground">{societyLabel}</span>
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </FormField>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="inset-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border sm:p-0">
            <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(251,247,238,0.98),rgba(255,255,255,0.98))] sm:max-h-[90vh] sm:rounded-[2rem]">
              <DialogHeader className="border-b border-white/70 px-4 pb-4 pt-6 pr-14 sm:px-6">
                <DialogTitle>{cardTitle}</DialogTitle>
                <DialogDescription>Choose the area and optional society for this report.</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-6 sm:pb-24">
                <div className="space-y-4">
                  <FormField>
                    <FormLabel className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Area
                    </FormLabel>

                    {draftFlow.detecting ? (
                      <div className="flex h-11 items-center gap-2.5 rounded-2xl border border-input bg-secondary/30 px-4 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Detecting your location...
                      </div>
                    ) : null}

                    {!draftFlow.detecting && !draftFlow.manual && draftFlow.detectedLabel ? (
                      <>
                        <div className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 text-sm">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="flex-1 font-medium text-emerald-800">{draftFlow.detectedLabel}</span>
                        </div>
                        <FormDescription>
                          Auto-detected ·{' '}
                          <button
                            type="button"
                            className="underline underline-offset-2 transition-colors hover:text-foreground"
                            onClick={() => draftFlow.setManual()}
                          >
                            not your area?
                          </button>
                        </FormDescription>
                      </>
                    ) : null}

                    {!draftFlow.detecting && (draftFlow.manual || !draftFlow.detectedLabel) ? (
                      <div className="relative min-w-0">
                        <Input
                          placeholder="e.g. Bellandur, Koramangala, Baner..."
                          value={draftFlow.areaInput}
                          onChange={(event) => draftFlow.setAreaInput(event.target.value)}
                          onFocus={() => draftFlow.setShowSuggestions(true)}
                          onBlur={() => window.setTimeout(() => draftFlow.setShowSuggestions(false), 150)}
                          autoComplete="off"
                        />
                        {draftFlow.isFetchingSuggestions ? (
                          <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        ) : null}
                        {draftFlow.showSuggestions && draftFlow.areaSuggestions.length > 0 ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
                            {draftFlow.areaSuggestions.map((suggestion, index) => (
                              <button
                                key={`${suggestion.neighbourhood}-${suggestion.pincode || index}`}
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/40"
                                onMouseDown={() => draftFlow.selectSuggestion(suggestion)}
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
                      </div>
                    ) : null}
                  </FormField>

                  <div className="relative z-10 min-w-0 overflow-visible rounded-[1.5rem] border border-border/60 bg-secondary/20 p-3">
                    <SocietyPicker
                      pincode={draftFlow.areaContext.pincode}
                      neighbourhood={draftFlow.areaContext.neighbourhood}
                      onSelect={draftFlow.setSelectedSociety}
                      draftName={draftFlow.societyDraftName}
                      onDraftChange={draftFlow.setSocietyDraftName}
                      deferCreate={deferSocietyCreate}
                      dropdownPosition="top"
                      scrollOnOpen
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/75 bg-white/92 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-2xl"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-2xl"
                    onClick={() => {
                      flow.applySnapshot({
                        areaInput: draftFlow.areaInput,
                        pincode: draftFlow.pincode,
                        selectedSociety: draftFlow.selectedSociety,
                        manual: draftFlow.manual,
                        detectedLabel: draftFlow.detectedLabel,
                        detectedNeighbourhood: draftFlow.effectiveNeighbourhood,
                        societyDraftName: draftFlow.societyDraftName,
                      })
                      setIsModalOpen(false)
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="text-sm leading-5 text-muted-foreground sm:leading-6">{cardCopy}</p>

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
            <div className="relative min-w-0">
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

        <div className="relative z-10 min-w-0 overflow-visible rounded-[1.5rem] border border-border/60 bg-secondary/20 p-3 sm:p-4">
          <SocietyPicker
            pincode={flow.areaContext.pincode}
            neighbourhood={flow.areaContext.neighbourhood}
            onSelect={flow.setSelectedSociety}
            draftName={flow.societyDraftName}
            onDraftChange={flow.setSocietyDraftName}
            deferCreate={deferSocietyCreate}
          />
        </div>
      </CardContent>
    </Card>
  )
}
