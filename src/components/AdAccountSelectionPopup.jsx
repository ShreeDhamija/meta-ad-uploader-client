import { useEffect, useMemo, useRef, useState } from "react"
import PropTypes from "prop-types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAppData } from "@/lib/AppContext"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"
import {
    getPlanAccountLimit,
    META_PLATFORM,
    TIKTOK_PLATFORM,
} from "@/lib/accountSelection"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"
const EMPTY_ACCOUNTS = []

// Settings are persisted as JSON, but legacy/manual DB edits can leave these
// fields as objects or JSON strings. Treat anything other than an actual array
// as an empty selection so the popup can repair the value instead of crashing.
const normalizeSelectedIds = (value) => (
    Array.isArray(value)
        ? value
            .filter((id) => id !== null && id !== undefined && id !== "")
            .map(String)
        : []
)

const accountId = (account, platform) => String(
    platform === TIKTOK_PLATFORM
        ? account.advertiser_id || account.id
        : account.id
)

const accountName = (account, platform) => (
    platform === TIKTOK_PLATFORM
        ? account.advertiser_name || account.name || accountId(account, platform)
        : account.name || accountId(account, platform)
)

export default function AdAccountSelectionPopup({
    isOpen,
    onClose,
    onSave,
    selectedAdAccountIds,
    selectedTikTokAdvertiserIds,
    platforms = [META_PLATFORM],
    planType,
}) {
    const { allAdAccounts, allTikTokAdvertisers } = useAppData()
    const [activePlatforms, setActivePlatforms] = useState(platforms)
    const [stepIndex, setStepIndex] = useState(0)
    const [selectedAccountIds, setSelectedAccountIds] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const wasOpen = useRef(false)

    const platform = activePlatforms[stepIndex] || activePlatforms[0] || META_PLATFORM
    const isTikTok = platform === TIKTOK_PLATFORM
    const maxAccounts = getPlanAccountLimit(planType)
    const isSingleAccountPlan = maxAccounts === 1
    const rawAccounts = isTikTok ? allTikTokAdvertisers : allAdAccounts
    const accounts = Array.isArray(rawAccounts) ? rawAccounts : EMPTY_ACCOUNTS
    const savedSelection = isTikTok ? selectedTikTokAdvertiserIds : selectedAdAccountIds

    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setActivePlatforms(platforms.length > 0 ? platforms : [META_PLATFORM])
            setStepIndex(0)
        }
        wasOpen.current = isOpen
    }, [isOpen, platforms])

    useEffect(() => {
        if (!isOpen) return
        setSelectedAccountIds(normalizeSelectedIds(savedSelection))
        setSearchQuery("")
    }, [isOpen, platform, savedSelection])

    const filteredAccounts = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return accounts
        return accounts.filter((account) => (
            accountName(account, platform).toLowerCase().includes(query)
            || accountId(account, platform).toLowerCase().includes(query)
        ))
    }, [accounts, platform, searchQuery])

    const saveSelection = async () => {
        if (isLoading) return
        if (selectedAccountIds.length === 0) {
            toast.error(`Please select at least one ${isTikTok ? "TikTok advertiser" : "Meta ad account"}`)
            return
        }
        if (Number.isFinite(maxAccounts) && selectedAccountIds.length > maxAccounts) {
            toast.error(`Your plan allows ${maxAccounts} ad account${maxAccounts === 1 ? "" : "s"}`)
            return
        }

        const endpoint = isTikTok
            ? `${API_BASE_URL}/api/tiktok/settings/global/save`
            : `${API_BASE_URL}/settings/save`
        const body = isTikTok
            ? { selectedAdvertiserIds: selectedAccountIds }
            : { globalSettings: { selectedAdAccountIds: selectedAccountIds } }

        setIsLoading(true)
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            })
            if (!response.ok) throw new Error(`Selection save failed: ${response.status}`)

            toast.success(`${isTikTok ? "TikTok" : "Meta"} ad accounts saved`)
            window.dispatchEvent(new Event("globalSettingsUpdated"))
            onSave?.({ platform, accountIds: [...selectedAccountIds] })

            if (stepIndex < activePlatforms.length - 1) {
                setStepIndex((current) => current + 1)
            } else {
                onClose()
            }
        } catch (error) {
            console.error("Error saving ad account selection:", error)
            toast.error("Failed to save ad account selection")
        } finally {
            setIsLoading(false)
        }
    }

    const getDialogDescription = () => {
        const platformName = isTikTok ? "TikTok advertiser" : "Meta ad"
        if (planType === "starter") {
            return `Your Starter plan includes 1 ${platformName} account. Choose the account you want to use.`
        }
        if (planType === "brand") {
            return `Your Light plan includes up to 5 ${platformName} accounts. Choose the accounts you want to use.`
        }
        if (planType === "free_trial") {
            return `Choose the ${platformName} accounts you want available during your free trial.`
        }
        return `Choose the ${platformName} accounts you want to use.`
    }

    const handleOpenChange = (open) => {
        if (!open && isOpen) {
            toast.error("Save your account selection before continuing")
        }
    }

    const titlePlatform = isTikTok ? "TikTok" : "Meta"
    const hasMultipleSteps = activePlatforms.length > 1

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
            <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-8 data-[state=open]:!slide-in-from-left-0 data-[state=closed]:!slide-out-to-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=closed]:!slide-out-to-top-0">
                <DialogHeader className="space-y-4">
                    {hasMultipleSteps && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            Step {stepIndex + 1} of {activePlatforms.length}
                        </p>
                    )}
                    <DialogTitle className="text-xl">
                        Select Your {titlePlatform} Ad Account{maxAccounts > 1 ? "s" : ""}
                    </DialogTitle>
                    <DialogDescription className="text-base leading-relaxed">
                        {getDialogDescription()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by ad account name or ID..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="rounded-xl pl-9"
                        />
                    </div>

                    {filteredAccounts.length === 0 ? (
                        <p className="py-8 text-center text-gray-500">
                            {searchQuery ? "No accounts found matching your search" : `No ${titlePlatform} ad accounts found`}
                        </p>
                    ) : isSingleAccountPlan ? (
                        <RadioGroup
                            value={selectedAccountIds[0] || ""}
                            onValueChange={(value) => setSelectedAccountIds([value])}
                            className="max-h-60 space-y-2 overflow-y-auto"
                        >
                            {filteredAccounts.map((account) => {
                                const id = accountId(account, platform)
                                return (
                                    <div key={id} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-gray-50">
                                        <RadioGroupItem value={id} id={`${platform}-${id}`} />
                                        <Label htmlFor={`${platform}-${id}`} className="flex-1 cursor-pointer">
                                            <div className="font-medium">{accountName(account, platform)}</div>
                                            <div className="text-sm text-gray-500">ID: {id}</div>
                                        </Label>
                                    </div>
                                )
                            })}
                        </RadioGroup>
                    ) : (
                        <div className="max-h-60 space-y-2 overflow-y-auto">
                            {filteredAccounts.map((account) => {
                                const id = accountId(account, platform)
                                const disabled = Number.isFinite(maxAccounts)
                                    && selectedAccountIds.length >= maxAccounts
                                    && !selectedAccountIds.includes(id)
                                return (
                                    <div
                                        key={id}
                                        className={cn(
                                            "flex items-center space-x-2 rounded-lg border p-3 hover:bg-gray-50",
                                            disabled && "cursor-not-allowed bg-gray-50 opacity-50"
                                        )}
                                    >
                                        <Checkbox
                                            id={`${platform}-${id}`}
                                            checked={selectedAccountIds.includes(id)}
                                            disabled={disabled}
                                            onCheckedChange={(checked) => {
                                                setSelectedAccountIds((previous) => (
                                                    checked
                                                        ? [...previous, id]
                                                        : previous.filter((selectedId) => selectedId !== id)
                                                ))
                                            }}
                                        />
                                        <Label
                                            htmlFor={`${platform}-${id}`}
                                            className={cn(
                                                "flex-1 cursor-pointer",
                                                disabled && "cursor-not-allowed text-gray-400"
                                            )}
                                        >
                                            <div className="font-medium">{accountName(account, platform)}</div>
                                            <div className="text-sm text-gray-500">ID: {id}</div>
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={saveSelection}
                        disabled={selectedAccountIds.length === 0 || isLoading}
                        className="h-[46px] flex-1 rounded-2xl"
                    >
                        {isLoading
                            ? "Saving..."
                            : stepIndex < activePlatforms.length - 1
                                ? "Save and Continue"
                                : "Save Selection"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

AdAccountSelectionPopup.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    selectedAdAccountIds: PropTypes.arrayOf(PropTypes.string),
    selectedTikTokAdvertiserIds: PropTypes.arrayOf(PropTypes.string),
    platforms: PropTypes.arrayOf(PropTypes.oneOf([META_PLATFORM, TIKTOK_PLATFORM])),
    planType: PropTypes.string.isRequired,
}
