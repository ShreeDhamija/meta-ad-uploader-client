import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useAuth } from '@/lib/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function TikTokCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshTikTokUser } = useTikTokAuth()
  const { refreshAuth } = useAuth()
  const [error, setError] = useState(null)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(location.search)
    const connected = params.get('connected')
    const errorCode = params.get('error')
    window.history.replaceState({}, document.title, location.pathname)

    if (errorCode || connected !== 'true') {
      const message = errorCode || 'Authentication was not successful'
      setError(message)
      toast.error(`TikTok connection failed: ${message}`)
      return
    }

    const finishConnection = async () => {
      await refreshAuth()
      const status = await refreshTikTokUser()
      if (!status?.connected) {
        setError('TikTok connection could not be verified')
        return
      }
      toast.success('Successfully connected to TikTok Ads!')
      navigate('/tiktok-ads', { replace: true })
    }

    finishConnection()
  }, [location.pathname, location.search, navigate, refreshAuth, refreshTikTokUser])

  return (
    <div
      className="flex justify-center items-center h-screen w-full"
      style={{
        backgroundColor: '#f3f3f3',
        backgroundImage: 'radial-gradient(#dbdbdb 0.9px, #f2f2f2 0.9px)',
        backgroundSize: '18px 18px',
      }}
    >
      {error && (
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm max-w-md w-full text-center space-y-4 mx-4">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-bold text-zinc-900">Connection Failed</h2>
          <p className="text-sm text-zinc-500">{error}</p>
          <button
            onClick={() => navigate('/tiktok-login', { replace: true })}
            className="w-full bg-[#010101] hover:bg-[#121212] text-white py-2.5 rounded-xl font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
