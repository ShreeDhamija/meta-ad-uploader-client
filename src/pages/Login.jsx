import { useAuth } from "@/lib/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Building2, CirclePlus, Crown, Mail, Megaphone, Newspaper, Store, UserRound, UserRoundPlus } from "lucide-react"
import { useIntercom } from "@/lib/useIntercom"
import Doodle from "../assets/onboarding/doodle.webp?url"
import MrAvatar from "../assets/onboarding/mr.webp?url"
import Rocket from "../assets/rocket2.webp?url"
import Check from "../assets/icons/check.svg"
import ChatGptIcon from "../assets/icons/signup/chatgpt-6.svg"
import GoogleIcon from "../assets/icons/signup/google.svg"
import InstagramIcon from "../assets/icons/signup/instagram.svg"
import RedditIcon from "../assets/icons/signup/reddit.svg"
import TwitterIcon from "../assets/icons/signup/twitter.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const IS_STAGING =
    import.meta.env.VITE_ENV === 'staging' ||
    import.meta.env.VITE_ENV === 'dev' ||
    API_BASE_URL.includes('staging') ||
    API_BASE_URL.includes('dev') ||
    (typeof window !== 'undefined' && (
        window.location.hostname.includes('staging.withblip.com') ||
        window.location.hostname.includes('dev.withblip.com')
    ))

const ROLE_OPTIONS = [
    { value: "Freelancer Marketing Specialist", icon: UserRound },
    { value: "Paid Ads Agency", icon: Building2 },
    { value: "Marketing at a Brand", icon: Store },
    { value: "Founder/CEO", icon: Crown },
    { value: "Other" },
]

const SOURCE_OPTIONS = [
    { value: "Google", iconSrc: GoogleIcon },
    { value: "ChatGPT / LLM", iconSrc: ChatGptIcon },
    { value: "Twitter / X", iconSrc: TwitterIcon },
    { value: "Instagram", iconSrc: InstagramIcon },
    { value: "Newsletter", icon: Newspaper },
    { value: "Advertisement", icon: Megaphone },
    { value: "Reddit", iconSrc: RedditIcon },
    { value: "Referral", icon: CirclePlus },
    { value: "Joining a Team", icon: UserRoundPlus },
    { value: "Other" },
]

