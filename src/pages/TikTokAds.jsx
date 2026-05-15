import Header from '@/components/header'
import TikTokAdCreationForm from '@/components/tiktok/TikTokAdCreationForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useIntercom } from '@/lib/useIntercom'
import { Loader2, Video } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import useTikTokAdvertiserSettings from '@/lib/useTikTokAdvertiserSettings'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

export default function TikTokAds() {
  const navigate = useNavigate()
  const { isTikTokLoggedIn, tiktokUser, tiktokAdvertisers, refreshTikTokUser, logoutTikTok, isLoading: authLoading } = useTikTokAuth()
  const { showMessenger, hideMessenger } = useIntercom()
  
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('')
  const [adName, setAdName] = useState('')
  const [adText, setAdText] = useState('')
  const [cta, setCta] = useState(['SHOP_NOW'])
  const [landingUrl, setLandingUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [driveFiles, setDriveFiles] = useState([])
  const [dropboxFiles, setDropboxFiles] = useState([])
  const [selectedIdentity, setSelectedIdentity] = useState('')
  
  // Load preferences for selected advertiser
  const { settings: advertiserPrefs, loading: prefsLoading } = useTikTokAdvertiserSettings(selectedAdvertiser)

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      toast.success('🎉 TikTok connected successfully!')
      refreshTikTokUser()
      window.history.replaceState({}, '', '/tiktok-ads')
    }
  }, [refreshTikTokUser])

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isTikTokLoggedIn) {
      navigate('/tiktok-login')
    }
  }, [isTikTokLoggedIn, authLoading, navigate])

  // Auto-select first advertiser
  useEffect(() => {
    if (tiktokAdvertisers.length > 0 && !selectedAdvertiser) {
      const firstId = tiktokAdvertisers[0].advertiser_id || tiktokAdvertisers[0].id
      setSelectedAdvertiser(firstId)
    }
  }, [tiktokAdvertisers, selectedAdvertiser])

  // Sync state with preferences when they load
  useEffect(() => {
    if (advertiserPrefs) {
      // 1. Default Identity (only if not already set)
      if (!selectedIdentity && advertiserPrefs.defaultIdentityId) {
        setSelectedIdentity(advertiserPrefs.defaultIdentityId);
      }
      
      // 2. Default CTAs
      if (cta.length === 1 && cta[0] === 'SHOP_NOW' && advertiserPrefs.defaultCTAs?.length > 0) {
         setCta(advertiserPrefs.defaultCTAs);
      }

      // 3. Default Landing URL
      if (!landingUrl && advertiserPrefs.links?.length > 0) {
        const defaultLink = advertiserPrefs.links.find(l => l.isDefault) || advertiserPrefs.links[0];
        setLandingUrl(defaultLink.url);
      }

      // 4. Default Ad Text (from default template)
      if (!adText && advertiserPrefs.copyTemplates && advertiserPrefs.defaultTemplateName) {
        const template = advertiserPrefs.copyTemplates[advertiserPrefs.defaultTemplateName];
        if (template && template.texts?.length > 0) {
          setAdText(template.texts[0]);
        }
      }
    }
  }, [advertiserPrefs, selectedAdvertiser]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Loading TikTok Ads...</p>
        </div>
      </div>
    )
  }

  if (!isTikTokLoggedIn) return null

  return (
    <div className="w-full max-w-[1600px] mx-auto py-8 px-2 sm:px-4 md:px-6">
      <Toaster richColors position="bottom-left" closeButton />
      
      <Header showMessenger={showMessenger} hideMessenger={hideMessenger} />

      <main className="pt-4 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 min-w-0">
          {/* Left Column: Form and Duplicator */}
          <div className="flex-1 lg:flex-[55] min-w-0 space-y-6">
            <TikTokAdCreationForm 
              advertiserId={selectedAdvertiser} 
              advertisers={tiktokAdvertisers} 
              onAdvertiserChange={setSelectedAdvertiser}
              advertiserPrefs={advertiserPrefs}
              // Lifted State
              adName={adName} setAdName={setAdName}
              adText={adText} setAdText={setAdText}
              cta={cta} setCta={setCta}
              landingUrl={landingUrl} setLandingUrl={setLandingUrl}
              videoFile={videoFile} setVideoFile={setVideoFile}
              videoPreview={videoPreview} setVideoPreview={setVideoPreview}
              driveFiles={driveFiles} setDriveFiles={setDriveFiles}
              dropboxFiles={dropboxFiles} setDropboxFiles={setDropboxFiles}
              selectedIdentity={selectedIdentity} setSelectedIdentity={setSelectedIdentity}
            />
          </div>

          {/* Right Column: Media Preview */}
          <div className="flex-1 lg:flex-[45] min-w-0 space-y-6">
            <div className="sticky top-6">
              <TikTokMediaPreview 
                videoFile={videoFile}
                videoPreview={videoPreview}
                driveFiles={driveFiles}
                dropboxFiles={dropboxFiles}
                adText={adText}
                cta={cta}
                identityId={selectedIdentity}
                advertiserId={selectedAdvertiser}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function TikTokMediaPreview({ videoFile, videoPreview, driveFiles, dropboxFiles, adText, cta, identityId, advertiserId }) {
  const hasMedia = videoFile || driveFiles.length > 0 || dropboxFiles.length > 0;
  
  return (
    <Card className="!bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden min-h-[500px] flex flex-col">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4">
        <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Media Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50/30">
        {!hasMedia ? (
          <div className="text-center space-y-4 max-w-[280px]">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm border border-gray-100 mx-auto flex items-center justify-center">
              <Video className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">No media selected</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Upload a video to see how your ad will appear on TikTok.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[320px] aspect-[9/16] bg-black rounded-[2.5rem] shadow-2xl border-[8px] border-zinc-900 overflow-hidden relative group">
            {/* Mock TikTok Interface */}
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-end gap-3 bg-gradient-to-t from-black/60 via-transparent to-transparent">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-400 border border-white/50" />
                  <div className="h-4 w-24 bg-white/30 rounded-full" />
                </div>
                <p className="text-white text-[11px] leading-snug line-clamp-3">
                  {adText || "Your ad text will appear here..."}
                </p>
              </div>
              <div className="bg-[#FE2C55] py-2.5 rounded-sm text-center">
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {cta.length > 0 ? cta[0].replace(/_/g, ' ') : "SHOP NOW"}
                </span>
              </div>
            </div>

            {/* Video Content */}
            {videoPreview ? (
              <video 
                src={videoPreview} 
                className="w-full h-full object-cover" 
                autoPlay 
                muted 
                loop 
                playsInline
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  {driveFiles.length > 0 ? "Importing from Drive..." : "Importing from Dropbox..."}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
