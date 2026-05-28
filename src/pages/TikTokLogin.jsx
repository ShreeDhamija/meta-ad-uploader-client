import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIntercom } from "@/lib/useIntercom";
import SignUpImg from "../assets/signup.webp?url"
import Rocket from "../assets/rocket2.webp?url"
import Book from "../assets/Book.webp?url"
import Cat from "../assets/Cat.webp?url"
import Moon from "../assets/Moon.webp?url"
import Meteor from "../assets/Meteor.webp?url"
import Check from "../assets/icons/check.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// TikTok SVG logo
function TikTokLogo({ size = 20, color = "white" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M34.1 6C34.7 9.5 36.7 12.5 39.7 14.3V20.3C37.2 20.3 34.9 19.5 32.9 18.2V30.4C32.9 37.4 27.2 43 20.1 43C13 43 7.3 37.4 7.3 30.4C7.3 23.4 13 17.8 20.1 17.8C20.7 17.8 21.3 17.8 21.9 17.9V23.9C21.3 23.8 20.7 23.7 20.1 23.7C16.2 23.7 13.1 26.7 13.1 30.5C13.1 34.3 16.2 37.3 20.1 37.3C24 37.3 27.3 34.2 27.3 30.4V6H34.1Z" fill={color}/>
        </svg>
    )
}

