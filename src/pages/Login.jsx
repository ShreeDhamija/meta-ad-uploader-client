import { useAuth } from "@/lib/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIntercom } from "@/lib/useIntercom"
import Doodle from "../assets/onboarding/doodle.webp?url"
import MrAvatar from "../assets/onboarding/mr.webp?url"
import Check from "../assets/icons/check.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const IS_STAGING = import.meta.env.VITE_ENV === 'staging' || API_BASE_URL.includes('staging')

const ROLE_OPTIONS = [
    "Freelancer Marketing Specialist",
    "Paid Ads Agency",
    "Marketing at a Brand",
    "Founder/CEO",
    "Other",
]

const SOURCE_OPTIONS = [
    "Google",
    "ChatGPT",
    "Twitter/ X",
    "Reddit",
    "Referred",
    "Other",
]

const STEPS = ["role", "source", "fb"]

function ProgressBar({ activeIndex }) {
    return (
        <div className="flex items-center w-full px-1">
            {STEPS.map((_, i) => {
                const isDone = i < activeIndex
                const isCurrent = i === activeIndex
                return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                            {isDone ? (
                                <div className="w-5 h-5 rounded-full bg-[#F90E6C] flex items-center justify-center">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            ) : isCurrent ? (
                                <div className="w-5 h-5 rounded-full border-2 border-[#F90E6C] flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-[#FFBBD6]" />
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-[#DADADA]" />
                            )}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={`flex-1 h-[2px] mx-1 ${i < activeIndex ? 'bg-[#F90E6C]' : 'bg-[#DADADA]'}`}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function RadioList({ options, value, onChange }) {
    return (
        <div className="space-y-3">
            {options.map(opt => {
                const selected = value === opt
                return (
                    <label
                        key={opt}
                        className="flex items-center gap-3 cursor-pointer text-sm text-zinc-800"
                    >
                        <span
                            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors ${selected ? 'border-[#F90E6C]' : 'border-zinc-300'
                                }`}
                        >
                            {selected && <span className="w-2 h-2 rounded-full bg-[#F90E6C]" />}
                        </span>
                        <input
                            type="radio"
                            name="radio-list"
                            checked={selected}
                            onChange={() => onChange(opt)}
                            className="sr-only"
                        />
                        {opt}
                    </label>
                )
            })}
        </div>
    )
}

function TestimonialPanel() {
    return (
        <div className="hidden md:flex relative w-1/2 h-screen bg-[#F4ECDC] overflow-hidden items-center justify-center">
            <div className="max-w-md px-8">
                <div className="text-[#F90E6C] text-5xl font-serif leading-none mb-6">“</div>
                <p className="text-zinc-900 font-semibold text-lg leading-relaxed mb-6">
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
                className="absolute bottom-0 right-0 w-[420px] h-auto pointer-events-none"
            />
        </div>
    )
}

export default function Login() {
    const { isLoggedIn, refreshUser } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [email, setEmail] = useState("")
    const [isValidEmail, setIsValidEmail] = useState(false)
    useIntercom(true, true)

    // Manual login state
    const [manualUsername, setManualUsername] = useState("")
    const [manualPassword, setManualPassword] = useState("")
    const [manualLoginError, setManualLoginError] = useState("")
    const [isLoggingIn, setIsLoggingIn] = useState(false)

    // Onboarding popup state
    const [popupStep, setPopupStep] = useState(null) // null | 'role' | 'source' | 'fb'
    const [jobRole, setJobRole] = useState("")
    const [signupSource, setSignupSource] = useState("")
    const [isInitializing, setIsInitializing] = useState(false)
    const [initError, setInitError] = useState("")

    const isSignupPage = location.pathname === '/signup'

    useEffect(() => {
        if (isLoggedIn) navigate("/")
    }, [isLoggedIn, navigate])

    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        setIsValidEmail(emailRegex.test(email))
    }, [email])

    const startSignupFlow = () => {
        setPopupStep('role')
    }

    const handleNext = () => {
        if (popupStep === 'role') setPopupStep('source')
        else if (popupStep === 'source') setPopupStep('fb')
    }

    const handleSignupFacebookLogin = async () => {
        setInitError("")
        setIsInitializing(true)
        try {
            const res = await fetch(`${API_BASE_URL}/auth/signup-init`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, signupSource, jobRole }),
            })
            if (!res.ok) throw new Error('Failed to start signup')
            window.location.href = `${API_BASE_URL}/auth/facebook?state=signup`
        } catch (err) {
            setInitError(err.message)
            setIsInitializing(false)
        }
    }

    const handleLoginFacebook = () => {
        window.location.href = `${API_BASE_URL}/auth/facebook?state=login`
    }

    const handleManualLogin = async (e) => {
        e.preventDefault()
        setManualLoginError("")
        setIsLoggingIn(true)
        try {
            const response = await fetch(`${API_BASE_URL}/auth/manual-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: manualUsername, password: manualPassword }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Login failed')
            if (refreshUser) await refreshUser()
            window.location.href = '/?loggedIn=true'
        } catch (err) {
            setManualLoginError(err.message)
        } finally {
            setIsLoggingIn(false)
        }
    }

    const closePopup = () => {
        setPopupStep(null)
    }

    const popupActiveIndex = popupStep === 'role' ? 0 : popupStep === 'source' ? 1 : 2

    return (
        <div className="relative flex h-screen w-full overflow-hidden">
            {/* Left half — form */}
            <div className="flex w-full md:w-1/2 h-screen items-center justify-center bg-white px-8">
                <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-1">
                        <img
                            src="https://api.withblip.com/logo.webp"
                            alt="Blip"
                            className="w-[44px] h-[44px] rounded-md mb-2"
                        />
                        <h2 className="text-2xl font-bold tracking-tight">Welcome To Blip!</h2>
                        <p className="text-sm font-semibold text-zinc-800">
                            {isSignupPage ? 'Star your 7 day free trial' : ''}
                        </p>
                        <p className="text-sm text-zinc-600">
                            {isSignupPage ? "You're so close to ditching Ads Manager forever" : 'Login to your account'}
                        </p>
                    </div>

                    {isSignupPage ? (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-zinc-800">Step 1.</label>
                                    {isValidEmail && <img src={Check} alt="Valid" className="size-5" />}
                                </div>
                                <Input
                                    type="email"
                                    placeholder="Enter your Work Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-800">Step 2.</label>
                                <Button
                                    onClick={startSignupFlow}
                                    disabled={!isValidEmail}
                                    className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span role="img" aria-hidden>🚀</span>
                                    Start Launching Ads
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {IS_STAGING && (
                                <>
                                    <form onSubmit={handleManualLogin} className="space-y-4">
                                        <Input
                                            type="text"
                                            placeholder="Username"
                                            value={manualUsername}
                                            onChange={(e) => setManualUsername(e.target.value)}
                                            className="rounded-xl"
                                            required
                                        />
                                        <Input
                                            type="password"
                                            placeholder="Password"
                                            value={manualPassword}
                                            onChange={(e) => setManualPassword(e.target.value)}
                                            className="rounded-xl"
                                            required
                                        />
                                        {manualLoginError && (
                                            <p className="text-sm text-red-500 text-center">{manualLoginError}</p>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={isLoggingIn || !manualUsername || !manualPassword}
                                            className="w-full bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoggingIn ? 'Logging in...' : 'Login'}
                                        </Button>
                                    </form>

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-px bg-zinc-200" />
                                        <span className="text-sm text-muted-foreground">or</span>
                                        <div className="flex-1 h-px bg-zinc-200" />
                                    </div>
                                </>
                            )}

                            <Button
                                onClick={handleLoginFacebook}
                                className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[44px]"
                            >
                                <img
                                    src="https://api.withblip.com/facebooklogo.png"
                                    alt="Facebook"
                                    className="w-5 h-5"
                                />
                                Login with Facebook
                            </Button>
                        </div>
                    )}

                    {isSignupPage ? (
                        <p className="text-sm text-zinc-600">
                            Already have an account?{" "}
                            <button
                                onClick={() => navigate('/login')}
                                className="font-bold underline text-blue-600 hover:text-blue-800"
                            >
                                Head to Login
                            </button>
                        </p>
                    ) : (
                        <p className="text-sm text-zinc-600">
                            New user?{" "}
                            <button
                                onClick={() => navigate('/signup')}
                                className="font-bold underline text-blue-600 hover:text-blue-800"
                            >
                                Head to Sign Up Page
                            </button>
                        </p>
                    )}

                    <p className="text-xs text-zinc-500">
                        By clicking continue, you agree to our{" "}
                        <a href="https://app.withblip.com/terms-of-service" className="underline">Terms of Service</a> and{" "}
                        <a href="https://app.withblip.com/privacy-policy" className="underline">Privacy Policy</a>.
                    </p>
                </div>
            </div>

            {/* Right half — testimonial */}
            <TestimonialPanel />

            {/* Popup overlay */}
            <AnimatePresence>
                {popupStep && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute inset-0 bg-black/30 z-40"
                            onClick={closePopup}
                        />
                        <motion.div
                            key="popup"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                        >
                            <div
                                className="pointer-events-auto bg-white rounded-2xl shadow-xl flex flex-col"
                                style={{ width: 405, height: 425 }}
                            >
                                <div className="px-6 pt-6">
                                    <ProgressBar activeIndex={popupActiveIndex} />
                                </div>

                                <div className="flex-1 px-6 pt-5 overflow-hidden relative">
                                    <img
                                        src="https://api.withblip.com/logo.webp"
                                        alt="Blip"
                                        className="w-9 h-9 rounded-md mb-3"
                                    />
                                    <AnimatePresence mode="wait">
                                        {popupStep === 'role' && (
                                            <motion.div
                                                key="role"
                                                initial={{ opacity: 0, x: 12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -12 }}
                                                transition={{ duration: 0.18 }}
                                            >
                                                <div className="font-bold text-zinc-900">Hey!</div>
                                                <p className="text-sm text-zinc-600 mb-3">
                                                    Just two more questions so we can tailor Blip to your needs perfectly!
                                                </p>
                                                <div className="font-semibold text-zinc-900 mb-3">What role suits you best?</div>
                                                <RadioList options={ROLE_OPTIONS} value={jobRole} onChange={setJobRole} />
                                            </motion.div>
                                        )}
                                        {popupStep === 'source' && (
                                            <motion.div
                                                key="source"
                                                initial={{ opacity: 0, x: 12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -12 }}
                                                transition={{ duration: 0.18 }}
                                            >
                                                <div className="font-bold text-zinc-900">Hey!</div>
                                                <p className="text-sm text-zinc-600 mb-3">
                                                    This is the last one. Kind of for us.
                                                </p>
                                                <div className="font-semibold text-zinc-900 mb-3">How did you hear about Blip?</div>
                                                <RadioList options={SOURCE_OPTIONS} value={signupSource} onChange={setSignupSource} />
                                            </motion.div>
                                        )}
                                        {popupStep === 'fb' && (
                                            <motion.div
                                                key="fb"
                                                initial={{ opacity: 0, x: 12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -12 }}
                                                transition={{ duration: 0.18 }}
                                                className="h-full flex flex-col"
                                            >
                                                <div className="font-bold text-zinc-900">This one's important!</div>
                                                <p className="text-sm text-zinc-700 mt-2">
                                                    Facebook will prompt you to grant permissions to Blip, allowing safe access to your data.
                                                </p>
                                                <p className="text-sm text-zinc-700 mt-3">
                                                    Be sure to approve all pages and business managers you want Blip to use, or they won't appear in the app.
                                                </p>
                                                {initError && (
                                                    <p className="text-xs text-red-500 mt-2">{initError}</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="px-6 pb-6 pt-2 flex justify-end">
                                    {popupStep === 'fb' ? (
                                        <Button
                                            onClick={handleSignupFacebookLogin}
                                            disabled={isInitializing}
                                            className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[44px] disabled:opacity-60"
                                        >
                                            <img
                                                src="https://api.withblip.com/facebooklogo.png"
                                                alt="Facebook"
                                                className="w-5 h-5"
                                            />
                                            {isInitializing ? 'Redirecting...' : 'Login with Facebook'}
                                        </Button>
                                    ) : (
                                        <button
                                            onClick={handleNext}
                                            disabled={popupStep === 'role' ? !jobRole : !signupSource}
                                            className="bg-[#F90E6C] hover:bg-[#d80c5e] text-white text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            style={{ width: 100, height: 30 }}
                                        >
                                            Next →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
