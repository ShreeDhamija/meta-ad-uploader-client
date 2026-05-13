import Header from '@/components/header'
import TikTokAdCreationForm from '@/components/tiktok/TikTokAdCreationForm'
import { Button } from '@/components/ui/button'
import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useIntercom } from '@/lib/useIntercom'
import { CheckCircle2, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

export default function TikTokAds() {
  const navigate = useNavigate()
  const { isTikTokLoggedIn, tiktokUser, tiktokAdvertisers, refreshTikTokUser, logoutTikTok, isLoading: authLoading } = useTikTokAuth()
  const { showMessenger, hideMessenger } = useIntercom()
  
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('')

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
            />
          </div>

          {/* Right Column: Info/Meta-style Sidebar */}
          <div className="flex-1 lg:flex-[45] min-w-0 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Quick Tips</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-bold text-gray-900">TikTok Video Ratio:</span> 9:16 (vertical) is highly recommended for Spark Ads and In-Feed Ads.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-bold text-gray-900">Ad Text:</span> Keep it short and catchy. Most TikTok users scroll quickly!
                  </p>
                </div>
              </div>
            </div>

            {tiktokUser && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FE2C55] to-[#25F4EE] p-0.5">
                    <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-lg font-black text-black">
                      {(tiktokUser.display_name || tiktokUser.name || 'T')[0].toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{tiktokUser.display_name || tiktokUser.name}</h3>
                    <p className="text-xs text-gray-400">Connected to TikTok</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full rounded-xl text-red-500 border-red-50 hover:bg-red-50 hover:text-red-600"
                  onClick={logoutTikTok}
                >
                  Disconnect Account
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
