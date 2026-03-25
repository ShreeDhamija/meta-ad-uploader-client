"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader, Users, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import useTeamSync from "@/lib/useTeamSync"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

/**
 * TeamSyncToggle
 * 
 * Place this component inside your AdAccountSettings page, above or below
 * the ad account selector. It shows a toggle for team settings sync.
 * 
 * Only visible to users in a team. Only owners can toggle it.
 * Members see a read-only indicator.
 * 
 * Usage:
 *   <TeamSyncToggle onSyncChange={() => {
 *     // Refetch ad account settings when sync is toggled
 *     // so the UI reloads with team or personal data
 *   }} />
 */
export default function TeamSyncToggle({ onSyncChange }) {
    const {
        loading,
        toggling,
        inTeam,
        syncEnabled,
        isOwner,
        teamName,
        enableSync,
        disableSync,
    } = useTeamSync()

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState(null) // "enable" | "disable"

    // Not in a team — don't render
    if (loading || !inTeam) return null

    const handleToggle = () => {
        if (!isOwner) {
            toast.info("Only the team owner can change sync settings.")
            return
        }

        setConfirmAction(syncEnabled ? "disable" : "enable")
        setConfirmOpen(true)
    }

    const handleConfirm = async () => {
        setConfirmOpen(false)

        let result
        if (confirmAction === "enable") {
            result = await enableSync()
            if (result.success) {
                toast.success(
                    result.seededCount > 0
                        ? `Sync enabled! ${result.seededCount} ad account settings synced to the team.`
                        : "Sync enabled! Settings will be shared when anyone saves next."
                )
            }
        } else {
            result = await disableSync()
            if (result.success) {
                toast.success("Sync disabled. Each member will use their own settings.")
            }
        }

        if (!result.success) {
            toast.error(result.error || "Something went wrong.")
        }

        // Notify parent to refetch ad account settings
        onSyncChange?.()
    }

    return (
        <>
            <div className="bg-[#f7f7f7] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-950">
                                Team settings sync
                            </span>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="max-w-xs p-3 text-xs leading-relaxed rounded-2xl bg-zinc-800 text-white border-black"
                                    >
                                        When enabled, ad account settings and copy templates are
                                        shared across all team members. Any member can save, and
                                        changes are visible to everyone instantly.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <span className="text-xs text-gray-500">
                            {teamName ? `${teamName} · ` : ""}
                            {syncEnabled ? "Shared across team" : "Each member uses their own"}
                        </span>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className={`rounded-xl text-sm px-4 h-8 transition-colors ${syncEnabled
                        ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        : "border-gray-200 hover:bg-gray-50"
                        } ${!isOwner ? "opacity-60 cursor-not-allowed" : ""}`}
                    onClick={handleToggle}
                    disabled={toggling || !isOwner}
                >
                    {toggling ? (
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : syncEnabled ? (
                        "Synced"
                    ) : (
                        "Enable sync"
                    )}
                </Button>
            </div>

            {/* Confirmation dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-md !rounded-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {confirmAction === "enable" ? "Enable team sync?" : "Disable team sync?"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 pt-2 space-y-2">
                            {confirmAction === "enable" ? (
                                <>
                                    <p>
                                        This will share your ad account settings and copy templates
                                        with all team members. Your current settings will be used as
                                        the starting point.
                                    </p>
                                    <p>
                                        Any team member will be able to edit settings, and changes
                                        will be visible to everyone.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Each team member will return to using their own personal
                                        settings. Their current settings (copied from the shared
                                        ones) will be preserved.
                                    </p>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            className={`rounded-xl ${confirmAction === "enable"
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-gray-700 hover:bg-gray-800 text-white"
                                }`}
                        >
                            {confirmAction === "enable" ? "Enable sync" : "Disable sync"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}