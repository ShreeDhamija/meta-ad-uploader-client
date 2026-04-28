import { useTikTokAuth } from '@/lib/TikTokAuthContext'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const TIKTOK_PINK = '#FE2C55'

export default function TikTokCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshTikTokUser } = useTikTokAuth()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const connected = params.get('connected')
    const errorMsg = params.get('error')

    if (errorMsg) {
      const decodedError = decodeURIComponent(errorMsg)
      setStatus('error')
      setError(decodedError)
      toast.error(`TikTok Connection Failed: ${decodedError}`)
      return
    }

    if (connected === 'true') {
      setStatus('success')
      toast.success('Successfully connected to TikTok Ads!')
      
      // Refresh the auth context to get the new user data
      refreshTikTokUser().then(() => {
        setTimeout(() => navigate('/tiktok-ads'), 1500)
      })
    } else {
      setStatus('error')
      const defaultError = 'Authentication was not successful'
      setError(defaultError)
      toast.error(defaultError)
    }
  }, [location, navigate, refreshTikTokUser])

  return (
    <div
      className="flex justify-center items-center h-screen"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a14 50%, #0a0a0a 100%)' }}
    >
      <div
        className="text-center p-8 rounded-3xl"
        style={{
          background: 'rgba(18, 18, 18, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          maxWidth: '400px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {status === 'processing' && (
          <>
            <div className="mb-6 flex justify-center">
              <div 
                className="animate-spin rounded-full h-12 w-12 border-t-2 border-r-2" 
                style={{ borderColor: TIKTOK_PINK }} 
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connecting to TikTok</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Finalizing your secure authentication...
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="mb-6 text-5xl">✅</div>
            <h2 className="text-xl font-bold text-white mb-2">Connected Successfully!</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Redirecting you to the TikTok Ads dashboard...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="mb-6 text-5xl">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {error || 'An unexpected error occurred during authentication'}
            </p>
            <button
              onClick={() => navigate('/tiktok-login')}
              style={{ background: '#FE2C55', color: '#fff', padding: '8px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

