"use client"

import { useState, useCallback, memo, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Loader, ChevronDown, ChevronRight, ImageOff, RefreshCw, Search } from "lucide-react"
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
  "ad_id_v2",
  "smart_plus_ad_id",
  "campaign_automation_type",
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

// checkbox | chevron | thumbnail | ad name | ad group | status
const GRID_COLS = "grid-cols-[20px_16px_48px_minmax(0,1fr)_minmax(0,0.72fr)_90px]"

const isActive = (status) => String(status || "").toUpperCase() === "ENABLE"

// TikTok returns "YYYY-MM-DD HH:MM:SS" in UTC
const parseTikTokTime = (value) => {
  if (!value) return 0
  const t = Date.parse(String(value).replace(" ", "T") + "Z")
  return Number.isFinite(t) ? t : 0
}

// Works on both ads and groups: each has name, status and create_time
const sortRows = (items, sortMode) => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const activeDelta = Number(isActive(b.status)) - Number(isActive(a.status))
    if (activeDelta !== 0) return activeDelta
    if (sortMode === "name_az") return (a.name || "").localeCompare(b.name || "")
    if (sortMode === "date_oldest") return parseTikTokTime(a.create_time) - parseTikTokTime(b.create_time)
    return parseTikTokTime(b.create_time) - parseTikTokTime(a.create_time)
  })
  return sorted
}

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

const toRow = (ad) => ({ ...ad, name: ad.ad_name, status: ad.operation_status })

/**
 * Upgraded Smart+ ads come back from /ad/get/ as one row per creative, linked to
 * their parent ad by smart_plus_ad_id. Fold those into one group per parent;
 * every other ad is its own single-ad group.
 */
const buildGroups = (ads) => {
  const groups = new Map()
  for (const ad of ads) {
    const parentId = ad.smart_plus_ad_id
    const key = parentId ? `sp:${parentId}` : `ad:${ad.ad_id}`
    if (!groups.has(key)) {
      groups.set(key, { key, parentId: parentId || null, isGroup: Boolean(parentId), creatives: [] })
    }
    groups.get(key).creatives.push(toRow(ad))
  }

  return [...groups.values()].map((g) => {
    const first = g.creatives[0]
    // Single ad: sort/filter fields on the wrapper, the ad itself stays in creatives[0]
    if (!g.isGroup) return { ...g, name: first.name, status: first.status, create_time: first.create_time, ad_id: first.ad_id }
    const times = g.creatives.map((c) => parseTikTokTime(c.create_time))
    const newest = g.creatives[times.indexOf(Math.max(...times))]
    return {
      ...g,
      name: first.smart_plus_ad_name || `Smart+ ad ${g.parentId}`,
      status:
        first.smart_plus_operation_status ||
        (g.creatives.some((c) => isActive(c.status)) ? "ENABLE" : first.status),
      create_time: newest?.create_time,
      adgroup_name: first.adgroup_name,
      thumbnail_url: g.creatives.find((c) => c.thumbnail_url)?.thumbnail_url || null,
    }
  })
}

