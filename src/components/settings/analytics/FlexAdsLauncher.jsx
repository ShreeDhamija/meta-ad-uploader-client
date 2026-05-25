"use client"

/* eslint-disable react/prop-types */

// Analytics-dashboard view of flex-ad candidates. Thin wrapper around
// FlexAdsCandidatesPicker that adds:
//   - Card chrome (rounded border, padding)
//   - h2 header with biceps icon + count
//   - description paragraph
//   - "Launch Flex Ads" button that navigates to / with importedFiles state
//
// The picker owns everything below the description: loading/error/empty/table,
// thumbnails, Load More. See FlexAdsCandidatesPicker.jsx for the shared
// session-cache used by both this and FlexAdsImportModal.

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, BicepsFlexed } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import FlexAdsCandidatesPicker, { buildImportedFilesPayload } from "./FlexAdsCandidatesPicker"

// In the analytics context, bundling fewer than 2 winners defeats the point —
// a single asset isn't a "bundle." (The form-modal context relaxes this to 1.)
const MIN_SELECTION = 2

export default function FlexAdsLauncher({ adAccountId, conversionEvent, mode = "cpr", refreshKey, className }) {
    const navigate = useNavigate()
    const [selectedAdIds, setSelectedAdIds] = useState(() => new Set())
    // Mirror of the picker's current candidates so handleLaunch can map ids
    // to assets without poking at the picker's internals.
    const [candidates, setCandidates] = useState([])

    const canLaunch = selectedAdIds.size >= MIN_SELECTION

    function handleLaunch() {
        if (!canLaunch) return
        const importedFiles = buildImportedFilesPayload(candidates, selectedAdIds)
        if (importedFiles.length === 0) return
        // Mirror the scaleWinners handoff in RecommendationCards: navigate to
        // home with state — Home.jsx consumes and clears it on mount.
        navigate("/", { state: { importedFiles, adAccountId } })
    }

    // When nothing is selected, leave the label empty — the launch button on
    // its own is a sufficient call-to-action. As soon as the user starts
    // picking, show progress toward the minimum and final selection counts.
    const selectionLabel =
        selectedAdIds.size === 0
            ? ""
            : selectedAdIds.size < MIN_SELECTION
                ? `Select ${MIN_SELECTION - selectedAdIds.size} more ad${MIN_SELECTION - selectedAdIds.size === 1 ? "" : "s"}`
                : `${selectedAdIds.size} of ${candidates.length} selected`

    return (
        <Card className={cn("rounded-3xl border-gray-200", className)}>
            <CardContent className="p-6">
                <div className="mb-4 px-1">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <BicepsFlexed className="h-5 w-5 text-purple-500" />
                        Flex Ads — Winner Bundle
                        {candidates.length > 0 && (
                            <span className="text-base font-normal text-gray-400">({candidates.length})</span>
                        )}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Highest-spending ads from the last 14 days (excluding existing flex ads and carousels).
                    </p>
                </div>

                <FlexAdsCandidatesPicker
                    adAccountId={adAccountId}
                    conversionEvent={conversionEvent}
                    mode={mode}
                    refreshKey={refreshKey}
                    selectedAdIds={selectedAdIds}
                    onSelectionChange={setSelectedAdIds}
                    onCandidatesChange={setCandidates}
                />

                {/* Permanent launch button. Always rendered (even on empty/error states)
                    so the affordance is visible; disabled until MIN_SELECTION ads picked. */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-gray-500">{selectionLabel}</span>
                    <Button
                        onClick={handleLaunch}
                        disabled={!canLaunch}
                        className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Launch Flex Ads
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
                {canLaunch && (
                    <p className="mt-2 text-right text-[11px] text-gray-400">
                        You&apos;ll be taken to the launcher to set the campaign, copy, and link.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