export default function TikTokLogin() {
    const { isTikTokLoggedIn } = useTikTokAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [email, setEmail] = useState("")
    const [isValidEmail, setIsValidEmail] = useState(false)
    const [isRedirecting, setIsRedirecting] = useState(false)
    const [error, setError] = useState(null)
    useIntercom(true, true);

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

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const errorMsg = params.get('error')
        if (errorMsg) {
            setError(decodeURIComponent(errorMsg))
        }
    }, [location])

    const handleTikTokLogin = () => {
        setIsRedirecting(true)
        const cleanApiUrl = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash if any
        if (isSignupPage) {
            const encodedEmail = encodeURIComponent(email)
            window.location.href = `${cleanApiUrl}/auth/tiktok/login?state=signup&user_email=${encodedEmail}`;
        } else {
            window.location.href = `${cleanApiUrl}/auth/tiktok/login?state=login`;
        }
    }

    return (
        <div className="relative flex justify-center align-center items-center h-screen md:px-4 overflow-hidden">

            <img src={Rocket}
                alt=""
                className="md:hidden absolute right-[-50px] top-20 w-32 h-auto pointer-events-none"
            />
            <img src={Moon}
                alt=""
                className="md:hidden absolute left-[-50px] top-16 w-28 h-auto pointer-events-none"
            />

            <img src={Meteor}
                alt=""
                className="md:hidden absolute top-0 -translate-y-1/2 w-28 h-auto pointer-events-none"
            />

            <img src={Cat}
                alt=""
                className="md:hidden absolute bottom-[-10px] left-[-50px] w-[200px] h-auto pointer-events-none"
            />

            <img src={Book}
                alt=""
                className="md:hidden absolute bottom-[-10px] right-[-20px] w-[150px] h-auto pointer-events-none"
            />
            <div className="flex w-full md:w-auto rounded-xl overflow-hidden md:p-6 overflow-visible">

                <div className="w-full h-screen md:max-w-md space-y-6 bg-white p-8 md:rounded-3xl md:shadow-lg md:min-w-[420px] min-h-[650px] md:h-auto flex flex-col justify-center">

                    <div className="text-center space-y-1">
                        <img
                            src="https://api.withblip.com/logo.webp"
                            alt="Hero"
                            className="shadow-xs w-[48px] h-[48px] mx-auto rounded-md mb-2"
                        />
                        <h2 className="text-2xl font-bold tracking-tight">Welcome To Blip</h2>
                        <p className="text-sm font-bold text-zinc-700">
                            {isSignupPage ? 'Start your 7 Day Free Trial!' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            {isSignupPage ? 'Connect your TikTok Ads account to start creating' : 'Login to your TikTok Ads account'}
                        </p>
                    </div>

                    {/* Platform Selector Switcher */}
                    <div className="flex bg-zinc-100 p-1 rounded-2xl border border-black/5 shadow-inner select-none mb-2 w-full">
                        <button
                            onClick={() => {
                                if (isSignupPage) {
                                    navigate('/signup')
                                } else {
                                    navigate('/login')
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-300 text-zinc-500 hover:text-zinc-800"
                        >
                            <img
                                src="https://api.withblip.com/facebooklogo.png"
                                alt="Facebook"
                                className="w-4 h-4 object-contain"
                            />
                            Facebook
                        </button>
                        <button
                            onClick={() => {
                                if (isSignupPage) {
                                    navigate('/tiktok-signup')
                                } else {
                                    navigate('/tiktok-login')
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-300 bg-white text-zinc-900 shadow-sm border border-black/5"
                        >
                            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" className="object-contain">
                                <path d="M34.1 6C34.7 9.5 36.7 12.5 39.7 14.3V20.3C37.2 20.3 34.9 19.5 32.9 18.2V30.4C32.9 37.4 27.2 43 20.1 43C13 43 7.3 37.4 7.3 30.4C7.3 23.4 13 17.8 20.1 17.8C20.7 17.8 21.3 17.8 21.9 17.9V23.9C21.3 23.8 20.7 23.7 20.1 23.7C16.2 23.7 13.1 26.7 13.1 30.5C13.1 34.3 16.2 37.3 20.1 37.3C24 37.3 27.3 34.2 27.3 30.4V6H34.1Z" fill="#010101" />
                            </svg>
                            TikTok
                        </button>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg border border-red-100">
                            {error}
                        </p>
                    )}

                    {isSignupPage ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-muted-foreground">Step 1.</label>
                                    {isValidEmail && (
                                        <img src={Check} alt="Valid" className="size-5" />
                                    )}
                                </div>
                                <Input
                                    type="email"
                                    placeholder="Enter your work email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Step 2.</label>
                                <Button
                                    onClick={handleTikTokLogin}
                                    disabled={!isValidEmail || isRedirecting}
                                    variant="secondary"
                                    className="w-full bg-[#010101] hover:bg-[#121212] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <TikTokLogo size={20} />
                                    {isRedirecting ? 'Redirecting...' : 'Sign up with TikTok'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Button
                                onClick={handleTikTokLogin}
                                disabled={isRedirecting}
                                variant="secondary"
                                className="w-full bg-[#010101] hover:bg-[#121212] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <TikTokLogo size={20} />
                                {isRedirecting ? 'Redirecting...' : 'Login with TikTok'}
                            </Button>
                        </div>
                    )}

                    {isSignupPage ? (
                        <p className="text-sm text-center text-muted-foreground">
                            Already have an account?{" "}
                            <button
                                onClick={() => navigate('/tiktok-login')}
                                className="font-bold underline text-blue-600 hover:text-blue-800"
                            >
                                Head to Login
                            </button>
                        </p>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground">
                            New user?{" "}
                            <button
                                onClick={() => navigate('/tiktok-signup')}
                                className="font-bold underline text-blue-600 hover:text-blue-800"
                            >
                                Head to Sign Up Page
                            </button>
                        </p>
                    )}

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="text-xs text-center text-muted-foreground hover:text-zinc-800 transition-colors"
                        >
                            ← Back to Meta Ads
                        </button>
                        
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            By clicking continue, you agree to our{" "}
                            <br></br>
                            <a href="https://app.withblip.com/terms-of-service" className="underline text-zinc-600">Terms of Service</a> and{" "}
                            <a href="https://app.withblip.com/privacy-policy" className="underline text-zinc-600">Privacy Policy</a>.
                        </p>
                    </div>

                </div>
            </div>

            <div className="hidden md:block w-[490px] h-[700px] overflow-visible">
                <img src={SignUpImg}
                    alt="Login Visual"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    )
}
