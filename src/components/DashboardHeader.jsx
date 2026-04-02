import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, MapPin, Navigation } from 'lucide-react'
import { useAreaSocietyFlow } from '../hooks/use-area-society-flow'
import { SocietyPicker } from './SocietyPicker'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'

function getLocationMessage(status, detectedLabel, showingLabel, societyName) {
  if (status === 'detecting') {
    return 'Detecting location'
  }

  if (status === 'detected') {
    return `Detected ${detectedLabel || showingLabel}`
  }

  if (status === 'society') {
    return `Focused on ${societyName}`
  }

  if (status === 'manual') {
    return `Showing ${showingLabel}`
  }

  if (status === 'saved') {
    return 'Using saved area'
  }

  return 'Location optional'
}

function getDraftLocationStatus(flow) {
  if (flow.detecting) {
    return 'detecting'
  }

  if (flow.detectedLabel && !flow.manual) {
    return 'detected'
  }

  if (flow.selectedSociety?.name) {
    return 'society'
  }

  if (flow.areaContext.neighbourhood || flow.areaContext.areaLabel) {
    return 'manual'
  }

  return 'idle'
}

export function DashboardHeader({
  areaLabel,
  societyName,
  locationModalOpen,
  locationModalKey,
  initialLocation,
  onOpenLocation,
  onCloseLocation,
  onApplyLocation,
}) {
  return (
    <>
      <div className="sticky top-2 z-20">
        <div className="rounded-[1.6rem] border border-white/80 bg-[linear-gradient(180deg,rgba(251,247,238,0.96),rgba(255,255,255,0.93))] px-4 py-3 shadow-[0_12px_30px_rgba(104,85,58,0.1)] backdrop-blur-xl">
          <button
            type="button"
            onClick={onOpenLocation}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-secondary/45 px-2.5 py-1 text-xs font-semibold text-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{areaLabel}</span>
                </span>
                {societyName ? (
                  <span className="max-w-[45vw] truncate rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {societyName}
                  </span>
                ) : null}
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</p>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      {locationModalOpen ? (
        <DashboardLocationModal
          key={locationModalKey}
          open={locationModalOpen}
          initialLocation={initialLocation}
          onClose={onCloseLocation}
          onApply={onApplyLocation}
        />
      ) : null}
    </>
  )
}

function DashboardLocationModal({ open, initialLocation, onClose, onApply }) {
  const [isConfirmDetectOpen, setIsConfirmDetectOpen] = useState(false)
  const scrollViewportRef = useRef(null)
  const draftFlow = useAreaSocietyFlow({
    initialAreaLabel: initialLocation?.areaInput ?? '',
    initialPincode: initialLocation?.pincode ?? '',
    initialSociety: initialLocation?.selectedSociety ?? null,
    autoDetect: false,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    window.setTimeout(() => {
      scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, 60)
  }, [open])

  const draftSelectedArea = draftFlow.areaContext.neighbourhood || draftFlow.areaContext.areaLabel
  const hasDraftSelection = Boolean(draftSelectedArea || draftFlow.selectedSociety?.name)
  const draftShowingLabel = draftSelectedArea || 'Select area'
  const draftStatus = getDraftLocationStatus(draftFlow)

  async function handleDetectLocation() {
    setIsConfirmDetectOpen(false)
    await draftFlow.detectLocation()
    scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function requestDetectLocation() {
    if (hasDraftSelection) {
      setIsConfirmDetectOpen(true)
      return
    }

    handleDetectLocation()
  }

  function applyLocationChanges() {
    onApply({
      areaInput: draftFlow.areaInput,
      pincode: draftFlow.pincode,
      selectedSociety: draftFlow.selectedSociety,
      manual: draftFlow.manual,
      detectedLabel: draftFlow.detectedLabel,
      detectedNeighbourhood: draftFlow.effectiveNeighbourhood,
      societyDraftName: draftFlow.societyDraftName,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="inset-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border sm:p-0">
          <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(251,247,238,0.98),rgba(255,255,255,0.98))] sm:max-h-[90vh] sm:rounded-[2rem]">
            <DialogHeader className="border-b border-white/70 px-4 pb-4 pt-6 pr-14 sm:px-6">
              <DialogTitle>Choose location</DialogTitle>
              <DialogDescription>
                Pick your area, optionally add your society, then apply the change.
              </DialogDescription>
            </DialogHeader>

            <div
              ref={scrollViewportRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:px-6 sm:pb-24"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full bg-secondary/45 px-2.5 py-1 text-[0.68rem]">
                    {getLocationMessage(
                      draftStatus,
                      draftFlow.detectedLabel,
                      draftShowingLabel,
                      draftFlow.selectedSociety?.name,
                    )}
                  </Badge>
                  {draftFlow.selectedSociety?.name ? (
                    <span className="truncate rounded-full bg-white/75 px-2.5 py-1">
                      Society: {draftFlow.selectedSociety.name}
                    </span>
                  ) : null}
                </div>

                <div className="rounded-[1.35rem] border border-white/75 bg-secondary/15 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary/80" />
                    <p className="text-sm font-semibold text-foreground">Area</p>
                  </div>
                  <div className="relative min-w-0">
                    <Input
                      value={draftFlow.areaInput}
                      placeholder="Select area"
                      onChange={(event) => draftFlow.setAreaInput(event.target.value)}
                      onFocus={() => draftFlow.setShowSuggestions(true)}
                      onBlur={() => window.setTimeout(() => draftFlow.setShowSuggestions(false), 150)}
                      autoComplete="off"
                      className="h-11 rounded-2xl border-white/75 bg-white/92 pr-10 text-sm shadow-none"
                    />
                    {draftFlow.isFetchingSuggestions ? (
                      <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}
                    {draftFlow.showSuggestions && draftFlow.areaSuggestions.length > 0 ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
                        {draftFlow.areaSuggestions.map((suggestion, index) => (
                          <button
                            key={`${suggestion.neighbourhood}-${suggestion.pincode || index}`}
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/35"
                            onMouseDown={() => draftFlow.selectSuggestion(suggestion)}
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                            <span className="flex-1 truncate">
                              {suggestion.neighbourhood || suggestion.pincode}
                            </span>
                            {suggestion.pincode ? (
                              <span className="text-xs text-muted-foreground">{suggestion.pincode}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-white/75 bg-secondary/15 px-3 py-2">
                  <SocietyPicker
                    pincode={draftFlow.areaContext.pincode}
                    neighbourhood={draftFlow.areaContext.neighbourhood}
                    onSelect={draftFlow.setSelectedSociety}
                    draftName={draftFlow.societyDraftName}
                    onDraftChange={draftFlow.setSocietyDraftName}
                    deferCreate
                    dropdownPosition="top"
                    scrollOnOpen
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-2xl"
                  onClick={requestDetectLocation}
                >
                  {draftFlow.detecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting location
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      Detect location
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border-t border-white/75 bg-white/92 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1 rounded-2xl" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1 rounded-2xl" onClick={applyLocationChanges}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDetectOpen} onOpenChange={setIsConfirmDetectOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-[1.75rem] p-5">
          <DialogHeader className="pr-8">
            <DialogTitle>Replace current selection?</DialogTitle>
            <DialogDescription>
              Detecting your location will replace the area and clear the current society selection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 rounded-2xl"
              onClick={() => setIsConfirmDetectOpen(false)}
            >
              Keep current
            </Button>
            <Button type="button" className="flex-1 rounded-2xl" onClick={handleDetectLocation}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
