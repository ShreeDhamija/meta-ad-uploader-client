import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const TIKTOK_PINK = '#FE2C55'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// ✅ GLOBAL GUARD: Module-level variable persists across React remounts/StrictMode
let isExchangeInProgress = false;

export default function TikTokCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isTikTokLoggedIn, refreshTikTokUser, setTikTokSession } = useTikTokAuth()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)

  const hasExchanged = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const connected = params.get('connected')
    const errorMsg = params.get('error')
    const exchangeToken = params.get('t')
    const loginType = params.get('login_type') || 'business'

    // 1. Check if already logged in (context might already have it)
    if (isTikTokLoggedIn) {
      console.log('✅ [TikTokCallback] User already logged in via context. Redirecting...')
      setStatus('success')
      navigate('/tiktok-ads')
      return
    }

    // 2. Prevent double-execution using the GLOBAL guard
    if (isExchangeInProgress) {
      console.log('⏳ [TikTokCallback] Exchange already in progress or completed (Global Guard). Skipping.')
      return
    }
    
    console.log('\n🟡====== [TikTokCallback] Starting Exchange Process ======')
    console.log('  Param [connected]  :', connected)
    console.log('  Param [error]      :', errorMsg)
    console.log('  Param [t] token    :', exchangeToken ? exchangeToken.substring(0, 8) + '...' : 'NONE')
    console.log('  Param [login_type] :', loginType)

    // Beautiful styled log to browser developer tools console
    console.log(
      '%c📊 [TikTok Authentication Classifier]',
      'background: #FE2C55; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
    )
    console.log(
      `%cType: ${loginType.toUpperCase()} LOGIN`,
      'color: #00f0ff; font-weight: bold; font-size: 13px;'
    )
    console.log('%c──────────────────────────────────────────', 'color: rgba(255,255,255,0.15);')

    if (errorMsg) {
      isExchangeInProgress = true
      const decodedError = decodeURIComponent(errorMsg)
      console.error('❌ [TikTokCallback] Error param received:', decodedError)
      setStatus('error')
      setError(decodedError)
      toast.error(`TikTok Connection Failed: ${decodedError}`)
      return
    }

    if (connected === 'true') {
      if (exchangeToken) {
        isExchangeInProgress = true
        console.log('🔄 [TikTokCallback] Calling /auth/exchange with token...')
        // Note: Using 'api/tiktok' prefix as seen in logs
        const exchangeUrl = `${API_BASE_URL}/api/tiktok/auth/exchange?t=${exchangeToken}`

        fetch(exchangeUrl, { credentials: 'include' })
          .then(async (res) => {
            const body = await res.text()
            console.log('  Exchange response   :', body)
            
            let data
            try {
              data = JSON.parse(body)
            } catch (e) {
              throw new Error('Invalid response from server')
            }

            if (data.connected && data.user) {
              console.log('✅ [TikTokCallback] Exchange success! User:', data.user.name)
              setStatus('success')
              toast.success('Successfully connected to TikTok Ads!')
              setTikTokSession(data.user, data.advertisers || [], data.accessToken || null)
              
              // Clean up URL to prevent reuse on refresh
              window.history.replaceState({}, document.title, window.location.pathname)
              
              navigate('/tiktok-ads')
            } else {
              console.warn('⚠️ [TikTokCallback] Exchange returned connected=false:', data)
              
              // Handle "token consumed" as a possible success if we already have a session
              if (data.error === 'Invalid or expired exchange token') {
                 console.log('🔄 [TikTokCallback] Token already consumed. Checking session status...')
                 return refreshTikTokUser().then(() => {
                   setStatus('success')
                   navigate('/tiktok-ads')
                 })
              }
              
              setStatus('error')
              setError(data.error || 'Failed to connect TikTok account')
              isExchangeInProgress = false // Allow retry on real failure
            }
          })
          .catch((err) => {
            console.error('❌ [TikTokCallback] Exchange fetch failed:', err)
            setStatus('error')
            setError('Network error during authentication')
            isExchangeInProgress = false
          })
      } else {
        isExchangeInProgress = true
        console.log('⚠️ [TikTokCallback] No exchange token — falling back to refreshTikTokUser()')
        refreshTikTokUser().then(() => {
          setStatus('success')
          navigate('/tiktok-ads')
        })
      }
    } else if (connected === 'false' || (!connected && !errorMsg)) {
      console.warn('⚠️ [TikTokCallback] No connected=true and no error. search:', location.search)
      setStatus('error')
      setError('Authentication was not successful')
    }
  }, [isTikTokLoggedIn]) // Re-run if login state changes

  return (
    <div
      className="flex justify-center items-center h-screen w-full"
      style={{
        backgroundColor: '#f3f3f3',
        backgroundImage: 'radial-gradient(#dbdbdb 0.9px, #f2f2f2 0.9px)',
        backgroundSize: '18px 18px',
      }}
    >
      {(status === 'processing' || status === 'success') && (
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-r-2 border-zinc-800" />
      )}

      {status === 'error' && (
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm max-w-md w-full text-center space-y-4 mx-4">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-bold text-zinc-900">Connection Failed</h2>
          <p className="text-sm text-zinc-500">
            {error || 'An unexpected error occurred during authentication.'}
          </p>
          <button
            onClick={() => navigate('/tiktok-login')}
            className="w-full bg-[#010101] hover:bg-[#121212] text-white py-2.5 rounded-xl font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

