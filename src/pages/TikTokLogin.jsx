import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// TikTok brand colors
const TIKTOK_BLACK = '#010101'
const TIKTOK_PINK = '#FE2C55'
const TIKTOK_CYAN = '#25F4EE'

// TikTok SVG logo
function TikTokLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34.1 6C34.7 9.5 36.7 12.5 39.7 14.3V20.3C37.2 20.3 34.9 19.5 32.9 18.2V30.4C32.9 37.4 27.2 43 20.1 43C13 43 7.3 37.4 7.3 30.4C7.3 23.4 13 17.8 20.1 17.8C20.7 17.8 21.3 17.8 21.9 17.9V23.9C21.3 23.8 20.7 23.7 20.1 23.7C16.2 23.7 13.1 26.7 13.1 30.5C13.1 34.3 16.2 37.3 20.1 37.3C24 37.3 27.3 34.2 27.3 30.4V6H34.1Z" fill="white"/>
    </svg>
  )
}

export default function TikTokLogin() {
  const { isTikTokLoggedIn } = useTikTokAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [isValidEmail, setIsValidEmail] = useState(false)

  const isSignupPage = location.pathname === '/tiktok-signup'

  useEffect(() => {
    if (isTikTokLoggedIn) {
      navigate("/tiktok-ads")
    }
  }, [isTikTokLoggedIn, navigate])

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setIsValidEmail(emailRegex.test(email))
  }, [email])

  const [error, setError] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const errorMsg = params.get('error')
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg))
    }
  }, [location])

  const handleTikTokLogin = () => {
    setIsRedirecting(true)
    // Strip any existing protocol so we always get exactly one https://
    const cleanApiUrl = API_BASE_URL.replace(/^https?:\/\//, '')
    if (isSignupPage) {
      const encodedEmail = encodeURIComponent(email)
      window.location.href = `https://${cleanApiUrl}/api/tiktok/auth/tiktok?state=signup&user_email=${encodedEmail}`
    } else {
      window.location.href = `https://${cleanApiUrl}/api/tiktok/auth/tiktok?state=login`
    }
  }

  return (
    <div
      className="relative flex justify-center items-center h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a14 50%, #0a0a0a 100%)' }}
    >
      {/* Animated background blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${TIKTOK_PINK}22 0%, transparent 70%)`,
          top: '-120px',
          right: '-120px',
          filter: 'blur(40px)',
          animation: 'pulse 6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${TIKTOK_CYAN}18 0%, transparent 70%)`,
          bottom: '-80px',
          left: '-80px',
          filter: 'blur(40px)',
          animation: 'pulse 8s ease-in-out infinite reverse',
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[420px] mx-4 rounded-3xl p-8 flex flex-col gap-6"
        style={{
          background: 'rgba(18, 18, 18, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Logo + Headline */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* TikTok icon badge */}
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 60,
              height: 60,
              background: `linear-gradient(135deg, ${TIKTOK_BLACK} 60%, ${TIKTOK_PINK}55)`,
              border: `1.5px solid ${TIKTOK_PINK}55`,
              boxShadow: `0 0 24px ${TIKTOK_PINK}33`,
            }}
          >
            <TikTokLogo size={32} />
          </div>

          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#fff', letterSpacing: '-0.02em' }}
            >
              {isSignupPage ? 'Get started with TikTok Ads' : 'Welcome back'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {isSignupPage
                ? 'Connect your TikTok Ads account to start creating'
                : 'Log in to your TikTok Ads manager'}
            </p>
          </div>
        </div>

        {/* Dual-colored accent line */}
        <div className="flex h-[2px] rounded-full overflow-hidden">
          <div style={{ flex: 1, background: TIKTOK_CYAN }} />
          <div style={{ flex: 1, background: TIKTOK_PINK }} />
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              background: 'rgba(254, 44, 85, 0.1)',
              border: '1px solid rgba(254, 44, 85, 0.3)',
              color: TIKTOK_PINK,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <div className="flex flex-col gap-4">
          {isSignupPage && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Step 1 — Your work email
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl h-11 pr-10"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isValidEmail ? TIKTOK_CYAN + '88' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
                {isValidEmail && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base"
                    style={{ color: TIKTOK_CYAN }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {isSignupPage && (
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Step 2 — Connect TikTok
              </label>
            )}
            <Button
              onClick={handleTikTokLogin}
              disabled={(isSignupPage && !isValidEmail) || isRedirecting}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all"
              style={{
                background: (isSignupPage && !isValidEmail) || isRedirecting
                  ? 'rgba(254,44,85,0.3)'
                  : `linear-gradient(135deg, ${TIKTOK_PINK}, #c9184a)`,
                color: '#fff',
                border: 'none',
                boxShadow: (isSignupPage && !isValidEmail) || isRedirecting ? 'none' : `0 4px 20px ${TIKTOK_PINK}55`,
                cursor: (isSignupPage && !isValidEmail) || isRedirecting ? 'not-allowed' : 'pointer',
                opacity: (isSignupPage && !isValidEmail) || isRedirecting ? 0.6 : 1,
              }}
            >
              <TikTokLogo size={20} />
              {isRedirecting
                ? 'Redirecting to TikTok...'
                : isSignupPage ? 'Sign up with TikTok' : 'Login with TikTok'}
            </Button>
          </div>
        </div>

        {/* Switch link */}
        <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {isSignupPage ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/tiktok-login')}
                className="font-semibold underline transition-colors"
                style={{ color: TIKTOK_CYAN }}
              >
                Log in
              </button>
            </>
          ) : (
            <>
              New user?{' '}
              <button
                onClick={() => navigate('/tiktok-signup')}
                className="font-semibold underline transition-colors"
                style={{ color: TIKTOK_CYAN }}
              >
                Sign up
              </button>
            </>
          )}
        </p>

        {/* Back to Meta */}
        <button
          onClick={() => navigate('/')}
          className="text-xs text-center transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseOver={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
          onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.25)'}
        >
          ← Back to Meta Ads
        </button>

        {/* Legal */}
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
          By continuing, you agree to our{' '}
          <a
            href="https://app.withblip.com/terms-of-service"
            className="underline"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="https://app.withblip.com/privacy-policy"
            className="underline"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Privacy Policy
          </a>.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