const matches = (q, ...values) => values.some((v) => String(v || "").toLowerCase().includes(q))

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
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  // Only the latest request may write results
  const requestIdRef = useRef(0)

  const selectedIds = useMemo(() => new Set(selectedAds.map((ad) => ad.ad_id)), [selectedAds])

  // Stable key so the fetch effect only re-runs when the actual ad group selection changes
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
        includeSmartPlusParents: "true",
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

  const groups = useMemo(() => buildGroups(ads), [ads])

  const query = filterQuery.trim().toLowerCase()

  // A group whose own name/ID matches keeps all its creatives; otherwise only matching creatives stay
  const displayedGroups = useMemo(() => {
    const filtered = groups
      .map((g) => {
        if (!query) return g
        if (!g.isGroup) return matches(query, g.name, g.ad_id) ? g : null
        if (matches(query, g.name, g.parentId)) return g
        const creatives = g.creatives.filter((c) => matches(query, c.name, c.ad_id))
        return creatives.length > 0 ? { ...g, creatives } : null
      })
      .filter(Boolean)
      .map((g) => (g.isGroup ? { ...g, creatives: sortRows(g.creatives, sortMode) } : g))
    return sortRows(filtered, sortMode)
  }, [groups, query, sortMode])

  // Every selectable ad currently visible (single ads + creatives inside groups)
  const displayedAds = useMemo(
    () => displayedGroups.flatMap((g) => g.creatives),
    [displayedGroups],
  )

  const setSelected = (adsToChange, checked) => {
    const ids = new Set(adsToChange.map((ad) => ad.ad_id))
    if (checked) {
      onSelectionChange([...selectedAds, ...adsToChange.filter((ad) => !selectedIds.has(ad.ad_id))])
    } else {
      onSelectionChange(selectedAds.filter((ad) => !ids.has(ad.ad_id)))
    }
  }

  const toggleAd = (ad) => setSelected([ad], !selectedIds.has(ad.ad_id))

  const getSelectedCount = (group) => group.creatives.filter((c) => selectedIds.has(c.ad_id)).length

  // Partially or fully selected → clear the group; otherwise select every creative in it
  const toggleGroup = (group) => setSelected(group.creatives, getSelectedCount(group) === 0)

  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allDisplayedSelected = displayedAds.length > 0 && displayedAds.every((ad) => selectedIds.has(ad.ad_id))

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

  const renderThumbnail = (url) => (
    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
      {url ? (
        <img
          src={url}
          alt="Ad thumbnail"
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

  const rowClass = (isSelected) =>
    cn(
      "grid gap-2 items-center p-3 rounded-xl border cursor-pointer transition-colors",
      GRID_COLS,
      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
    )

  const renderSingleAd = (ad, { nested = false } = {}) => {
    const isSelected = selectedIds.has(ad.ad_id)
    return (
      <label key={ad.ad_id} className={cn(rowClass(isSelected), nested && "ml-6")}>
        <Checkbox checked={isSelected} onCheckedChange={() => toggleAd(ad)} />
        <div />
        {renderThumbnail(ad.thumbnail_url)}
        <div className="min-w-0">{renderNameTooltip(ad.name)}</div>
        <div className="min-w-0">
          {nested ? <span className="text-xs text-gray-400">—</span> : renderNameTooltip(ad.adgroup_name)}
        </div>
        {renderStatus(ad.status)}
      </label>
    )
  }

  const renderGroup = (group) => {
    // Show creatives while filtering so matches inside a group aren't hidden
    const isExpanded = Boolean(query) || expandedKeys.has(group.key)
    const count = group.creatives.length
    const selectedCount = getSelectedCount(group)
    const allSelected = selectedCount === count
    return (
      <div key={group.key} className="space-y-1.5">
        <label className={rowClass(allSelected)}>
          <Checkbox checked={allSelected} onCheckedChange={() => toggleGroup(group)} />
          <button
            type="button"
            aria-label={isExpanded ? "Hide creatives" : "Show creatives"}
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleExpanded(group.key)
            }}
            className="flex h-4 w-4 items-center justify-center text-gray-600 hover:text-black"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {renderThumbnail(group.thumbnail_url)}
          <div className="min-w-0">
            {renderNameTooltip(group.name, "text-gray-900 font-medium")}
            <span className="text-[11px] text-gray-500">
              {count} creative{count === 1 ? "" : "s"}
              {selectedCount > 0 && !allSelected && ` · ${selectedCount} of ${count} selected`}
            </span>
          </div>
          <div className="min-w-0">{renderNameTooltip(group.adgroup_name)}</div>
          {renderStatus(group.status)}
        </label>
        {isExpanded && group.creatives.map((creative) => renderSingleAd(creative, { nested: true }))}
      </div>
    )
  }

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
            <div></div>
            <div className="-ml-2">Thumbnail</div>
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
          <Checkbox checked={allDisplayedSelected} onCheckedChange={(checked) => setSelected(displayedAds, Boolean(checked))} />
          Select all
        </label>
      )}

      {!isLoading && ads.length > 0 && displayedGroups.length === 0 && (
        <div className="flex items-center justify-center py-6 text-gray-400 text-sm">No ads match your filter</div>
      )}

      {!isLoading && displayedGroups.length > 0 && (
        <ScrollArea className="h-[550px] outline-none focus:outline-none">
          <TooltipProvider delayDuration={150}>
            <div className="space-y-1.5">
              {displayedGroups.map((g) => (g.isGroup ? renderGroup(g) : renderSingleAd(g.creatives[0])))}
            </div>
          </TooltipProvider>
        </ScrollArea>
      )}
    </div>
  )
}

export default memo(TikTokExistingAdsSelector)
