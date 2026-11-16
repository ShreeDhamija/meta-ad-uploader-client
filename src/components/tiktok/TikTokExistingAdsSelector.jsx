"use client"

import { useState, useCallback, memo, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Loader, ChevronDown, ImageOff, RefreshCw, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const SORT_OPTIONS = [
  { value: "date_newest", label: "Newest first" },
  { value: "date_oldest", label: "Oldest first" },
  { value: "name_az", label: "Alphabetical (A→Z)" },
]

// Fields requested from /fetch-ads (TikTok /ad/get/) for the existing-ads table
const AD_FIELDS = [
  "ad_id",
  "ad_name",
  "adgroup_id",
  "adgroup_name",
  "campaign_id",
  "campaign_name",
  "ad_format",
  "video_id",
  "image_ids",
  "tiktok_item_id",
  "identity_id",
  "identity_type",
  "ad_text",
  "call_to_action",
  "landing_page_url",
  "operation_status",
  "secondary_status",
  "create_time",
  "modify_time",
]

const GRID_COLS ="grid-cols-[20px_48px_minmax(0,1fr)_minmax(0,0.72fr)_90px]"
const ROW_GRID_COLS = "grid-cols-[auto_48px_minmax(0,1fr)_minmax(0,0.72fr)_90px]"

const isActiveAd = (ad) => String(ad?.operation_status || "").toUpperCase() === "ENABLE"

// TikTok returns "YYYY-MM-DD HH:MM:SS" in UTC
const parseTikTokTime = (value) => {
  if (!value) return 0
  const t = Date.parse(String(value).replace(" ", "T") + "Z")
  return Number.isFinite(t) ? t : 0
}

const sortAds = (items, sortMode) => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const activeDelta = Number(isActiveAd(b)) - Number(isActiveAd(a))
    if (activeDelta !== 0) return activeDelta
    if (sortMode === "name_az") return (a.ad_name || "").localeCompare(b.ad_name || "")
    if (sortMode === "date_oldest") return parseTikTokTime(a.create_time) - parseTikTokTime(b.create_time)
    return parseTikTokTime(b.create_time) - parseTikTokTime(a.create_time)
  })
  return sorted
}

const getStatusMeta = (ad) => {
  const op = String(ad?.operation_status || "").toUpperCase()
  if (op === "ENABLE") return { label: "Active", className: "bg-green-100 text-green-700" }
  if (op === "DISABLE") return { label: "Paused", className: "bg-yellow-100 text-yellow-700" }
  if (op === "FROZEN") return { label: "Frozen", className: "bg-gray-100 text-gray-600" }
  return { label: "—", className: "bg-gray-100 text-gray-600" }
}

const truncateText = (text, maxLength = 75) => {
  if (!text) return "—"
  return text.length <= maxLength ? text : text.substring(0, maxLength) + "..."
}

