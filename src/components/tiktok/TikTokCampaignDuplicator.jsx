import CampaignIcon from '@/assets/icons/folder.svg?react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Copy, Loader, RefreshCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

export default function TikTokCampaignDuplicator({ advertiserId }) {
  const { tiktokFetch } = useTikTokAuth()

  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState('')

  const [newCampaignName, setNewCampaignName] = useState('')
  const [adgroupSuffix, setAdgroupSuffix] = useState('')
  const [adSuffix, setAdSuffix] = useState('')
  const [duplicateAds, setDuplicateAds] = useState(true)
  const [status, setStatus] = useState('DISABLE')

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [duplicationResult, setDuplicationResult] = useState(null)

  // Dropdown states
  const [openCampaign, setOpenCampaign] = useState(false)
  const [campaignSearch, setCampaignSearch] = useState('')

  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow"
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`

  // Fetch campaigns for the selected advertiser
  useEffect(() => {
    if (!advertiserId) {
      setCampaigns([])
      setSelectedCampaign('')
      return
    }

    fetchCampaigns()
  }, [advertiserId])

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true)
    try {
      const params = new URLSearchParams({ advertiserId, page: '1', pageSize: '100' })
      const url = `${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`
      const response = await tiktokFetch(url)
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
      toast.error('Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // Auto-fill new campaign name when source changes
  useEffect(() => {
    if (selectedCampaign) {
      const campaign = campaigns.find(c => c.campaign_id === selectedCampaign)
      if (campaign) {
        setNewCampaignName(`${campaign.campaign_name}`)
      }
    } else {
      setNewCampaignName('')
    }
  }, [selectedCampaign, campaigns])

  const handleDuplicate = async () => {
    if (!advertiserId) return toast.error('Please select an advertiser')
    if (!selectedCampaign) return toast.error('Please select a campaign to duplicate')
    if (!newCampaignName.trim()) return toast.error('Please enter a new campaign name')

    setIsDuplicating(true)
    setDuplicationResult(null)

    try {
      const campaignObj = campaigns.find(c => c.campaign_id === selectedCampaign)
      if (campaignObj) {
        if (campaignObj.is_smart_performance_campaign) {
          setIsDuplicating(false)
          return toast.error("Cannot duplicate this campaign. Duplication of Smart Performance Campaigns (SPC) is not supported.")
        }
        if (campaignObj.adgroup_count >= 20) {
          setIsDuplicating(false)
          return toast.error(`Cannot duplicate this campaign. It has ${campaignObj.adgroup_count} ad groups, which reaches or exceeds the limit of 20.`)
        }
      }

      const payload = {
        advertiser_id: advertiserId,
        source_campaign_id: selectedCampaign,
        duplicate_ads: duplicateAds,
        new_campaign_name: newCampaignName.trim(),
        adgroup_name_suffix: adgroupSuffix,
        ad_name_suffix: adSuffix,
        status: status
      }

      const response = await tiktokFetch(`${API_BASE_URL}/api/tiktok/campaign/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Duplication failed')
      }

      setDuplicationResult(result)
      toast.success('Campaign duplicated successfully!')
    } catch (err) {
      console.error('Duplication error:', err)
      toast.error(err.message)
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Copy className="w-4 h-4 text-gray-500" />
            Duplicate Campaign Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Source Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <CampaignIcon className="w-3.5 h-3.5" />
                  Source Campaign
                </Label>
                <RefreshCcw
                  className={cn("h-3.5 w-3.5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors", loadingCampaigns && "animate-spin")}
                  onClick={fetchCampaigns}
                />
              </div>
              <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!advertiserId || loadingCampaigns}
                    className={cn(
                      "w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow group-data-[state=open]:border-blue-500 transition-colors duration-150 hover:bg-white",
                      !selectedCampaign && "text-gray-500"
                    )}
                  >
                    <div className="truncate text-left">
                      {selectedCampaign
                        ? campaigns.find(c => c.campaign_id === selectedCampaign)?.campaign_name || selectedCampaign
                        : "Select campaign to duplicate"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 bg-white shadow-lg rounded-2xl"
                  align="start"
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                >
                  <Command>
                    <CommandInput
                      placeholder="Search campaigns..."
                      value={campaignSearch}
                      onValueChange={setCampaignSearch}
                      className="bg-transparent border-none focus:ring-0"
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                      <CommandEmpty>No campaign found.</CommandEmpty>
                      <CommandGroup>
                        {campaigns.filter(c =>
                          !c.is_smart_performance_campaign &&
                          (c.adgroup_count === undefined || c.adgroup_count < 20) &&
                          (c.campaign_name || '').toLowerCase().includes(campaignSearch.toLowerCase())
                        ).map(c => (
                          <CommandItem
                            key={c.campaign_id}
                            value={c.campaign_id}
                            onSelect={() => {
                              setSelectedCampaign(c.campaign_id)
                              setOpenCampaign(false)
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                              selectedCampaign === c.campaign_id ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                 <span className={cn("font-medium", (c.operation_status === "DISABLE" || c.operation_status === "disable" || String(c.operation_status).toUpperCase() === "DISABLE" || String(c.secondary_status).includes("DISABLE")) && "text-gray-400")}>{c.campaign_name}</span>
                                 <span className="text-[10px] text-gray-400 font-mono">ID: {c.campaign_id}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                 {(c.operation_status === "ENABLE" || c.operation_status === "enable" || String(c.operation_status).toUpperCase() === "ENABLE" || String(c.secondary_status).includes("ENABLE") || c.operation_status === true || c.operation_status === "true") && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                                 {selectedCampaign === c.campaign_id && <Check className="h-4 w-4 text-black shrink-0" />}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Customization */}
          <div className="space-y-6 border-t border-gray-100 pt-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                New Campaign Name
              </Label>
              <Input
                placeholder="Enter new campaign name"
                value={newCampaignName}
                onChange={e => setNewCampaignName(e.target.value)}
                className={formInputChrome}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Group Name Suffix
                </Label>
                <Input
                  placeholder="e.g. | Copy (Leave empty for same name)"
                  value={adgroupSuffix}
                  onChange={e => setAdgroupSuffix(e.target.value)}
                  className={formInputChrome}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Name Suffix
                </Label>
                <Input
                  placeholder="e.g. | Copy (Leave empty for same name)"
                  value={adSuffix}
                  onChange={e => setAdSuffix(e.target.value)}
                  className={formInputChrome}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Initial Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={formFieldChrome}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="DISABLE">Paused (Safe)</SelectItem>
                  <SelectItem value="ENABLE">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleDuplicate}
            disabled={isDuplicating || !selectedCampaign}
            className={cn(
              "w-full h-14 rounded-2xl font-bold text-base transition-all shadow-lg",
              isDuplicating
                ? "bg-gray-100 text-gray-400"
                : "bg-black hover:bg-zinc-800 text-white"
            )}
          >
            {isDuplicating ? (
              <div className="flex items-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Duplicating Structure...
              </div>
            ) : (
              'Start Duplication'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {duplicationResult && (
        <Card className="!bg-emerald-50 border border-emerald-200 rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-900 text-sm font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Duplication Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Campaign Created</p>
                <p className="text-lg font-black text-emerald-900 mt-1">1</p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Ad Groups Created</p>
                <p className="text-lg font-black text-emerald-900 mt-1">{duplicationResult.adgroups_created}</p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Ads Created</p>
                <p className="text-lg font-black text-emerald-900 mt-1">{duplicationResult.ads_created}</p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Success Rate</p>
                <p className="text-lg font-black text-emerald-900 mt-1">
                  {duplicationResult.errors.length === 0 ? '100%' : 'Partial'}
                </p>
              </div>
            </div>
            {duplicationResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-[10px] text-red-600 font-bold uppercase mb-2">Errors encountered:</p>
                <ul className="space-y-1">
                  {duplicationResult.errors.map((err, i) => (
                    <li key={i} className="text-[10px] text-red-500">• {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
