import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
import Home from "@/assets/Pro.webp"
import SettingsImage from "@/assets/settings.png"
import Rocket2 from "@/assets/rocket2.webp"
import HelloIcon from "@/assets/onboarding/hello.webp"
import ZapIcon from "@/assets/Zap.webp"
import { ONBOARDING_CARDS } from "@/lib/onboardingCards"

const CURSOR_KEY = "onboardingCursor"

// Minimum padding (px) reserved on each side of the dot row.
const PROGRESS_DOTS_MIN_PADDING = 8
// Buffer (px) so labels don't visually butt against the popup edge.
const PROGRESS_DOTS_LABEL_BUFFER = 8
// Half of dot width — labels are centered at this offset from each slot's left.
const PROGRESS_DOTS_DOT_OFFSET = 10

function ProgressDots({ steps, activeIndex }) {
    const labelRefs = useRef([])
    const [overflowPadding, setOverflowPadding] = useState({ left: 0, right: 0 })
    const lastIndex = steps ? steps.length - 1 : 0

    useLayoutEffect(() => {
        if (!steps || steps.length <= 1) return
        const firstEl = labelRefs.current[0]
        const lastEl = labelRefs.current[lastIndex]
        if (!firstEl || !lastEl) return
        // Each label is centered at PROGRESS_DOTS_DOT_OFFSET from its slot's
        // left edge. Half of the label extends to the left of that point;
        // ensure the wrapper has enough padding on each side that this
        // overflow stays inside the popup.
        const requiredLeft = Math.max(0, firstEl.offsetWidth / 2 - PROGRESS_DOTS_DOT_OFFSET + PROGRESS_DOTS_LABEL_BUFFER)
        const requiredRight = Math.max(0, lastEl.offsetWidth / 2 - PROGRESS_DOTS_DOT_OFFSET + PROGRESS_DOTS_LABEL_BUFFER)
        setOverflowPadding({
            left: Math.max(PROGRESS_DOTS_MIN_PADDING, requiredLeft),
            right: Math.max(PROGRESS_DOTS_MIN_PADDING, requiredRight),
        })
    }, [steps, activeIndex, lastIndex])

    if (!steps || steps.length <= 1) return null
    return (
        <div
            className="w-full"
            style={{ paddingLeft: overflowPadding.left, paddingRight: overflowPadding.right }}
        >
            <div className="flex items-center w-full">
                {steps.map((_, i) => {
                    const isDone = i < activeIndex
                    const isCurrent = i === activeIndex
                    return (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                            <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                {isDone ? (
                                    <div className="w-5 h-5 rounded-full bg-[#46B8FF] flex items-center justify-center">
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                ) : isCurrent ? (
                                    <div className="w-5 h-5 rounded-full bg-[#46B8FF] flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[#95D6FF]" />
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-[#DADADA]" />
                                )}
                            </div>
                            {i < lastIndex && (
                                <div className="flex-1 h-1 bg-[#DADADA] relative overflow-hidden">
                                    <motion.div
                                        initial={false}
                                        animate={{ width: i < activeIndex ? "100%" : "0%" }}
                                        transition={{ duration: 0.35, ease: "easeInOut" }}
                                        className="absolute inset-y-0 left-0 bg-[#46B8FF]"
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="flex items-start w-full mt-2 h-5">
                {steps.map((step, i) => {
                    const isLast = i === lastIndex
                    return (
                        <div
                            key={step.id}
                            className={`relative ${isLast ? "w-5 flex-none" : "flex-1"}`}
                        >
                            <div
                                ref={(el) => { labelRefs.current[i] = el }}
                                className={`absolute top-0 text-[11px] whitespace-nowrap ${i === activeIndex ? "font-semibold text-black" : "text-[#9CA3AF]"
                                    }`}
                                style={{ left: `${PROGRESS_DOTS_DOT_OFFSET}px`, transform: "translateX(-50%)" }}
                            >
                                {step.title}
                            </div>
                        </div>
                    )
                })}
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
        const saved = parseInt(localStorage.getItem(CURSOR_KEY) || "0", 10)
        if (Number.isNaN(saved)) return 0
        return Math.min(Math.max(saved, 0), cards.length)
    }, [cards.length])

    const [phase, setPhase] = useState(() =>
        isNewUser && initialIndex >= cards.length ? "choice" : "cards"
    )
    const [cardIndex, setCardIndex] = useState(() => Math.min(initialIndex, Math.max(cards.length - 1, 0)))
    const [selectedAdAccount, setSelectedAdAccount] = useState("")
    const [isImporting, setIsImporting] = useState(false)

    useEffect(() => {
        const cursor = phase === "cards" ? cardIndex : cards.length
        localStorage.setItem(CURSOR_KEY, String(cursor))
    }, [phase, cardIndex, cards.length])

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
        // Existing user: explicit "skip" = ack everything so it doesn't reappear.
        finishWithIds()
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
        // New users: never dismiss via backdrop. Closing without finishing the
        // flow doesn't mark onboarding complete, so it would just reappear on
        // reload — force them through the choice/import terminal step instead.
        if (isNewUser) return
        // Existing users: any dismissal acks the cards so they don't reappear.
        finishWithIds()
    }

    const activeCard = cards[Math.min(cardIndex, cards.length - 1)]
    const isSingleCard = cards.length === 1
    const headerIcon = isNewUser ? HelloIcon : ZapIcon
    const headerText = isNewUser
        ? `Hey ${userName || "there"}`
        : isSingleCard
            ? activeCard.heading
            : `Hey ${userName || "there"}`
    const subText = isNewUser
        ? "Lets give you a really quick tour of how to get the most out of Blip!"
        : isSingleCard
            ? activeCard.body
            : "Check out what's new since you were last here."

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={handleBackdropClick}
        >
            <div
                className="relative bg-[#FAF9F7] rounded-[24px] shadow-2xl overflow-hidden"
                style={{ minWidth: 620, maxHeight: 640 }}
                onClick={(e) => e.stopPropagation()}
            >
                {phase === "cards" && (
                    <div className="flex flex-col px-7 pt-7 pb-6 animate-fadeSwap">
                        <div className="flex items-center gap-2 mb-2">
                            <img src={headerIcon} alt="" className="w-7 h-7 object-contain" />
                            <h2 className="text-[22px] font-bold text-[#111827]">{headerText}</h2>
                        </div>
                        <p className={`text-[13px] text-[#4B5563] leading-snug ${isSingleCard ? "mb-3" : "mb-4"}`}>{subText}</p>

                        <ProgressDots steps={cards} activeIndex={cardIndex} />

                        {!isSingleCard && (
                            <>
                                <h3 className="mt-4 text-[18px] font-bold text-[#111827]">{activeCard.heading}</h3>
                                <p className="mt-1 text-[13px] text-[#4B5563] leading-snug">{activeCard.body}</p>
                            </>
                        )}

                        <div className={isSingleCard ? "mt-1" : "mt-4"}>
                            <img
                                src={activeCard.image}
                                alt={activeCard.title}
                                className="w-full h-[290px] object-cover border-2 border-black rounded-[20px] shadow-xs"
                            />
                        </div>

                        <div className={`mt-5 flex items-center ${cardIndex === cards.length - 1 ? "justify-end" : "justify-between"}`}>
                            {cardIndex !== cards.length - 1 && (
                                <button
                                    onClick={handleSkip}
                                    className="text-[14px] font-medium text-[#374151] hover:text-black w-full"
                                >
                                    {isNewUser ? "Skip Onboarding" : "Skip"}
                                </button>
                            )}
                            <Button
                                onClick={handleNext}
                                className={`rounded-full bg-black hover:bg-black/85 text-white text-[14px] font-semibold py-5 w-full ${isSingleCard ? "w-full" : "px-6"}`}
                            >
                                {cardIndex === cards.length - 1 && !isNewUser ? "Got it" : "Next →"}
                            </Button>
                        </div>
                    </div>
                )}

                {phase === "choice" && (
                    <div className="px-8 py-10 text-center animate-fadeSwap">
                        {/* <img src={Rocket2} alt="" className="w-12 h-12 object-contain mx-auto mb-4" /> */}
                        <h2 className="text-xl font-semibold text-[#415363] mb-1">
                            Jump straight into launching ads <br></br>or set up your ad templates
                        </h2>
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
                                    Launch Ads
                                </div>
                            </button>
                            <button
                                onClick={handleChooseSettings}
                                className="group flex flex-col items-center space-y-3 focus:outline-none"
                            >
                                <img
                                    src={SettingsImage}
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
                            Lets import data from your most recent ad<br></br> so you can quickly test an ad launch!
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
