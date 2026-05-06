import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Home from "@/assets/Home.webp"
import Rocket from "@/assets/rocket.webp"
import { ONBOARDING_CARDS } from "@/lib/onboardingCards"

const CURSOR_KEY = "onboardingCursor"

function ProgressDots({ steps, activeIndex }) {
    if (!steps || steps.length <= 1) return null
    return (
        <div className="w-full">
            <div className="flex items-center w-full">
                {steps.map((_, i) => {
                    const isDone = i < activeIndex
                    const isCurrent = i === activeIndex
                    return (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                            <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                                {isDone ? (
                                    <div className="w-4 h-4 rounded-full bg-[#6FB7FF] flex items-center justify-center">
                                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                ) : isCurrent ? (
                                    <div className="w-4 h-4 rounded-full bg-[#6FB7FF] flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </div>
                                ) : (
                                    <div className="w-4 h-4 rounded-full bg-[#DADADA]" />
                                )}
                            </div>
                            {i < steps.length - 1 && (
                                <div className="flex-1 h-[3px] bg-[#DADADA] relative overflow-hidden mx-1">
                                    <motion.div
                                        initial={false}
                                        animate={{ width: i < activeIndex ? "100%" : "0%" }}
                                        transition={{ duration: 0.35, ease: "easeInOut" }}
                                        className="absolute inset-y-0 left-0 bg-[#6FB7FF]"
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="flex w-full mt-2">
                {steps.map((step, i) => (
                    <div
                        key={step.id}
                        className={`flex-1 last:flex-none text-[11px] text-center ${i === activeIndex
                                ? "font-semibold text-[#1F2937]"
                                : "text-[#9CA3AF]"
                            }`}
                        style={{ minWidth: 0 }}
                    >
                        {i === activeIndex ? step.title : ""}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function OnboardingWizard({
    isNewUser,
    userName,
    cards,
    adAccounts,
    onImport,
    onGoToSettings,
    onFinish,
    onClose,
}) {
    // Phases: "cards" (feature carousel), "choice" (new-user terminal), "import" (new-user import step)
    const initialIndex = useMemo(() => {
        if (!isNewUser) return 0
        const saved = parseInt(localStorage.getItem(CURSOR_KEY) || "0", 10)
        if (Number.isNaN(saved)) return 0
        return Math.min(Math.max(saved, 0), cards.length)
    }, [isNewUser, cards.length])

    const [phase, setPhase] = useState(() => (initialIndex >= cards.length ? "choice" : "cards"))
    const [cardIndex, setCardIndex] = useState(() => Math.min(initialIndex, Math.max(cards.length - 1, 0)))
    const [selectedAdAccount, setSelectedAdAccount] = useState("")
    const [isImporting, setIsImporting] = useState(false)

    useEffect(() => {
        if (!isNewUser) return
        const cursor = phase === "cards" ? cardIndex : cards.length
        localStorage.setItem(CURSOR_KEY, String(cursor))
    }, [isNewUser, phase, cardIndex, cards.length])

    const finishWithIds = () => {
        localStorage.removeItem(CURSOR_KEY)
        onFinish({ seenIds: cards.map((c) => c.id), fullyCompleted: true })
    }

    const handleNext = () => {
        if (cardIndex < cards.length - 1) {
            setCardIndex((i) => i + 1)
            return
        }
        if (isNewUser) {
            setPhase("choice")
        } else {
            finishWithIds()
        }
    }

    const handleSkip = () => {
        if (isNewUser) {
            setPhase("choice")
            return
        }
        onClose()
    }

    const handleChooseHome = () => {
        setPhase("import")
    }

    const handleChooseSettings = () => {
        localStorage.removeItem(CURSOR_KEY)
        onFinish({ seenIds: cards.map((c) => c.id), fullyCompleted: true })
        onGoToSettings()
    }

    const handleImport = async () => {
        if (!selectedAdAccount) return
        setIsImporting(true)
        try {
            await onImport(selectedAdAccount)
            finishWithIds()
        } catch (err) {
            console.error("Import failed:", err)
        } finally {
            setIsImporting(false)
        }
    }

    const handleBackdropClick = (e) => {
        if (e.target !== e.currentTarget) return
        // Allow closing only on the new-user terminal screens or for existing users
        if (!isNewUser || phase !== "cards") onClose()
    }

    const headerText = isNewUser
        ? `Hey ${userName || "there"}`
        : cards.length === 1
            ? "New Feature"
            : "What's New"

    const subText = isNewUser
        ? "Do you want a very quick tour of our best features or want to skip onboarding to explore yourself?"
        : cards.length === 1
            ? "Check out what's new since you were last here."
            : "Here's what's new since you were last here."

    const activeCard = cards[Math.min(cardIndex, cards.length - 1)]

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={handleBackdropClick}
        >
            <div
                className="relative bg-[#FAF9F7] rounded-[24px] shadow-2xl overflow-hidden"
                style={{ width: 535, maxHeight: 610 }}
                onClick={(e) => e.stopPropagation()}
            >
                {phase === "cards" && (
                    <div className="flex flex-col px-7 pt-7 pb-6 animate-fadeSwap">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{isNewUser ? "👋" : "✨"}</span>
                                <h2 className="text-[22px] font-bold text-[#111827]">{headerText}</h2>
                            </div>
                            <button
                                onClick={() => {
                                    // "Index" jumps the dots into title-only legend mode by going back to start
                                    setCardIndex(0)
                                }}
                                className="text-[12px] font-medium text-white bg-black rounded-full px-3 py-1"
                            >
                                Index
                            </button>
                        </div>
                        <p className="text-[13px] text-[#4B5563] mb-4 leading-snug">{subText}</p>

                        <ProgressDots steps={cards} activeIndex={cardIndex} />

                        <h3 className="mt-4 text-[18px] font-bold text-[#111827]">{activeCard.heading}</h3>
                        <p className="mt-1 text-[13px] text-[#4B5563] leading-snug">{activeCard.body}</p>

                        <div className="mt-4 rounded-[16px] border-2 border-black/80 overflow-hidden bg-white">
                            <img
                                src={activeCard.image}
                                alt={activeCard.title}
                                className="w-full h-[260px] object-cover"
                            />
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                            <button
                                onClick={handleSkip}
                                className="text-[14px] font-medium text-[#374151] hover:text-black"
                            >
                                Skip Onboarding
                            </button>
                            <Button
                                onClick={handleNext}
                                className="rounded-full bg-black hover:bg-black/85 text-white text-[14px] font-semibold px-6 py-5"
                            >
                                {cardIndex === cards.length - 1 && !isNewUser ? "Got it" : "Next →"}
                            </Button>
                        </div>
                    </div>
                )}

                {phase === "choice" && (
                    <div className="px-8 py-10 text-center animate-fadeSwap">
                        <div className="text-4xl mb-4">👋</div>
                        <h2 className="text-2xl font-semibold text-[#415363] mb-1">
                            Welcome to Blip{userName ? `, ${userName}` : ""}!
                        </h2>
                        <p className="text-gray-500 mb-10 text-sm">
                            Jump straight into launching ads or set up your ad templates
                        </p>
                        <div className="flex justify-center gap-6">
                            <button
                                onClick={handleChooseHome}
                                className="group flex flex-col items-center space-y-3 focus:outline-none"
                            >
                                <img
                                    src={Home}
                                    alt="Home"
                                    className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105 mb-3"
                                />
                                <div className="bg-gradient-to-b from-[#FFC979] to-[#FFA500] text-white text-sm font-medium rounded-full px-4 py-2.5 w-[180px] flex items-center justify-center">
                                    Go to Home
                                </div>
                            </button>
                            <button
                                onClick={handleChooseSettings}
                                className="group flex flex-col items-center space-y-3 focus:outline-none"
                            >
                                <img
                                    src={Rocket}
                                    alt="Settings"
                                    className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105 mb-3"
                                />
                                <div className="bg-gradient-to-b from-[#FF609F] to-[#F72585] text-white text-sm font-medium rounded-full px-4 py-2.5 w-[200px] flex items-center justify-center">
                                    Configure Preferences
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {phase === "import" && (
                    <div className="px-8 py-10 text-center animate-fadeSwap">
                        <img
                            src="https://api.withblip.com/home.webp"
                            alt="Home"
                            className="w-20 mx-auto mb-4"
                        />
                        <h2 className="text-xl font-semibold text-[#415363] mb-6">
                            Lets import data from your most recent ad so you can quickly test an ad launch!
                        </h2>
                        <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                            <SelectTrigger className="w-full px-4 py-3 mb-6 rounded-2xl border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#F72585]">
                                <SelectValue placeholder="Select Ad Account" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-2xl">
                                {(adAccounts || []).map((account) => (
                                    <SelectItem
                                        key={account.id}
                                        value={account.id}
                                        className="rounded-xl data-[state=checked]:bg-[#FFF5F9] hover:bg-[#FFF5F9]"
                                    >
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex justify-center gap-4">
                            <Button
                                onClick={handleImport}
                                disabled={!selectedAdAccount || isImporting}
                                className="bg-gradient-to-b from-[#FF609F] to-[#F72585] hover:opacity-90 text-white text-base px-8 py-2.5 rounded-full disabled:opacity-50"
                            >
                                Import
                            </Button>
                        </div>
                        {isImporting && (
                            <div className="flex flex-row items-center justify-center gap-2 mt-4">
                                <Loader className="w-6 h-6 animate-spin text-[#F72585]" />
                                <p className="text-sm text-gray-600">
                                    Importing data from Facebook can take a few seconds...
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <style>
                    {`
                    @keyframes fadeSwap {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .animate-fadeSwap {
                        animation: fadeSwap 0.3s ease-out forwards;
                    }
                    `}
                </style>
            </div>
        </div>
    )
}

// Re-export so callers can build the unseen-cards list themselves.
export { ONBOARDING_CARDS }
