"use client"

import { useState, useCallback, memo, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader, ChevronDown, ChevronRight, ImageOff, RefreshCw, Search } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// checkbox | thumbnail | ad name | status | chevron
// (thumbnail column is wider than the 48px image so the "Thumbnail" header label fits)
const GRID_COLS = "grid-cols-[20px_64px_minmax(0,1fr)_90px_16px]"
// Same, plus an ad group column, used when more than one ad group is selected
const GRID_COLS_MULTI = "grid-cols-[20px_64px_minmax(0,1.4fr)_minmax(0,1fr)_90px_16px]"

// Black when checked, to match the dark header
const CHECKBOX_CLASS =
  "border-zinc-400 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 data-[state=checked]:text-white"

const isActive = (status) => String(status || "").toUpperCase() === "ENABLE"

// TikTok returns "YYYY-MM-DD HH:MM:SS" in UTC
const parseTikTokTime = (value) => {
  if (!value) return 0
  const t = Date.parse(String(value).replace(" ", "T") + "Z")
  return Number.isFinite(t) ? t : 0
}

const getAdName = (ad) => ad.ad_name || `Smart+ ad ${ad.smart_plus_ad_id}`

// Fixed order: active ads first, then newest first
const sortAds = (items) =>
  [...items].sort((a, b) => {
    const activeDelta = Number(isActive(b.operation_status)) - Number(isActive(a.operation_status))
    if (activeDelta !== 0) return activeDelta
    return parseTikTokTime(b.create_time) - parseTikTokTime(a.create_time)
  })

const getStatusMeta = (status) => {
  const op = String(status || "").toUpperCase()
  if (op === "ENABLE") return { label: "Active", className: "bg-green-100 text-green-700" }
  if (op === "DISABLE") return { label: "Paused", className: "bg-yellow-100 text-yellow-700" }
  if (op === "FROZEN") return { label: "Frozen", className: "bg-gray-100 text-gray-600" }
  return { label: "—", className: "bg-gray-100 text-gray-600" }
}

const truncateText = (text, maxLength = 75) => {
  if (!text) return "—"
  return text.length <= maxLength ? text : text.substring(0, maxLength) + "..."
}

const matches = (q, ...values) => values.some((v) => String(v || "").toLowerCase().includes(q))

/**
 * Lists Smart+ ads (from /smart_plus/ad/get/) in the selected ad groups. Each ad is a
 * parent row; its chevron opens the creatives in its creative_list (display only).
 * Selection is per ad (keyed by smart_plus_ad_id); selected ads carry all their creatives.
 */
