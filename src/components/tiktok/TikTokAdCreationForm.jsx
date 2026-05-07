"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { cn } from "@/lib/utils"
import {
  FileText,
  Link as LinkIcon,
  Loader,
  PlayCircle,
  RefreshCcw,
  Upload,
  Users,
  Video
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import TextareaAutosize from 'react-textarea-autosize'
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'

const CTA_OPTIONS = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'WATCH_NOW', label: 'Watch Now' },
]

export default function TikTokAdCreationForm({ advertiserId, advertisers }) {
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow"
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`
  const formTextareaChrome = "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"

  const { tiktokFetch, tiktokUser } = useTikTokAuth()

  useEffect(() => {
    console.group('🎯 [TikTokAdCreationForm] Mounted')
    console.log('  advertiserId prop  :', advertiserId || 'NONE')
    console.log('  advertisers prop   :', advertisers?.length, 'items', advertisers)
    console.log('  tiktokUser         :', tiktokUser)
    console.log('  localStorage uid   :', localStorage.getItem('tiktok_uid'))
    console.log('  localStorage token :', localStorage.getItem('tiktok_token') ? localStorage.getItem('tiktok_token').slice(0,12)+'...' : 'MISSING')
    console.log('  localStorage adIds :', localStorage.getItem('tiktok_advertiser_ids'))
    console.log('  API_BASE_URL       :', API_BASE_URL)
    console.groupEnd()
  }, [])

  const [selectedAdvertiser, setSelectedAdvertiser] = useState(advertiserId || '')
  const [campaigns, setCampaigns] = useState([])
  const [adGroups, setAdGroups] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedAdGroup, setSelectedAdGroup] = useState('')
  const [adName, setAdName] = useState('')
  const [adText, setAdText] = useState('')
  const [cta, setCta] = useState(['SHOP_NOW'])
  const [landingUrl, setLandingUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingAdGroups, setLoadingAdGroups] = useState(false)
  const [identities, setIdentities] = useState([])
  const [selectedIdentity, setSelectedIdentity] = useState('')
  const [loadingIdentities, setLoadingIdentities] = useState(false)

  const fileRef = useRef()

  const toggleCta = (value) => {
    setCta(prev =>
      prev.includes(value)
        ? (prev.length > 1 ? prev.filter(v => v !== value) : prev)
        : [...prev, value]
    )
  }

  useEffect(() => {
    if (advertiserId) setSelectedAdvertiser(advertiserId)
  }, [advertiserId])

  useEffect(() => {
    if (!selectedAdvertiser) {
      console.log('⚠️ [TikTok Form] No advertiser selected — skipping campaign fetch')
      setCampaigns([])
      setSelectedCampaign('')
      return
    }
    setLoadingCampaigns(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
    const url = `${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`
    console.group(`📡 [TikTok Form] Fetching campaigns for advertiser: ${selectedAdvertiser}`)
    console.log('  URL                :', url)
    console.log('  x-tiktok-user-id   :', localStorage.getItem('tiktok_uid') || 'MISSING')
    console.log('  x-tiktok-token     :', localStorage.getItem('tiktok_token') ? '✅ present' : '❌ MISSING')
    console.log('  x-tiktok-adv-ids   :', localStorage.getItem('tiktok_advertiser_ids') || 'MISSING')
    console.groupEnd()
    tiktokFetch(url)
      .then(async r => {
        const body = await r.text()
        console.group(`📬 [TikTok Form] fetch-campaigns response`)
        console.log('  HTTP Status        :', r.status, r.statusText)
        console.log('  Body               :', body)
        console.groupEnd()
        let d
        try { d = JSON.parse(body) } catch { d = {} }
        return d
      })
      .then(d => {
        console.log(`✅ [TikTok Form] Campaigns loaded: ${d.campaigns?.length ?? 0} item(s)`, d.campaigns)
        setCampaigns(d.campaigns || [])
        setSelectedCampaign('')
        setAdGroups([])
      })
      .catch(err => {
        console.error('❌ [TikTok Form] fetch-campaigns FAILED:', err)
        toast.error('Failed to load campaigns')
      })
      .finally(() => setLoadingCampaigns(false))

    setLoadingIdentities(true)
    const identityUrl = `${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${selectedAdvertiser}`
    tiktokFetch(identityUrl)
      .then(r => r.json())
      .then(d => {
        const list = d.identities || []
        console.log(`✅ [TikTok Form] Identities loaded: ${list.length}`, list)
        setIdentities(list)
        if (list.length > 0) {
          const best = list.find(i => i.identity_type === 'TT_USER') ||
                       list.find(i => i.identity_type === 'BC_AUTH_TT') ||
                       list[0]
          setSelectedIdentity(best.identity_id)
        } else {
          setSelectedIdentity('CUSTOMIZED_USER')
        }
      })
      .catch(err => console.error('❌ [TikTok Form] Failed to fetch identities:', err))
      .finally(() => setLoadingIdentities(false))
  }, [selectedAdvertiser])

  useEffect(() => {
    if (!selectedCampaign || !selectedAdvertiser) {
      console.log('⚠️ [TikTok Form] No campaign or advertiser — skipping ad group fetch')
      setAdGroups([])
      setSelectedAdGroup('')
      return
    }
    setLoadingAdGroups(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, campaignId: selectedCampaign, page: '1', pageSize: '100' })
    const url = `${API_BASE_URL}/api/tiktok/fetch-adgroups?${params}`
    console.group(`📡 [TikTok Form] Fetching ad groups for campaign: ${selectedCampaign}`)
    console.log('  URL                :', url)
    console.log('  x-tiktok-user-id   :', localStorage.getItem('tiktok_uid') || 'MISSING')
    console.log('  x-tiktok-token     :', localStorage.getItem('tiktok_token') ? '✅ present' : '❌ MISSING')
    console.groupEnd()
    tiktokFetch(url)
      .then(async r => {
        const body = await r.text()
        console.group(`📬 [TikTok Form] fetch-adgroups response`)
        console.log('  HTTP Status        :', r.status, r.statusText)
        console.log('  Body               :', body)
        console.groupEnd()
        let d
        try { d = JSON.parse(body) } catch { d = {} }
        return d
      })
      .then(d => {
        console.log(`✅ [TikTok Form] Ad groups loaded: ${d.adGroups?.length ?? d.adgroups?.length ?? 0} item(s)`, d.adGroups || d.adgroups)
        setAdGroups(d.adGroups || d.adgroups || [])
        setSelectedAdGroup('')
      })
      .catch(err => {
        console.error('❌ [TikTok Form] fetch-adgroups FAILED:', err)
        toast.error('Failed to load ad groups')
      })
      .finally(() => setLoadingAdGroups(false))
  }, [selectedCampaign, selectedAdvertiser])

  const handleVideoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setUploadProgress(0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.group('🚀 [TikTok Form] handleSubmit triggered')
    console.log('  selectedAdvertiser :', selectedAdvertiser || 'MISSING')
    console.log('  selectedCampaign   :', selectedCampaign || 'MISSING')
    console.log('  selectedAdGroup    :', selectedAdGroup || 'MISSING')
    console.log('  adName             :', adName.trim() || 'MISSING')
    console.log('  cta                :', cta)
    console.log('  videoFile          :', videoFile?.name || 'MISSING')
    console.groupEnd()

    if (!selectedAdvertiser) return toast.error('Please select an advertiser')
    if (!selectedAdGroup) return toast.error('Please select an ad group')
    if (!selectedIdentity) return toast.error('Please select a TikTok Identity/Profile')
    if (!videoFile) return toast.error('Video is required for TikTok ads')
    if (!adName.trim()) return toast.error('Ad name is required')
    if (cta.length === 0) return toast.error('Please select at least one Call to Action')

    setIsSubmitting(true)
    setIsUploading(true)

    try {
      toast.info('Uploading video...')
      const formData = new FormData()
      formData.append('videoFile', videoFile)
      const uploadParams = new URLSearchParams({ advertiserId: selectedAdvertiser })
      const uploadUrl = `${API_BASE_URL}/api/tiktok/upload-video?${uploadParams}`
      console.group(`📡 [TikTok Form] Uploading video`)
      console.log('  URL                :', uploadUrl)
      console.log('  File name          :', videoFile.name)
      console.log('  File size          :', (videoFile.size / 1024 / 1024).toFixed(2), 'MB')
      console.log('  x-tiktok-user-id   :', localStorage.getItem('tiktok_uid') || 'MISSING')
      console.log('  x-tiktok-token     :', localStorage.getItem('tiktok_token') ? '✅ present' : '❌ MISSING')
      console.groupEnd()
      const uploadRes = await tiktokFetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      const uploadRawText = await uploadRes.text()
      console.group('📬 [TikTok Form] upload-video response')
      console.log('  HTTP Status        :', uploadRes.status, uploadRes.statusText)
      console.log('  Content-Type       :', uploadRes.headers.get('content-type'))
      console.log('  Raw Body           :', uploadRawText)
      console.groupEnd()

      let uploadData = {}
      try {
        uploadData = JSON.parse(uploadRawText)
        console.log('  Parsed uploadData  :', uploadData)
      } catch (parseErr) {
        console.error('❌ [TikTok Form] upload-video response is NOT valid JSON:', parseErr.message)
        throw new Error(`Server returned non-JSON response (${uploadRes.status}): ${uploadRawText.slice(0, 200)}`)
      }

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || uploadData.message || `Upload failed with status ${uploadRes.status}`)
      }
      setUploadProgress(100)
      setIsUploading(false)
      toast.success('Video uploaded!')

      toast.info(`Creating ${cta.length} ad(s)...`)
      const creatives = cta.map(action => ({
        video_id: uploadData.videoId,
        ad_text: adText,
        call_to_action: action,
        landing_page_url: landingUrl,
        ad_name: `${adName.trim()} (${action})`
      }))
      const createPayload = {
        advertiserId: selectedAdvertiser,
        adgroupId: selectedAdGroup,
        identityId: selectedIdentity === 'CUSTOMIZED_USER' ? undefined : selectedIdentity,
        identityType: selectedIdentity === 'CUSTOMIZED_USER' ? 'CUSTOMIZED_USER' : undefined,
        adName: adName.trim(),
        creatives
      }
      console.group(`📡 [TikTok Form] Creating ${cta.length} ad(s)`)
      console.log('  URL                :', `${API_BASE_URL}/api/tiktok/create-ad`)
      console.log('  Payload            :', JSON.stringify(createPayload, null, 2))
      console.groupEnd()
      const createRes = await tiktokFetch(`${API_BASE_URL}/api/tiktok/create-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      })
      const createData = await createRes.json()
      console.group('📬 [TikTok Form] create-ad response')
      console.log('  HTTP Status        :', createRes.status, createRes.statusText)
      console.log('  Data               :', createData)
      console.groupEnd()
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Ad creation failed')
      }
      toast.success(`🎉 ${cta.length} TikTok ad(s) created successfully!`)
      setAdName(''); setAdText(''); setLandingUrl(''); setCta(['SHOP_NOW'])
      setVideoFile(null); setVideoPreview(null); setUploadProgress(0)
    } catch (err) {
      console.error('❌ [TikTok Form] handleSubmit error:', err.message)
      toast.error(err.message)
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Identity Section */}
      <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">

          {/* Advertiser Account */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Advertiser Account
            </Label>
            <Select
              value={selectedAdvertiser}
              onValueChange={setSelectedAdvertiser}
              disabled={!advertisers || advertisers.length === 0}
            >
              <SelectTrigger className={formFieldChrome}>
                <SelectValue placeholder="Select advertiser account" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-gray-200">
                {advertisers?.map(adv => (
                  <SelectItem
                    key={adv.advertiser_id || adv.id}
                    value={adv.advertiser_id || adv.id}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg m-1"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{adv.advertiser_name || adv.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">ID: {adv.advertiser_id || adv.id}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post As (Identity) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Post As (Identity)
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-tiktok-pink"
                onClick={() => {
                  if (!selectedAdvertiser) return toast.error("Select an advertiser first")
                  toast.promise(
                    tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${selectedAdvertiser}`)
                      .then(r => r.json())
                      .then(d => {
                        if (d.error) throw new Error(d.error)
                        const count = d.identities?.length || 0
                        if (count === 0) return "TikTok API returned 0 identities for this advertiser."
                        return `Found ${count} identities! Check the dropdown.`
                      }),
                    {
                      loading: 'Checking TikTok API...',
                      success: (msg) => msg,
                      error: (err) => `Debug Error: ${err.message}`
                    }
                  )
                }}
              >
                <RefreshCcw className={cn("w-3 h-3", loadingIdentities && "animate-spin")} />
              </Button>
              {loadingIdentities && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
            </div>
            <Select
              value={selectedIdentity}
              onValueChange={setSelectedIdentity}
              disabled={!selectedAdvertiser || loadingIdentities}
            >
              <SelectTrigger className={formFieldChrome}>
                <SelectValue placeholder="Select TikTok identity" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl shadow-lg border-gray-200">
                <SelectItem value="CUSTOMIZED_USER" className="cursor-pointer hover:bg-gray-50 rounded-lg m-1">
                  <div className="flex flex-col">
                    <span className="font-medium italic">Custom Identity (No Link Required)</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Uses Ad Name as Profile Name</span>
                  </div>
                </SelectItem>
                {identities.map(i => (
                  <SelectItem
                    key={i.identity_id}
                    value={i.identity_id}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg m-1"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{i.display_name || i.identity_id}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{i.identity_type}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {identities.length === 0 && !loadingIdentities && selectedAdvertiser && (
              <p className="text-[10px] text-emerald-600 mt-1">
                💡 No linked accounts found. "Custom Identity" will be used.
              </p>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Placement Section */}
      <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-gray-500" />
            Placement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Campaign */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </Label>
                {loadingCampaigns && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <Select
                value={selectedCampaign}
                onValueChange={setSelectedCampaign}
                disabled={!selectedAdvertiser || loadingCampaigns}
              >
                <SelectTrigger className={formFieldChrome}>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border-gray-200">
                  {campaigns.map(c => (
                    <SelectItem key={c.campaign_id} value={c.campaign_id} className="cursor-pointer hover:bg-gray-50 rounded-lg m-1">
                      {c.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ad Group */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Group
                </Label>
                {loadingAdGroups && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
              </div>
              <Select
                value={selectedAdGroup}
                onValueChange={setSelectedAdGroup}
                disabled={!selectedCampaign || loadingAdGroups}
              >
                <SelectTrigger className={formFieldChrome}>
                  <SelectValue placeholder="Select ad group" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border-gray-200">
                  {adGroups.map(g => (
                    <SelectItem key={g.adgroup_id} value={g.adgroup_id} className="cursor-pointer hover:bg-gray-50 rounded-lg m-1">
                      {g.adgroup_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Ad Details Section */}
      <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Ad Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ad Name
            </Label>
            <Input
              type="text"
              placeholder="Enter your ad name"
              value={adName}
              onChange={e => setAdName(e.target.value)}
              className={formInputChrome}
            />
          </div>
        </CardContent>
      </Card>

      {/* Creative Section */}
      <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Video className="w-4 h-4 text-gray-500" />
            Creative
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Video Upload */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Video (.mp4, .mov)
            </Label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                "group cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                videoFile ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="hidden"
                onChange={handleVideoSelect}
              />
              <div className="flex flex-col items-center gap-3">
                {videoPreview ? (
                  <div className="relative group">
                    <video src={videoPreview} className="mx-auto max-h-48 rounded-xl shadow-md border border-white" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <RefreshCcw className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Click to upload video</p>
                      <p className="text-xs text-gray-400 mt-1">Recommended ratio: 9:16 for TikTok</p>
                    </div>
                  </>
                )}
              </div>
              {isUploading && (
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-medium text-emerald-600 mt-1 uppercase tracking-widest">
                    Uploading {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ad Text */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ad Copy / Caption
            </Label>
            <TextareaAutosize
              value={adText}
              onChange={e => setAdText(e.target.value)}
              placeholder="What's your ad about? 🔥"
              minRows={3}
              maxRows={10}
              className={formTextareaChrome}
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CTA Multi-select */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                Call to Action
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">Multi-select</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {CTA_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleCta(o.value)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm",
                      cta.includes(o.value)
                        ? "bg-black text-white border-black scale-[1.02]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Landing URL */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" />
                Landing Page URL
              </Label>
              <Input
                type="url"
                placeholder="https://myshop.com/product"
                value={landingUrl}
                onChange={e => setLandingUrl(e.target.value)}
                className={formInputChrome}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-base transition-all shadow-lg",
            isSubmitting
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-zinc-800 text-white hover:scale-[1.01] active:scale-[0.99]"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              {isUploading ? 'Uploading Media...' : 'Creating TikTok Ad...'}
            </div>
          ) : (
            'Create TikTok Ad'
          )}
        </Button>
        <p className="text-center text-[11px] text-gray-400 mt-3 font-medium uppercase tracking-widest">
          Your ad will be live after TikTok's review process
        </p>
      </div>

    </form>
  )
}