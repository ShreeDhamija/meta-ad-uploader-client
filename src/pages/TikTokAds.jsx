import Header from '@/components/header'
import TikTokAdCreationForm from '@/components/tiktok/TikTokAdCreationForm'
import { Button } from '@/components/ui/button'
import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useIntercom } from '@/lib/useIntercom'
import { cn } from '@/lib/utils'
import { CheckCircle2, List, Loader2, PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'
const TIKTOK_CYAN = '#25F4EE'

export default function TikTokAds() {
  const navigate = useNavigate()
  const { isTikTokLoggedIn, tiktokUser, tiktokAdvertisers, refreshTikTokUser, logoutTikTok, isLoading: authLoading } = useTikTokAuth()
  const { showMessenger, hideMessenger } = useIntercom()
  
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('')
  const [activeTab, setActiveTab] = useState('create') // 'create' | 'ads'
  const [existingAds, setExistingAds] = useState([])
  const [loadingAds, setLoadingAds] = useState(false)

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
      const firstId = tiktokAdvertisers[0].advertiser_id || tiktokAdvertisers[0].id;
      setSelectedAdvertiser(firstId);
    }
  }, [tiktokAdvertisers, selectedAdvertiser])

  // Fetch existing ads
  useEffect(() => {
    if (!selectedAdvertiser || activeTab !== 'ads') return
    setLoadingAds(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '20' })
    fetch(`${API_BASE_URL}/api/tiktok/fetch-ads?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setExistingAds(d.ads || [])
      })
      .catch((err) => {
        console.error("❌ [TikTok Ads] Failed to load ads:", err);
        toast.error('Failed to load ads')
      })
      .finally(() => setLoadingAds(false))
  }, [selectedAdvertiser, activeTab])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Loading TikTok Ads...</p>
        </div>
      </div>
    )
  }

  if (!isTikTokLoggedIn) return null

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-4 md:px-12 lg:px-24">
      <Toaster richColors position="bottom-left" closeButton />
      
      <Header showMessenger={showMessenger} hideMessenger={hideMessenger} />

      <main className="max-w-[1720px] mx-auto pt-4 pb-20">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              TikTok Ads Manager
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Beta</span>
            </h1>
            <p className="text-gray-500 mt-1 font-medium">
              Create and manage your TikTok campaigns with ease.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm">
            {[
              { id: 'create', label: 'Create Ad', icon: <PlusCircle className="w-4 h-4" /> },
              { id: 'ads', label: 'Existing Ads', icon: <List className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                  activeTab === tab.id 
                    ? "bg-black text-white shadow-md" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form or List */}
          <div className="lg:col-span-8">
            {activeTab === 'create' ? (
              <TikTokAdCreationForm advertiserId={selectedAdvertiser} advertisers={tiktokAdvertisers} />
            ) : (
              <div className="space-y-4">
                {loadingAds ? (
                  <div className="bg-white rounded-3xl p-12 flex flex-col items-center justify-center border border-gray-200 shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                    <p className="text-sm text-gray-400 mt-4 font-medium uppercase tracking-widest">Fetching your ads...</p>
                  </div>
                ) : existingAds.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center border border-gray-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <PlusCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No ads found</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-1">
                      You haven't created any ads for this advertiser yet. 
                      Go to the Create Ad tab to get started.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-6 rounded-xl border-gray-200"
                      onClick={() => setActiveTab('create')}
                    >
                      Create Your First Ad
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {existingAds.map(ad => (
                      <div
                        key={ad.ad_id}
                        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate pr-4">{ad.ad_name}</p>
                          <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-tighter">ID: {ad.ad_id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest",
                              ad.status === 'ACTIVE' 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                : "bg-gray-50 text-gray-400 border border-gray-100"
                            )}
                          >
                            {ad.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Info/Meta-style Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4">
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