function TikTokExistingAdsSelector({
  advertiserId,
  campaignIds = [],
  adGroupIds = [],
  adGroups = [], // ad group records ({ adgroup_id, adgroup_name }) for the names in the Ad Group column
  selectedAds = [],
  onSelectionChange,
  refreshKey = 0, // bumped by the parent after an update to refetch the ads
}) {
  const { tiktokFetch } = useTikTokAuth()
  const [ads, setAds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Only the latest request may write results
  const requestIdRef = useRef(0)

  const selectedIds = useMemo(() => new Set(selectedAds.map((ad) => ad.smart_plus_ad_id)), [selectedAds])

  // Stable keys so the fetch only re-runs when the actual selection changes
  const campaignKey = useMemo(() => [...campaignIds].sort().join(","), [campaignIds])
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
      const params = new URLSearchParams({ advertiserId, adgroupIds: JSON.stringify(adGroupKey.split(",")) })
      if (campaignKey) params.append("campaignIds", JSON.stringify(campaignKey.split(",")))

      const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-smart-plus-ads?${params}`)
      const data = await res.json()
      if (requestId !== requestIdRef.current) return
      if (!res.ok) throw new Error(data.error || "Failed to fetch ads")

      setAds(data.ads || [])
      setHasFetched(true)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      console.error("Error fetching Smart+ ads:", err)
      const message = err.message || "Failed to fetch ads"
      setError(message)
      toast.error(message)
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [advertiserId, campaignKey, adGroupKey, canFetch, tiktokFetch])

  useEffect(() => {
    fetchAds()
  }, [fetchAds, refreshKey])

  // Drop selections for ads that are no longer in the selected ad groups
  useEffect(() => {
    if (!hasFetched || isLoading) return
    const availableIds = new Set(ads.map((ad) => ad.smart_plus_ad_id))
    const stillValid = selectedAds.filter((ad) => availableIds.has(ad.smart_plus_ad_id))
    if (stillValid.length !== selectedAds.length) onSelectionChange(stillValid)
  }, [ads, hasFetched, isLoading, selectedAds, onSelectionChange])

  // Full ad records by ID — the filter can trim an ad's creatives, but a selection always keeps them all
  const adsById = useMemo(() => new Map(ads.map((ad) => [ad.smart_plus_ad_id, ad])), [ads])

  const query = filterQuery.trim().toLowerCase()

  // An ad whose own name/ID matches keeps all its creatives; otherwise only matching creatives stay
  const displayedAds = useMemo(() => {
    const filtered = ads
      .map((ad) => {
        if (!query || matches(query, getAdName(ad), ad.smart_plus_ad_id)) return ad
        const creatives = ad.creatives.filter((c) => matches(query, c.name, c.ad_material_id, c.tiktok_item_id))
        return creatives.length > 0 ? { ...ad, creatives } : null
      })
      .filter(Boolean)
    return sortAds(filtered)
  }, [ads, query])

  // With several ad groups selected, ads are listed ad group by ad group (in the order they
  // were selected) and an ad group without ads gets its own "No ads yet" row
  const isMultiAdGroup = adGroupIds.length > 1
  const gridCols = isMultiAdGroup ? GRID_COLS_MULTI : GRID_COLS

  const adGroupNameById = useMemo(() => {
    const names = new Map()
    ads.forEach((ad) => ad.adgroup_name && names.set(String(ad.adgroup_id), ad.adgroup_name))
    adGroups.forEach((ag) => ag?.adgroup_name && names.set(String(ag.adgroup_id), ag.adgroup_name))
    return names
  }, [ads, adGroups])
  const getAdGroupName = (id) => adGroupNameById.get(String(id)) || String(id)

  const rows = useMemo(() => {
    if (!isMultiAdGroup) return displayedAds.map((ad) => ({ type: "ad", ad }))
    const out = []
    adGroupIds.forEach((adGroupId) => {
      const id = String(adGroupId)
      const groupAds = displayedAds.filter((ad) => String(ad.adgroup_id) === id)
      if (groupAds.length > 0) {
        groupAds.forEach((ad) => out.push({ type: "ad", ad }))
      } else if (!query && !ads.some((ad) => String(ad.adgroup_id) === id)) {
        out.push({ type: "empty", adGroupId: id })
      }
    })
    return out
  }, [isMultiAdGroup, displayedAds, adGroupIds, ads, query])

  const setSelected = (adsToChange, checked) => {
    const ids = new Set(adsToChange.map((ad) => ad.smart_plus_ad_id))
    if (checked) {
      const toAdd = [...ids].filter((id) => !selectedIds.has(id)).map((id) => adsById.get(id)).filter(Boolean)
      onSelectionChange([...selectedAds, ...toAdd])
    } else {
      onSelectionChange(selectedAds.filter((ad) => !ids.has(ad.smart_plus_ad_id)))
    }
  }

  const toggleAd = (ad) => setSelected([ad], !selectedIds.has(ad.smart_plus_ad_id))

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allDisplayedSelected =
    displayedAds.length > 0 && displayedAds.every((ad) => selectedIds.has(ad.smart_plus_ad_id))

  const renderNameTooltip = (value, className = "text-gray-900") => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("block text-xs truncate", className)}>{truncateText(value)}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[360px] break-words text-xs">
        {value || "Unknown"}
      </TooltipContent>
    </Tooltip>
  )

  const renderThumbnail = (url, sizeClass = "w-12 h-12 rounded-md") => (
    <div className={cn("overflow-hidden bg-gray-100 flex-shrink-0", sizeClass)}>
      {url ? (
        <img
          src={url}
          alt="Creative thumbnail"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = "none"
            e.target.nextSibling.style.display = "flex"
          }}
        />
      ) : null}
      <div className={`w-full h-full items-center justify-center ${url ? "hidden" : "flex"}`}>
        <ImageOff className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  )

  const renderStatus = (status) => {
    const meta = getStatusMeta(status)
    return (
      <div className="text-right">
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", meta.className)}>{meta.label}</span>
      </div>
    )
  }

  // One creative tile in the parent ad's horizontal strip (display only): thumbnail, name below
  const renderCreative = (creative) => (
    <div key={creative.ad_material_id} className="w-24 flex-shrink-0">
      {renderThumbnail(creative.thumbnail_url, "w-full h-32 rounded-lg")}
      <p className="mt-1 px-0.5 text-[11px] leading-tight text-gray-700 truncate" title={creative.name}>
        {creative.name}
      </p>
    </div>
  )

  const renderAd = (ad) => {
    // Show creatives while filtering so matches inside an ad aren't hidden
    const isExpanded = Boolean(query) || expandedIds.has(ad.smart_plus_ad_id)
    const count = ad.creatives.length
    const isSelected = selectedIds.has(ad.smart_plus_ad_id)
    return (
      <div
        key={ad.smart_plus_ad_id}
        className={cn(
          "rounded-xl border transition-colors",
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
        )}
      >
        <label className={cn("grid gap-2 items-center p-3 cursor-pointer", gridCols)}>
          <Checkbox checked={isSelected} onCheckedChange={() => toggleAd(ad)} className={CHECKBOX_CLASS} />
          {renderThumbnail(ad.creatives.find((c) => c.thumbnail_url)?.thumbnail_url)}
          <div className="min-w-0">
            {renderNameTooltip(getAdName(ad), "text-gray-900 font-medium")}
            <span className="text-[11px] text-gray-500">
              {count} creative{count === 1 ? "" : "s"}
            </span>
          </div>
          {isMultiAdGroup && <div className="min-w-0">{renderNameTooltip(getAdGroupName(ad.adgroup_id), "text-gray-600")}</div>}
          {renderStatus(ad.operation_status)}
          <button
            type="button"
            aria-label={isExpanded ? "Hide creatives" : "Show creatives"}
            aria-expanded={isExpanded}
            disabled={count === 0}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleExpanded(ad.smart_plus_ad_id)
            }}
            className="flex h-4 w-4 items-center justify-center text-gray-600 hover:text-black disabled:opacity-30"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </label>
        {isExpanded && count > 0 && (
          <div className="border-t border-gray-200 px-3 pt-3 pb-2">
            {/* shadcn ScrollArea (horizontal). w-0 + min-w-full: fill the card but never widen
                the form column, so a long row scrolls instead */}
            <ScrollArea className="w-0 min-w-full">
              <div className="flex w-max gap-3 pb-3">{ad.creatives.map(renderCreative)}</div>
            </ScrollArea>
          </div>
        )}
      </div>
    )
  }

  // An ad group with no Smart+ ads: its own row, nothing to select
  const renderEmptyAdGroup = (adGroupId) => (
    <div
      key={`empty-${adGroupId}`}
      className={cn("grid gap-2 items-center p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50", gridCols)}
    >
      <div></div>
      <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">
        <ImageOff className="h-5 w-5 text-gray-300" />
      </div>
      <span className="text-xs text-gray-400">No ads yet</span>
      <div className="min-w-0">{renderNameTooltip(getAdGroupName(adGroupId), "text-gray-600")}</div>
      <div></div>
      <div></div>
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selectedIds.size} ad{selectedIds.size === 1 ? "" : "s"} selected
          </span>
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
                placeholder="Filter by ad or creative name or ID..."
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

        {canFetch && hasFetched && !isLoading && !error && ads.length === 0 && !isMultiAdGroup && (
          <div className="flex items-center justify-center py-8 text-gray-500 border border-gray-200 rounded-lg flex-shrink-0">
            No Smart+ ads found in the selected ad group{adGroupIds.length > 1 ? "s" : ""}
          </div>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <div
            className={cn(
              "grid gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-zinc-800 rounded-xl items-center shadow-sm",
              gridCols,
            )}
          >
            <div></div>
            <div>Thumbnail</div>
            <div>Ad Name</div>
            {isMultiAdGroup && <div>Ad Group</div>}
            <div className="text-right">Status</div>
            <div></div>
          </div>
        )}
      </div>

      {!isLoading && displayedAds.length > 0 && (
        <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer">
          <Checkbox
            checked={allDisplayedSelected}
            onCheckedChange={(checked) => setSelected(displayedAds, Boolean(checked))}
            className={CHECKBOX_CLASS}
          />
          Select all
        </label>
      )}

      {!isLoading && ads.length > 0 && displayedAds.length === 0 && (
        <div className="flex items-center justify-center py-6 text-gray-400 text-sm">No ads match your filter</div>
      )}

      {!isLoading && !error && rows.length > 0 && (
        // shadcn ScrollArea (vertical). Height follows the screen like the Spark posts list
        // (which is clamp(400px, 100vh - 400px, 600px) including its search and header), so
        // only a few rows show and the rest scroll. The cap goes on the viewport; Radix's inner
        // wrapper is display:table by default, forced to block so ad names still truncate
        <ScrollArea viewportClassName="max-h-[clamp(240px,calc(100vh_-_560px),440px)] [&>div]:!block">
          <TooltipProvider delayDuration={150}>
            <div className="space-y-1.5 pr-3">
              {rows.map((row) => (row.type === "ad" ? renderAd(row.ad) : renderEmptyAdGroup(row.adGroupId)))}
            </div>
          </TooltipProvider>
        </ScrollArea>
      )}
    </div>
  )
}

export default memo(TikTokExistingAdsSelector)
