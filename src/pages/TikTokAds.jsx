import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import TikTokAdCreationForm from '@/components/tiktok/TikTokAdCreationForm'
import { Button } from '@/components/ui/button'
import { LogOutIcon, PlusCircle, List } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const TIKTOK_PINK = '#FE2C55'
const TIKTOK_CYAN = '#25F4EE'

function TikTokLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M34.1 6C34.7 9.5 36.7 12.5 39.7 14.3V20.3C37.2 20.3 34.9 19.5 32.9 18.2V30.4C32.9 37.4 27.2 43 20.1 43C13 43 7.3 37.4 7.3 30.4C7.3 23.4 13 17.8 20.1 17.8C20.7 17.8 21.3 17.8 21.9 17.9V23.9C21.3 23.8 20.7 23.7 20.1 23.7C16.2 23.7 13.1 26.7 13.1 30.5C13.1 34.3 16.2 37.3 20.1 37.3C24 37.3 27.3 34.2 27.3 30.4V6H34.1Z" fill="white" />
    </svg>
  )
}

export default function TikTokAds() {
  const navigate = useNavigate()
  const { isTikTokLoggedIn, tiktokUser, tiktokAdvertisers, refreshTikTokUser, logoutTikTok, isLoading } = useTikTokAuth()
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
  }, [])

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isTikTokLoggedIn) {
      navigate('/tiktok-login')
    }
  }, [isTikTokLoggedIn, isLoading, navigate])

  // Auto-select first advertiser
  useEffect(() => {
    if (tiktokAdvertisers.length > 0 && !selectedAdvertiser) {
      setSelectedAdvertiser(tiktokAdvertisers[0].advertiser_id || tiktokAdvertisers[0].id)
    }
  }, [tiktokAdvertisers])

  // Fetch existing ads
  useEffect(() => {
    if (!selectedAdvertiser || activeTab !== 'ads') return
    setLoadingAds(true)
    const params = new URLSearchParams({ advertiserId: selectedAdvertiser, page: '1', pageSize: '20' })
    fetch(`${API_BASE_URL}/api/tiktok/fetch-ads?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setExistingAds(d.ads || []))
      .catch(() => toast.error('Failed to load ads'))
      .finally(() => setLoadingAds(false))
  }, [selectedAdvertiser, activeTab])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#0a0a0a' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${TIKTOK_PINK} transparent transparent transparent` }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading TikTok…</p>
        </div>
      </div>
    )
  }

  if (!isTikTokLoggedIn) return null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #110812 100%)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}
      >
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-xl w-9 h-9" style={{ background: `linear-gradient(135deg, #111, ${TIKTOK_PINK}55)`, border: `1px solid ${TIKTOK_PINK}44` }}>
              <TikTokLogo size={18} />
            </div>
            <span className="font-bold text-white text-base tracking-tight">TikTok Ads</span>
          </div>

          {/* Platform switcher */}
          <div className="hidden md:flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              📘 Meta Ads
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: '#fff', background: `linear-gradient(135deg, ${TIKTOK_PINK}33, ${TIKTOK_CYAN}22)`, border: `1px solid ${TIKTOK_PINK}44` }}
            >
              🎵 TikTok Ads
            </button>
          </div>
        </div>

        {/* Right: Advertiser + User + Logout */}
        <div className="flex items-center gap-3">
          {tiktokAdvertisers.length > 1 && (
            <select
              value={selectedAdvertiser}
              onChange={e => setSelectedAdvertiser(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: '#fff',
                padding: '6px 10px',
                fontSize: 13,
                outline: 'none',
              }}
            >
              {tiktokAdvertisers.map(a => (
                <option key={a.advertiser_id || a.id} value={a.advertiser_id || a.id}>
                  {a.advertiser_name || a.name}
                </option>
              ))}
            </select>
          )}

          {tiktokUser && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `linear-gradient(135deg, ${TIKTOK_PINK}, ${TIKTOK_CYAN})` }}>
                {(tiktokUser.display_name || tiktokUser.name || 'T')[0].toUpperCase()}
              </div>
              <span className="text-sm text-white font-medium">{tiktokUser.display_name || tiktokUser.name}</span>
            </div>
          )}

          <button
            onClick={logoutTikTok}
            title="Logout from TikTok"
            className="p-2 rounded-full transition-all"
            style={{ color: 'rgba(255,100,100,0.8)' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(254,44,85,0.12)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">TikTok Ads Manager</h1>
          {selectedAdvertiser && tiktokAdvertisers.length > 0 && (
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {tiktokAdvertisers.find(a => (a.advertiser_id || a.id) === selectedAdvertiser)?.advertiser_name || 'Advertiser'}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { id: 'create', label: 'Create Ad', icon: <PlusCircle className="w-4 h-4" /> },
            { id: 'ads', label: 'Existing Ads', icon: <List className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? `linear-gradient(135deg, ${TIKTOK_PINK}44, ${TIKTOK_CYAN}22)` : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.45)',
                border: activeTab === tab.id ? `1px solid ${TIKTOK_PINK}44` : '1px solid transparent',
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(18,18,18,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          {activeTab === 'create' ? (
            <TikTokAdCreationForm advertiserId={selectedAdvertiser} advertisers={tiktokAdvertisers} />
          ) : (
            <div>
              <h2 className="text-base font-semibold text-white mb-4">Recent Ads</h2>
              {loadingAds ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${TIKTOK_PINK} transparent transparent transparent` }} />
                </div>
              ) : existingAds.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No ads found. Create your first TikTok ad!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {existingAds.map(ad => (
                    <div
                      key={ad.ad_id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{ad.ad_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>ID: {ad.ad_id}</p>
                      </div>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          background: ad.status === 'ACTIVE' ? 'rgba(37,244,238,0.15)' : 'rgba(255,255,255,0.08)',
                          color: ad.status === 'ACTIVE' ? TIKTOK_CYAN : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {ad.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
