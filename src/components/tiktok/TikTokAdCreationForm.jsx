"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Loader, 
  Upload, 
  RefreshCcw, 
  FileText, 
  Link as LinkIcon, 
  PlayCircle,
  Video
} from "lucide-react"
import TextareaAutosize from 'react-textarea-autosize'

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
  // Constants from Meta Form for exact visual match
  const formFieldChrome = "border-gray-300 rounded-2xl py-4.5 bg-white shadow";
  const formInputChrome = `${formFieldChrome} focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0`;
  const formTextareaChrome = "w-full border border-gray-300 rounded-2xl bg-white px-3 pt-2.5 pb-2.5 text-sm leading-5 resize-none shadow focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0";

  // State
  const [selectedAdvertiser, setSelectedAdvertiser] = useState(advertiserId || '')
  const [campaigns, setCampaigns] = useState([])
  const [adGroups, setAdGroups] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedAdGroup, setSelectedAdGroup] = useState('')
  const [adName, setAdName] = useState('')
  const [adText, setAdText] = useState('')
  const [cta, setCta] = useState('SHOP_NOW')
  const [landingUrl, setLandingUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingAdGroups, setLoadingAdGroups] = useState(false)
  
  const fileRef = useRef()

  // Sync advertiser prop
  useEffect(() => {
    if (advertiserId) setSelectedAdvertiser(advertiserId)
  }, [advertiserId])

  // Fetch campaigns when advertiser changes
  useEffect(() => {
    if (!selectedAdvertiser) { 
      setCampaigns([]); 
      setSelectedCampaign(''); 
      return 
    }
    setLoadingCampaigns(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
    fetch(`${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { 
        setCampaigns(d.campaigns || []); 
        setSelectedCampaign(''); 
        setAdGroups([]) 
      })
      .catch(() => toast.error('Failed to load campaigns'))
      .finally(() => setLoadingCampaigns(false))
  }, [selectedAdvertiser])

  // Fetch ad groups when campaign changes
  useEffect(() => {
    if (!selectedCampaign || !selectedAdvertiser) { 
      setAdGroups([]); 
      setSelectedAdGroup(''); 
      return 
    }
    setLoadingAdGroups(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, campaignId: selectedCampaign, page: '1', pageSize: '100' })
    fetch(`${API_BASE_URL}/api/tiktok/fetch-adgroups?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { 
        setAdGroups(d.adGroups || d.adgroups || []); 
        setSelectedAdGroup('') 
      })
      .catch(() => toast.error('Failed to load ad groups'))
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
    if (!selectedAdvertiser) return toast.error('Please select an advertiser')
    if (!selectedAdGroup) return toast.error('Please select an ad group')
    if (!videoFile) return toast.error('Video is required for TikTok ads')
    if (!adName.trim()) return toast.error('Ad name is required')

    setIsSubmitting(true)
    setIsUploading(true)

    try {
      // Step 1: Upload video
      toast.info('Uploading video...')
      const formData = new FormData()
      formData.append('videoFile', videoFile)
      const uploadParams = new URLSearchParams({ advertiserId: selectedAdvertiser })
      const uploadRes = await fetch(`${API_BASE_URL}/api/tiktok/upload-video?${uploadParams}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Video upload failed')
      }
      setUploadProgress(100)
      setIsUploading(false)
      toast.success('Video uploaded!')

      // Step 2: Create ad
      toast.info('Creating ad...')
      const createRes = await fetch(`${API_BASE_URL}/api/tiktok/create-ad`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiserId: selectedAdvertiser,
          adgroupId: selectedAdGroup,
          adName: adName.trim(),
          creatives: [{
            video_id: uploadData.videoId,
            ad_text: adText,
            call_to_action: cta,
            landing_page_url: landingUrl,
          }],
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Ad creation failed')
      }
      toast.success('🎉 TikTok ad created successfully!')
      // Reset form
      setAdName(''); setAdText(''); setLandingUrl(''); setCta('SHOP_NOW')
      setVideoFile(null); setVideoPreview(null); setUploadProgress(0)
    } catch (err) {
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
                {advertisers?.map(a => (
                  <SelectItem 
                    key={a.advertiser_id || a.id} 
                    value={a.advertiser_id || a.id}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg m-1"
                  >
                    {a.advertiser_name || a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#e5e7eb transparent'
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CTA */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call to Action
              </Label>
              <Select value={cta} onValueChange={setCta}>
                <SelectTrigger className={formFieldChrome}>
                  <SelectValue placeholder="Select CTA" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border-gray-200 max-h-64">
                  {CTA_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="cursor-pointer hover:bg-gray-50 rounded-lg m-1">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* URL */}
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
