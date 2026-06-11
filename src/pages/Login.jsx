import { useAuth } from "@/lib/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useIntercom } from "@/lib/useIntercom"
import Doodle from "../assets/onboarding/doodle.webp?url"
import MrAvatar from "../assets/onboarding/mr.webp?url"
import Rocket from "../assets/rocket2.webp?url"
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
    "ChatGPT / LLM",
    "Twitter / X",
    "Reddit",
    "Referral",
    "Joining a Team",
    "Other",
]

const STEPS = ["role", "source", "fb"]

function ProgressBar({ activeIndex }) {
    return (
        <div className="flex items-center w-full">
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
                                <div className="w-5 h-5 rounded-full bg-[#F90E6C] flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-[#FFBBD6]" />
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-[#DADADA]" />
                            )}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className="flex-1 h-1 bg-[#DADADA] relative overflow-hidden">
                                <motion.div
                                    initial={false}
                                    animate={{ width: i < activeIndex ? '100%' : '0%' }}
                                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                                    className="absolute inset-y-0 left-0 bg-[#F90E6C]"
                                />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function RadioList({ options, value, onChange, renderBelow }) {
    return (
        <div className="space-y-3">
            {options.map(opt => {
                const selected = value === opt
                return (
                    <div key={opt}>
                        <label
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
                        {renderBelow?.(opt)}
                    </div>
                )
            })}
        </div>
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
    const [teamCode, setTeamCode] = useState("")
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
                body: JSON.stringify({
                    email,
                    signupSource,
                    jobRole,
                    teamCode: signupSource === 'Joining a Team' ? teamCode.trim() : '',
                }),
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
    const showTeamCodeRow = popupStep === 'source' && signupSource === 'Joining a Team'
    const popupHeight = showTeamCodeRow ? 640 : 500

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden">
            <div
                role="status"
                className="z-[60] flex min-h-[44px] w-full items-center justify-center bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm"
            >
                We are facing issues with Facebook Login API. We&apos;re working on fixing it ASAP.
            </div>

            <div className="relative flex min-h-0 flex-1 w-full overflow-hidden">
                {/* Left half — form */}
                <div className="flex h-full w-full items-center justify-center bg-white px-8 md:w-1/2">
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

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-zinc-800 mb-2">Step 2.</label>
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip open={isValidEmail ? false : undefined}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => isValidEmail && startSignupFlow()}
                                                className="w-full flex items-center justify-center gap-2 text-white cursor-pointer"
                                                style={{
                                                    padding: '16px 46px',
                                                    fontSize: '18px',
                                                    lineHeight: 1,
                                                    borderRadius: '20px',
                                                    border: '2px solid #3f3e3e',
                                                    background: 'linear-gradient(0deg, #414141 0%, #000 77.88%)',
                                                    boxShadow: '0 2px 10px 0 rgba(0,0,0,0.25)',
                                                    height: '56px',
                                                    maxHeight: '56px',
                                                    letterSpacing: '0.2px',
                                                    // fontFamily: 'Alcyone, serif',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <img src={Rocket} alt="" className="size-8" />
                                                Start Launching Ads
                                            </button>
                                        </TooltipTrigger>
                                        {!isValidEmail && (
                                            <TooltipContent side="top">
                                                Please fill in your work email to continue
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
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
                                className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-2xl shadow-md flex items-center justify-center gap-2 h-[44px]"
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

                    <p className="text-xs text-zinc-500 max-w-[350px]">
                        By clicking continue, you agree to our{" "}
                        <a href="https://app.withblip.com/terms-of-service" className="underline">Terms of Service</a> &{" "}
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
                            <motion.div
                                className="pointer-events-auto bg-white shadow-xl flex flex-col"
                                initial={false}
                                animate={{ height: popupHeight }}
                                transition={{ duration: 0.28, ease: 'easeOut' }}
                                style={{
                                    width: 405,
                                    borderRadius: 40,
                                    border: '1px solid rgba(0,0,0,0.1)',
                                }}
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
                                    <AnimatePresence mode="wait" initial={false}>
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
                                                <RadioList
                                                    options={SOURCE_OPTIONS}
                                                    value={signupSource}
                                                    onChange={setSignupSource}
                                                    renderBelow={(opt) => opt === 'Joining a Team' && (
                                                        <AnimatePresence initial={false}>
                                                            {signupSource === 'Joining a Team' && (
                                                                <motion.div
                                                                    key="team-code"
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="pt-2 pl-7 space-y-2">
                                                                        <p className="text-xs text-zinc-500 leading-snug">
                                                                            You'll be auto-added to the team on signup — you can also do this later from inside the app. Your code is in the invite email, or ask a team member for it.
                                                                        </p>
                                                                        <Input
                                                                            type="text"
                                                                            placeholder="Enter Team Code (Optional)"
                                                                            value={teamCode}
                                                                            onChange={(e) => setTeamCode(e.target.value)}
                                                                            className="rounded-xl h-9 text-sm"
                                                                        />
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    )}
                                                />
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
                                                    1. Facebook will ask you to grant Blip a few permissions so it can access your data safely.
                                                </p>
                                                <p className="text-sm text-zinc-700 mt-3">
                                                    2. Make sure to approve all the pages and business managers you'd like to use in Blip — otherwise they won't show up in the app!
                                                </p>
                                                <p className="text-sm text-zinc-700 mt-3">
                                                    3. You can always add or remove pages and ad accounts later as well.
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
                                            className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-2xl shadow-md flex items-center justify-center gap-2 h-[44px] disabled:opacity-60"
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
                                            className="bg-[#F90E6C] text-white text-sm rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ width: 150, height: 40 }}
                                        >
                                            Next →
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
                </AnimatePresence>
            </div>
        </div>
    )
}
