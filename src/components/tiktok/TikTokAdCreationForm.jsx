import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'
const TIKTOK_CYAN = '#25F4EE'

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

function FieldLabel({ children }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'rgba(255,255,255,0.45)' }}>
      {children}
    </label>
  )
}

function StyledSelect({ value, onChange, children, disabled }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        color: value ? '#fff' : 'rgba(255,255,255,0.35)',
        padding: '9px 12px',
        fontSize: 14,
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </select>
  )
}

function StyledInput({ style, ...props }) {
  return (
    <Input
      {...props}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        color: '#fff',
        ...style,
      }}
    />
  )
}

export default function TikTokAdCreationForm({ advertiserId, advertisers }) {
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
    if (!selectedAdvertiser) { setCampaigns([]); setSelectedCampaign(''); return }
    setLoadingCampaigns(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '100' })
    fetch(`${API_BASE_URL}/api/tiktok/fetch-campaigns?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns || []); setSelectedCampaign(''); setAdGroups([]) })
      .catch(() => toast.error('Failed to load campaigns'))
      .finally(() => setLoadingCampaigns(false))
  }, [selectedAdvertiser])

  // Fetch ad groups when campaign changes
  useEffect(() => {
    if (!selectedCampaign || !selectedAdvertiser) { setAdGroups([]); setSelectedAdGroup(''); return }
    setLoadingAdGroups(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, campaignId: selectedCampaign, page: '1', pageSize: '100' })
    fetch(`${API_BASE_URL}/api/tiktok/fetch-adgroups?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setAdGroups(d.adGroups || d.adgroups || []); setSelectedAdGroup('') })
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Advertiser */}
      {advertisers && advertisers.length > 0 && (
        <div>
          <FieldLabel>Advertiser Account</FieldLabel>
          <StyledSelect value={selectedAdvertiser} onChange={e => setSelectedAdvertiser(e.target.value)}>
            <option value="">Select advertiser…</option>
            {advertisers.map(a => (
              <option key={a.advertiser_id || a.id} value={a.advertiser_id || a.id}>
                {a.advertiser_name || a.name}
              </option>
            ))}
          </StyledSelect>
        </div>
      )}

      {/* Campaign */}
      <div>
        <FieldLabel>Campaign {loadingCampaigns && '(loading…)'}</FieldLabel>
        <StyledSelect
          value={selectedCampaign}
          onChange={e => setSelectedCampaign(e.target.value)}
          disabled={!selectedAdvertiser || loadingCampaigns}
        >
          <option value="">Select campaign…</option>
          {campaigns.map(c => (
            <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
          ))}
        </StyledSelect>
      </div>

      {/* Ad Group */}
      <div>
        <FieldLabel>Ad Group {loadingAdGroups && '(loading…)'}</FieldLabel>
        <StyledSelect
          value={selectedAdGroup}
          onChange={e => setSelectedAdGroup(e.target.value)}
          disabled={!selectedCampaign || loadingAdGroups}
        >
          <option value="">Select ad group…</option>
          {adGroups.map(g => (
            <option key={g.adgroup_id} value={g.adgroup_id}>{g.adgroup_name}</option>
          ))}
        </StyledSelect>
      </div>

      {/* Ad Name */}
      <div>
        <FieldLabel>Ad Name</FieldLabel>
        <StyledInput
          type="text"
          placeholder="My TikTok Ad"
          value={adName}
          onChange={e => setAdName(e.target.value)}
        />
      </div>

      {/* Video Upload */}
      <div>
        <FieldLabel>Video (required) — .mp4 / .mov</FieldLabel>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${videoFile ? TIKTOK_CYAN + '88' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12,
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: videoFile ? 'rgba(37,244,238,0.04)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s',
          }}
        >
          {videoPreview ? (
            <video src={videoPreview} controls className="mx-auto max-h-40 rounded-lg" />
          ) : (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Click to select video file
            </p>
          )}
          {isUploading && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, background: `linear-gradient(90deg, ${TIKTOK_CYAN}, ${TIKTOK_PINK})` }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: TIKTOK_CYAN }}>Uploading…</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime"
          className="hidden"
          onChange={handleVideoSelect}
        />
      </div>

      {/* Ad Text */}
      <div>
        <FieldLabel>Ad Copy / Text</FieldLabel>
        <textarea
          value={adText}
          onChange={e => setAdText(e.target.value)}
          placeholder="Check this out! 🔥"
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#fff',
            padding: '9px 12px',
            fontSize: 14,
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </div>

      {/* CTA */}
      <div>
        <FieldLabel>Call to Action</FieldLabel>
        <StyledSelect value={cta} onChange={e => setCta(e.target.value)}>
          {CTA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </StyledSelect>
      </div>

      {/* Landing URL */}
      <div>
        <FieldLabel>Landing Page URL</FieldLabel>
        <StyledInput
          type="url"
          placeholder="https://example.com"
          value={landingUrl}
          onChange={e => setLandingUrl(e.target.value)}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 rounded-xl font-semibold text-sm mt-1"
        style={{
          background: isSubmitting ? 'rgba(254,44,85,0.4)' : `linear-gradient(135deg, ${TIKTOK_PINK}, #c9184a)`,
          color: '#fff',
          border: 'none',
          boxShadow: isSubmitting ? 'none' : `0 4px 20px ${TIKTOK_PINK}55`,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Creating Ad…' : 'Create TikTok Ad'}
      </Button>
    </form>
  )
}
