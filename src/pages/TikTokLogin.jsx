import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useIntercom } from "@/lib/useIntercom"
import Doodle from "../assets/onboarding/doodle.webp?url"
import MrAvatar from "../assets/onboarding/mr.webp?url"
import Rocket from "../assets/rocket2.webp?url"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// TikTok SVG logo
function TikTokLogo({ size = 20, color = "white" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M34.1 6C34.7 9.5 36.7 12.5 39.7 14.3V20.3C37.2 20.3 34.9 19.5 32.9 18.2V30.4C32.9 37.4 27.2 43 20.1 43C13 43 7.3 37.4 7.3 30.4C7.3 23.4 13 17.8 20.1 17.8C20.7 17.8 21.3 17.8 21.9 17.9V23.9C21.3 23.8 20.7 23.7 20.1 23.7C16.2 23.7 13.1 26.7 13.1 30.5C13.1 34.3 16.2 37.3 20.1 37.3C24 37.3 27.3 34.2 27.3 30.4V6H34.1Z" fill={color} />
        </svg>
    )
}

function TestimonialPanel() {
    return (
        <div className="hidden md:flex relative w-1/2 h-full bg-[#F4ECDC] overflow-hidden items-center justify-center">
            <div className="max-w-lg px-8 relative z-10">
                <div
                    className="leading-none mb-2"
                    style={{ color: '#CB9A68', fontSize: '100px', fontFamily: 'Alcyone, serif' }}
                >
                    “
                </div>
                <p
                    className="text-[#320000] mb-6"
                    style={{ fontFamily: 'Alcyone, serif', fontSize: '24px', fontWeight: 700, lineHeight: 1.35 }}
                >
                    I love Blip! Before I would spend way too much time launching ads in platform which was always an incredibly frustrating experience. Blip makes it super easy and intuitive to upload ads. I regained a ton of wasted time.
                </p>
                <div className="flex items-center gap-3">
                    <img src={MrAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <div className="font-semibold text-sm text-zinc-900">Michael Rizzo</div>
                        <div className="text-sm text-zinc-700">Senior Media Buyer</div>
                    </div>
                </div>
            </div>
            <img
                src={Doodle}
                alt=""
                className="absolute bottom-0 right-[-200px] w-[840px] h-auto pointer-events-none origin-bottom-right"
                style={{ transform: 'rotate(-15deg)' }}
            />
        </div>
    )
}

export default function TikTokLogin() {
    const { isTikTokLoggedIn } = useTikTokAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isRedirecting, setIsRedirecting] = useState(false)
    const [error, setError] = useState(null)
    useIntercom(true, true)

    useEffect(() => {
        if (isTikTokLoggedIn) {
            navigate("/tiktok-ads")
        }
    }, [isTikTokLoggedIn, navigate])

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const errorMsg = params.get('error')
        if (errorMsg) {
            setError(decodeURIComponent(errorMsg))
        }
    }, [location])

    const handleTikTokLogin = () => {
        setIsRedirecting(true)
        const cleanApiUrl = API_BASE_URL.replace(/\/$/, '')
        window.location.href = `${cleanApiUrl}/auth/tiktok/login?state=login`
    }

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden">
            <div className="relative flex min-h-0 flex-1 w-full overflow-hidden">
                {/* Left half — TikTok form */}
                <div className="flex h-full w-full items-center justify-center bg-white px-8 md:w-1/2">
                    <div className="w-full max-w-sm space-y-6">
                        <div className="space-y-1">
                            <div className="w-11 h-11 bg-[#F9F4EB] rounded-2xl flex items-center justify-center mb-3">
                                <img
                                    src={Rocket}
                                    alt="Blip"
                                    className="w-6 h-6 object-contain"
                                />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome To Blip!</h2>
                            <p className="text-sm text-zinc-600">
                                Login to your account
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg border border-red-100">
                                {error}
                            </p>
                        )}

                        <div className="space-y-4">
                            <Button
                                onClick={handleTikTokLogin}
                                disabled={isRedirecting}
                                className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-2xl shadow-md flex items-center justify-center gap-2 h-[44px] text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(0deg, #101010 0%, #202020 100%)',
                                }}
                            >
                                <TikTokLogo size={20} />
                                {isRedirecting ? 'Redirecting...' : 'Login with TikTok'}
                            </Button>
                        </div>

                        <div className="space-y-3 pt-1">
                            <div>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
                                >
                                    ← Switch to Meta Ads Login
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 max-w-[350px]">
                            By clicking continue, you agree to our{" "}
                            <a href="https://app.withblip.com/terms-of-service" className="underline">Terms of Service</a> &{" "}
                            <a href="https://app.withblip.com/privacy-policy" className="underline">Privacy Policy</a>.
                        </p>
                    </div>
                </div>

                {/* Right half — testimonial */}
                <TestimonialPanel />
            </div>
        </div>
    )
}
