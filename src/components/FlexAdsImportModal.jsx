"use client"

/* eslint-disable react/prop-types */

// In-form modal for importing top-performing ads' assets into the ad
// launcher's `importedFiles` state. Triggered from ad-creation-form.jsx's
// "Get Top Ads For Flex" button (visible only when adType === 'flexible').
//
// Wraps the shared FlexAdsCandidatesPicker (which handles fetch/cache/table/
// thumbnails/Load More) with modal chrome modeled on MetaMediaLibraryModal:
//   - full-screen overlay + centered fixed panel
//   - header with biceps icon + title
//   - picker fills the body
//   - footer with selection count + Cancel + "Import to Launcher" buttons
//
// Unlike the analytics-dashboard FlexAdsLauncher, MIN_SELECTION is 1 here —
// in the form context a single flex candidate can usefully sit alongside the
// user's own uploaded files.

import { useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { BicepsFlexed, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import FlexAdsCandidatesPicker, { buildImportedFilesPayload } from "./settings/analytics/FlexAdsCandidatesPicker"

const MIN_SELECTION = 1

export default function FlexAdsImportModal({
    open,
    onOpenChange,
    adAccountId,
    conversionEvent,
    mode = "cpr",
    importedFiles = [],
    setImportedFiles,
}) {
    const [selectedAdIds, setSelectedAdIds] = useState(() => new Set())
    const [candidates, setCandidates] = useState([])

    const canImport = selectedAdIds.size >= MIN_SELECTION

    function handleClose() {
        onOpenChange(false)
        // Reset selection on close so re-opening starts fresh; the picker's
        // module-level cache means the candidate list still appears instantly.
        setSelectedAdIds(new Set())
    }

    function handleImport() {
        if (!canImport) return
        const newAssets = buildImportedFilesPayload(candidates, selectedAdIds)
        if (newAssets.length === 0) return

        // Dedupe against what's already in the form's importedFiles. Images
        // are keyed by hash, videos by id — matches getMetaFileId in
        // MetaMediaLibraryModal so the same asset can never appear twice in
        // the launcher's file list.
        const existingKeys = new Set(
            importedFiles.map(f => (f.type === "image" ? `i:${f.hash}` : `v:${f.id}`))
        )
        const additions = newAssets.filter(
            a => !existingKeys.has(a.type === "image" ? `i:${a.hash}` : `v:${a.id}`)
        )

        if (additions.length === 0) {
            toast.info("Those ads are already imported")
            handleClose()
            return
        }

        setImportedFiles([...importedFiles, ...additions])
        toast.success(
            `Imported ${additions.length} ad${additions.length === 1 ? "" : "s"}` +
                (additions.length !== newAssets.length ? ` (${newAssets.length - additions.length} already in launcher)` : "")
        )
        handleClose()
    }

    if (!open || typeof document === "undefined") return null

    const selectionLabel =
        selectedAdIds.size === 0
            ? ""
            : `${selectedAdIds.size} of ${candidates.length} selected`

    return createPortal(
        <>
            {/* Overlay — click to dismiss */}
            <div
                className="fixed bg-black/50 z-50"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100dvh",
                }}
                onClick={handleClose}
                aria-hidden="true"
            />

            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <div
                    className="bg-white rounded-[28px] shadow-2xl w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="flex-import-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 pb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2
                                id="flex-import-title"
                                className="flex items-center gap-2 text-lg font-semibold text-gray-900"
                            >
                                <BicepsFlexed className="h-5 w-5 text-purple-500" />
                                Get Top Ads For Flex
                                {candidates.length > 0 && (
                                    <span className="text-base font-normal text-gray-400">({candidates.length})</span>
                                )}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Highest-spending ads from the last 14 days (excluding existing flex ads and carousels).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Picker fills the body. */}
                    <div className="flex-1 overflow-hidden px-6 min-h-0">
                        <FlexAdsCandidatesPicker
                            adAccountId={adAccountId}
                            conversionEvent={conversionEvent}
                            mode={mode}
                            selectedAdIds={selectedAdIds}
                            onSelectionChange={setSelectedAdIds}
                            onCandidatesChange={setCandidates}
                            maxHeight="60vh"
                        />
                    </div>

                    {/* Footer — Import button spans the full modal width per spec.
                        Selection count sits above it on the right when present. */}
                    <div className="p-6 pt-4 flex flex-col gap-3">
                        {selectionLabel && (
                            <span className="text-right text-sm font-medium text-primary">
                                {selectionLabel}
                            </span>
                        )}
                        <Button
                            type="button"
                            onClick={handleImport}
                            disabled={!canImport}
                            className="h-11 w-full gap-2 rounded-xl bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Import to Launcher
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