function renderSignupOptionLabel(option) {
    const Icon = option?.icon

    return (
        <span className="flex min-w-0 items-center gap-2.5">
            {option?.iconSrc && <img src={option.iconSrc} alt="" className="size-[18px] shrink-0 object-contain" />}
            {Icon && <Icon aria-hidden="true" className="size-[18px] shrink-0 text-zinc-600" strokeWidth={1.8} />}
            <span className="truncate">{option?.value}</span>
        </span>
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

    // Signup form and Facebook guidance popup state
    const [popupStep, setPopupStep] = useState(null) // null | 'fb'
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
        setPopupStep('fb')
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

    const isSignupFormComplete = isValidEmail && jobRole && signupSource

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden">
            <div className="relative flex min-h-0 flex-1 w-full overflow-hidden">
                {/* Left half — form */}
                <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-white px-8 py-8 md:w-1/2">
                    <div className="w-full max-w-sm space-y-6">
                        <div className="space-y-1">
                            <img
                                src="https://api.withblip.com/logo.webp"
                                alt="Blip"
                                className="w-[44px] h-[44px] rounded-md mb-2"
                            />
                            <h2 className="text-2xl font-bold tracking-tight">Welcome To Blip!</h2>
                            <p className="text-sm font-semibold text-zinc-800">
                                {isSignupPage ? 'Start your 7 day free trial' : ''}
                            </p>
                            <p className="text-sm text-zinc-600">
                                {isSignupPage ? "You're so close to ditching Ads Manager forever" : 'Login to your account'}
                            </p>
                        </div>

                        {isSignupPage ? (
                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    if (isSignupFormComplete) startSignupFlow()
                                }}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-zinc-800">Work email</label>
                                        {isValidEmail && <img src={Check} alt="Valid" className="size-5" />}
                                    </div>
                                    <div className="relative">
                                        <Mail
                                            aria-hidden="true"
                                            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-zinc-500"
                                            strokeWidth={1.8}
                                        />
                                        <Input
                                            type="email"
                                            placeholder="Enter your Work Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-[46px] rounded-[18px] pl-10 pr-3.5"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-800">Job role</label>
                                    <Select value={jobRole} onValueChange={setJobRole}>
                                        <SelectTrigger className="h-[46px] w-full rounded-[18px] bg-white px-3.5 py-0">
                                            <SelectValue placeholder="Select your job role">
                                                {jobRole && renderSignupOptionLabel(ROLE_OPTIONS.find((option) => option.value === jobRole))}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-[18px] bg-white p-0.5">
                                            {ROLE_OPTIONS.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                    className="cursor-pointer rounded-xl py-2 pl-2.5 pr-8 hover:bg-zinc-100 focus:bg-zinc-100"
                                                >
                                                    {renderSignupOptionLabel(option)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-800">How did you hear about Blip?</label>
                                    <Select
                                        value={signupSource}
                                        onValueChange={(value) => {
                                            setSignupSource(value)
                                            if (value !== 'Joining a Team') setTeamCode("")
                                        }}
                                    >
                                        <SelectTrigger className="h-[46px] w-full rounded-[18px] bg-white px-3.5 py-0">
                                            <SelectValue placeholder="Select a signup source">
                                                {signupSource && renderSignupOptionLabel(SOURCE_OPTIONS.find((option) => option.value === signupSource))}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-[18px] bg-white p-0.5">
                                            {SOURCE_OPTIONS.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                    className="cursor-pointer rounded-xl py-2 pl-2.5 pr-8 hover:bg-zinc-100 focus:bg-zinc-100"
                                                >
                                                    {renderSignupOptionLabel(option)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

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
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-zinc-800">Team code <span className="font-normal text-zinc-500">(optional)</span></label>
                                                <div className="relative">
                                                    <UserRoundPlus
                                                        aria-hidden="true"
                                                        className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-zinc-500"
                                                        strokeWidth={1.8}
                                                    />
                                                    <Input
                                                        type="text"
                                                        placeholder="Enter your team code"
                                                        value={teamCode}
                                                        onChange={(e) => setTeamCode(e.target.value)}
                                                        className="h-[46px] rounded-[18px] pl-10 pr-3.5"
                                                    />
                                                </div>
                                                <p className="text-xs leading-snug text-zinc-500">
                                                    Your code is in the invite email, or ask the team admin for it. You can also do this in preferences later.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-3 pt-1">
                                    <TooltipProvider delayDuration={100}>
                                        <Tooltip open={isSignupFormComplete ? false : undefined}>
                                            <TooltipTrigger asChild>
                                                <span className="block">
                                                    <button
                                                        type="submit"
                                                        className="w-full flex items-center justify-center gap-2 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                                        disabled={!isSignupFormComplete}
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
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <img src={Rocket} alt="" className="size-8" />
                                                        Start Launching Ads
                                                    </button>
                                                </span>
                                            </TooltipTrigger>
                                            {!isSignupFormComplete && (
                                                <TooltipContent side="top">
                                                    Please complete all signup fields to continue
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </form>
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
                                    style={{
                                        width: 405,
                                        minHeight: 420,
                                        borderRadius: 40,
                                        border: '1px solid rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div className="flex-1 px-6 pt-6 overflow-hidden relative">
                                        <img
                                            src="https://api.withblip.com/logo.webp"
                                            alt="Blip"
                                            className="w-9 h-9 rounded-md mb-3"
                                        />
                                        <div className="font-bold text-zinc-900">This one&apos;s important!</div>
                                        <p className="text-sm text-zinc-700 mt-2">
                                            1. Facebook will ask you to grant Blip a few permissions so it can access your data safely.
                                        </p>
                                        <p className="text-sm text-zinc-700 mt-3">
                                            2. Make sure to approve all the pages and business managers you&apos;d like to use in Blip — otherwise they won&apos;t show up in the app!
                                        </p>
                                        <p className="text-sm text-zinc-700 mt-3">
                                            3. You can always add or remove pages and ad accounts later as well.
                                        </p>
                                        {initError && (
                                            <p className="text-xs text-red-500 mt-2">{initError}</p>
                                        )}
                                    </div>

                                    <div className="px-6 pb-6 pt-4 flex justify-end">
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