function TikTokExistingAdsSelector({
  advertiserId,
  campaignIds = [],
  adGroupIds = [],
  selectedAds = [],
  onSelectionChange,
}) {
  const { tiktokFetch } = useTikTokAuth()
  const [ads, setAds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [sortMode, setSortMode] = useState("date_newest")
  const [filterQuery, setFilterQuery] = useState("")

  // Only the latest request may write results
  const requestIdRef = useRef(0)

  const selectedIds = useMemo(() => new Set(selectedAds.map((ad) => ad.ad_id)), [selectedAds])

  // Stable keys so the fetch effect only re-runs when the actual selection changes
  const adGroupKey = useMemo(() => [...adGroupIds].sort().join(","), [adGroupIds])
  const canFetch = Boolean(advertiserId && adGroupKey)

  const fetchAds = useCallback(async () => {
    const requestId = ++requestIdRef.current
    if (!canFetch) {
      setAds([])
      setHasFetched(false)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Ad groups already belong to the selected campaign(s), so filtering by ad group is enough
      const params = new URLSearchParams({
        advertiserId,
        adgroupIds: JSON.stringify(adGroupKey.split(",")),
        fields: JSON.stringify(AD_FIELDS),
        includeThumbnails: "true",
      })

      const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-ads?${params}`)
      const data = await res.json()
      if (requestId !== requestIdRef.current) return
      if (!res.ok) throw new Error(data.error || "Failed to fetch ads")

      setAds(data.ads || [])
      setHasFetched(true)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      console.error("Error fetching existing TikTok ads:", err)
      const message = err.message || "Failed to fetch ads"
      setError(message)
      toast.error(message)
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [advertiserId, adGroupKey, canFetch, tiktokFetch])

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // Drop selections for ads that are no longer in the selected campaign/ad groups
  useEffect(() => {
    if (!hasFetched || isLoading) return
    const availableIds = new Set(ads.map((ad) => ad.ad_id))
    const stillValid = selectedAds.filter((ad) => availableIds.has(ad.ad_id))
    if (stillValid.length !== selectedAds.length) onSelectionChange(stillValid)
  }, [ads, hasFetched, isLoading, selectedAds, onSelectionChange])

  const displayedAds = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    const filtered = q
      ? ads.filter(
        (ad) =>
          (ad.ad_name || "").toLowerCase().includes(q) ||
          String(ad.ad_id || "").toLowerCase().includes(q),
      )
      : ads
    return sortAds(filtered, sortMode)
  }, [ads, filterQuery, sortMode])

  const toggleAd = (ad) => {
    if (selectedIds.has(ad.ad_id)) {
      onSelectionChange(selectedAds.filter((a) => a.ad_id !== ad.ad_id))
    } else {
      onSelectionChange([...selectedAds, ad])
    }
  }

  const allDisplayedSelected = displayedAds.length > 0 && displayedAds.every((ad) => selectedIds.has(ad.ad_id))

  const toggleAllDisplayed = (checked) => {
    const displayedIds = new Set(displayedAds.map((ad) => ad.ad_id))
    if (checked) {
      const toAdd = displayedAds.filter((ad) => !selectedIds.has(ad.ad_id))
      onSelectionChange([...selectedAds, ...toAdd])
    } else {
      onSelectionChange(selectedAds.filter((ad) => !displayedIds.has(ad.ad_id)))
    }
  }

  const renderNameTooltip = (value) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block text-xs text-gray-900 truncate">{truncateText(value)}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[360px] break-words text-xs">
        {value || "Unknown"}
      </TooltipContent>
    </Tooltip>
  )

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortMode)?.label || "Newest first"

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
          <Button
            type="button"
            size="sm"
            onClick={fetchAds}
            disabled={isLoading || !canFetch}
            className="px-3 py-3 bg-white text-black border border-gray-300 rounded-[14px] hover:bg-white"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Ads
          </Button>
        </div>

        {/* Filter loaded ads by name or ID */}
        {ads.length > 0 && (
          <div className="space-y-1.5 px-1">
            <Label className="text-xs text-gray-700">Filter ads by name or ID</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Filter returned ads by name or ID..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-8 h-9 text-sm rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {!canFetch && (
          <div className="flex items-center justify-center py-6 text-gray-400 text-sm flex-shrink-0">
            {campaignIds.length === 0 ? "Select a campaign to get started" : "Select an ad group to view its ads"}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 flex-shrink-0">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Fetching ads...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center p-4 border border-red-200 rounded-lg bg-red-50 flex-shrink-0">
            <p className="text-red-500 mb-4">{error}</p>
            <Button type="button" variant="outline" onClick={fetchAds}>
              Retry
            </Button>
          </div>
        )}

        {canFetch && hasFetched && !isLoading && !error && ads.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-500 border border-gray-200 rounded-lg flex-shrink-0">
            No ads found in the selected ad group{adGroupIds.length > 1 ? "s" : ""}
          </div>
        )}

        {!isLoading && ads.length > 0 && (
          <div className={cn("grid gap-2 px-2 py-2 text-xs font-medium text-white bg-blue-500 rounded-xl items-center", GRID_COLS)}>
            <div></div>
            <div className="-ml-4">Thumbnail</div>
            <div>Ad Name</div>
            <div>Ad Group</div>
            <div className="text-right whitespace-nowrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center gap-1 ml-auto hover:opacity-80 transition-opacity">
                    <span>{sortLabel}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white rounded-xl">
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortMode(option.value)}
                      className={sortMode === option.value ? "bg-gray-100" : ""}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {!isLoading && displayedAds.length > 0 && (
        <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer">
          <Checkbox checked={allDisplayedSelected} onCheckedChange={toggleAllDisplayed} />
          Select all
        </label>
      )}

      {!isLoading && ads.length > 0 && displayedAds.length === 0 && (
        <div className="flex items-center justify-center py-6 text-gray-400 text-sm">No ads match your filter</div>
      )}

      {!isLoading && displayedAds.length > 0 && (
        <ScrollArea className="h-[550px] outline-none focus:outline-none">
          <TooltipProvider delayDuration={150}>
            <div className="space-y-1.5">
              {displayedAds.map((ad) => {
                const isSelected = selectedIds.has(ad.ad_id)
                const status = getStatusMeta(ad)
                return (
                  <label
                    key={ad.ad_id}
                    className={cn(
                      "grid gap-2 items-center p-3 rounded-xl border cursor-pointer transition-colors",
                      ROW_GRID_COLS,
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    )}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleAd(ad)} />

                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      {ad.thumbnail_url ? (
                        <img
                          src={ad.thumbnail_url}
                          alt="Ad thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none"
                            e.target.nextSibling.style.display = "flex"
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full items-center justify-center ${ad.thumbnail_url ? "hidden" : "flex"}`}>
                        <ImageOff className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="min-w-0">{renderNameTooltip(ad.ad_name)}</div>
                    <div className="min-w-0">{renderNameTooltip(ad.adgroup_name)}</div>

                    <div className="text-right">
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", status.className)}>{status.label}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </TooltipProvider>
        </ScrollArea>
      )}
    </div>
  )
}

export default memo(TikTokExistingAdsSelector)
