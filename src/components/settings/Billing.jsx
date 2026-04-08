"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import GiftIcon from "@/assets/gift.webp"
import ProPlanImage from "@/assets/Pro.webp"
import LightPlanImage from "@/assets/icons/zap.webp"
import StarterPlanImage from "@/assets/icons/star.webp"
import CheckCircleIcon from "@/assets/icons/check-circle.svg?react"
import BillingCheckIcon from "@/assets/icons/Billing/Check.svg?react"
import BillingCalendarIcon from "@/assets/icons/Billing/Calendar.svg?react"
import BillingAlertIcon from "@/assets/icons/Billing/Alert.svg?react"
import BillingSwitchIcon from "@/assets/icons/Billing/Switch.svg?react"
import BillingCancelIcon from "@/assets/icons/Billing/Cancel.svg?react"
import BillingInvoiceIcon from "@/assets/icons/Billing/Frame.svg?react"
import MailIcon from "@/assets/icons/mail.svg?react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay,
} from "@/components/ui/dialog"
import useSubscription from "@/lib/useSubscriptionSettings"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"
const PLANS = [
    {
        key: "agency",
        matchKeys: ["agency", "pro"],
        shortLabel: "PRO",
        name: "Blip Pro",
        planPhrase: "pro",
        accountLine: "Unlimited Ad Accounts",
        price: 370,
        image: ProPlanImage,
        buttonClass: "bg-[#02EE39] text-[#005814] hover:bg-[#19F64A]",
    },
    {
        key: "brand",
        matchKeys: ["brand"],
        shortLabel: "LIGHT",
        name: "Blip Light",
        planPhrase: "light",
        accountLine: "Up to 5 Ad Accounts",
        price: 199,
        image: LightPlanImage,
        buttonClass: "bg-[#5B55FF] text-white hover:bg-[#645BFF]",
    },
    {
        key: "starter",
        matchKeys: ["starter"],
        shortLabel: "STARTER",
        name: "Blip Starter",
        planPhrase: "starter",
        accountLine: "1 Ad Account",
        price: 49,
        image: StarterPlanImage,
        buttonClass: "bg-[#FFD21F] text-[#644F00] hover:bg-[#FFD21F]",
    },
]

const CANCEL_REASONS = [
    { id: "no_longer_need", label: "I no longer need to launch ads for my brand" },
    { id: "not_media_buyer", label: "I am no longer the media buyer for the brand/agency" },
    { id: "price", label: "Price" },
    { id: "buggy", label: "Buggy experience" },
    { id: "competitor", label: "Switching to a competitor" },
    { id: "other", label: "Other" },
]

const commonFeatureLines = [
    "Unlimited Ads",
    "Instant Setting Sync",
    "Access to Analytics",
    "Unlimited Team Seats",
]

function formatPlanPrice(price) {
    return `$${price}/month`
}

function getPlanMeta(planType) {
    return PLANS.find((plan) => plan.matchKeys.includes(planType))
}

export default function BillingSettings() {
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const {
        loading,
        subscriptionData,
        refreshSubscriptionData,
        isTrialExpired,
        isPaidSubscriber,
    } = useSubscription()

    const [cancelReason, setCancelReason] = useState(null)
    const [cancelOtherText, setCancelOtherText] = useState("")
    const [submittingCancel, setSubmittingCancel] = useState(false)
    const [showPlanSelector, setShowPlanSelector] = useState(false)
    const [showChangePlanDialog, setShowChangePlanDialog] = useState(false)
    const [pendingPlanChange, setPendingPlanChange] = useState(null)
    const [changingPlanType, setChangingPlanType] = useState(null)
    const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState(null)
    const [portalLoading, setPortalLoading] = useState(false)
    const [reactivating, setReactivating] = useState(false)

    const hasUsedRetentionDiscount = subscriptionData?.hasUsedRetentionDiscount || false
    const isTeamMember = subscriptionData.teamId && !subscriptionData.isTeamOwner
    const currentPlan = isPaidSubscriber()
        ? (getPlanMeta(subscriptionData.planType) || PLANS[0])
        : null

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session_id")
        if (!sessionId) return

        fetch(`${API_BASE_URL}/api/stripe/session/${encodeURIComponent(sessionId)}`, {
            credentials: "include",
        })
            .then(async (res) => {
                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || `Session fetch failed: ${res.status}`)
                }

                const data = await res.json()
                if (data.amount_total) {
                    window.dataLayer = window.dataLayer || []
                    window.dataLayer.push({
                        event: "purchase",
                        value: data.amount_total,
                        customer_name: data.customer_name,
                        customer_email: data.customer_email,
                    })
                }

                const url = new URL(window.location.href)
                if (url.searchParams.has("session_id")) {
                    url.searchParams.delete("session_id")
                    window.history.replaceState({}, "", url)
                }
            })
            .catch((err) => {
                console.error("[Billing] Error fetching Stripe session:", err)
            })
    }, [])

    const handleCheckout = async (planKey) => {
        setCheckoutLoadingPlan(planKey)
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ planType: planKey }),
            })

            const { url } = await response.json()
            window.location.href = url
        } catch {
            toast.error("Failed to start upgrade process")
            setCheckoutLoadingPlan(null)
        }
    }

    const handleViewInvoices = async () => {
        setPortalLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/customer-portal`, {
                method: "POST",
                credentials: "include",
            })

            if (response.ok) {
                const { url } = await response.json()
                window.open(url, "_blank")
            } else {
                const error = await response.json()
                toast.error(error.message || "Failed to access customer portal")
            }
        } catch {
            toast.error("Failed to access customer portal")
        } finally {
            setPortalLoading(false)
        }
    }

    const handleReactivate = async () => {
        setReactivating(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/reactivate-subscription`, {
                method: "POST",
                credentials: "include",
            })

            if (response.ok) {
                toast.success("Subscription reactivated successfully!")
                refreshSubscriptionData()
            } else {
                const error = await response.json()
                toast.error(error.message || "Failed to reactivate subscription")
            }
        } catch {
            toast.error("Failed to reactivate subscription")
        } finally {
            setReactivating(false)
        }
    }

    const handleChangePlanClick = (newPlanType) => {
        const currentPlanKey = currentPlan.key
        if (newPlanType === currentPlanKey) return
        setPendingPlanChange(newPlanType)
        setShowChangePlanDialog(true)
    }

    const confirmChangePlan = async () => {
        if (!pendingPlanChange) return

        setShowChangePlanDialog(false)
        setChangingPlanType(pendingPlanChange)

        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/change-plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ newPlanType: pendingPlanChange }),
            })

            const data = await response.json()
            if (data.success) {
                toast.success(`Plan changed to ${getPlanMeta(pendingPlanChange).name}. Reloading...`)
                setTimeout(() => {
                    window.location.reload()
                }, 1200)
            } else {
                toast.error(data.error || "Failed to change plan")
            }
        } catch (error) {
            console.error("Error changing plan:", error)
            toast.error("Failed to change plan")
        } finally {
            setChangingPlanType(null)
            setPendingPlanChange(null)
        }
    }

    const getReasonPayload = () => {
        const reasonObj = CANCEL_REASONS.find((reason) => reason.id === cancelReason)
        return {
            reason: cancelReason,
            details: cancelReason === "other" ? cancelOtherText : (reasonObj?.label || ""),
        }
    }

    const confirmCancel = async () => {
        if (!cancelReason) {
            toast.error("Please select a reason")
            return
        }
        if (cancelReason === "other" && !cancelOtherText.trim()) {
            toast.error("Please tell us why")
            return
        }

        setSubmittingCancel(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/cancel-subscription`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(getReasonPayload()),
            })

            if (response.ok) {
                toast.success("Subscription will cancel at the end of your billing period")
                refreshSubscriptionData()
                setShowCancelDialog(false)
                setCancelReason(null)
                setCancelOtherText("")
            } else {
                toast.error("Failed to cancel subscription")
            }
        } catch {
            toast.error("Failed to cancel subscription")
        } finally {
            setSubmittingCancel(false)
        }
    }

    const claimRetentionDiscount = async () => {
        setSubmittingCancel(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/apply-retention-discount`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(getReasonPayload()),
            })

            if (response.ok) {
                toast.success("75% off applied to your next invoice!")
                refreshSubscriptionData()
                setShowCancelDialog(false)
                setCancelReason(null)
                setCancelOtherText("")
            } else {
                const err = await response.json()
                toast.error(err.error || "Failed to apply discount")
            }
        } catch {
            toast.error("Failed to apply discount")
        } finally {
            setSubmittingCancel(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-16 rounded-[24px] bg-gray-200" />
                    <div className="h-12 rounded-[20px] bg-gray-200" />
                    <div className="h-12 rounded-[20px] bg-gray-200" />
                    <div className="h-12 rounded-[20px] bg-gray-200" />
                </div>
            </div>
        )
    }

    const cancelDate = subscriptionData?.willCancelAt ? new Date(subscriptionData.willCancelAt) : null
    const hasScheduledCancellation = Boolean(cancelDate && cancelDate > new Date())

    const statusConfig = isPaidSubscriber()
        ? {
            containerClass: "border border-[#CFEFBF] bg-[#E2FFC8]",
            titleClass: "text-[#0F5132]",
            messageClass: "text-[#2A6B43]",
            chipClass: "text-[#15803D]",
            dotClass: "bg-[#15803D]",
            icon: BillingCheckIcon,
            label: currentPlan.shortLabel,
            message: hasScheduledCancellation
                ? `Your subscription stays active until ${cancelDate.toLocaleDateString()}.`
                : `You're currently subscribed to the ${currentPlan.planPhrase} plan!`,
        }
        : isTrialExpired()
            ? {
                containerClass: "border border-[#F5BE9A] bg-[#FFD1AD]",
                titleClass: "text-[#B42318]",
                messageClass: "text-[#D92D20]",
                chipClass: "text-[#C1121F]",
                dotClass: "bg-[#D00000]",
                icon: BillingAlertIcon,
                label: "TRIAL EXPIRED",
                message: "Your trial has expired! Subscribe below to continue launching Ads",
            }
            : {
                containerClass: "border border-[#C5DFFF] bg-[#D8EDFF]",
                titleClass: "text-[#1D4ED8]",
                messageClass: "text-[#295BDE]",
                chipClass: "text-[#1D4ED8]",
                dotClass: "bg-[#2155FF]",
                icon: BillingCalendarIcon,
                label: "FREE TRIAL",
                message: `You're currently on the free trial. You have ${subscriptionData.trialDaysLeft} day${subscriptionData.trialDaysLeft === 1 ? "" : "s"} remaining`,
            }

    const StatusIcon = statusConfig.icon

    return (
        <div className="space-y-6">
            {!isTeamMember && (
                <>
                    <div className={`rounded-[24px] px-5 py-4 pb-5 ${statusConfig.containerClass}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <p className={`text-[16px] font-semibold ${statusConfig.titleClass}`}>Your Current Plan</p>
                                <div className="flex items-center gap-2">
                                    <StatusIcon className="h-5 w-5 flex-shrink-0" />
                                    <p className={`text-sm font-medium ${statusConfig.messageClass}`}>{statusConfig.message}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 pt-0.5 text-sm font-semibold ${statusConfig.chipClass}`}>
                                <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.dotClass}`} />
                                <span>{statusConfig.label}</span>
                            </div>
                        </div>
                    </div>

                    {isPaidSubscriber() && (
                        <div className="flex flex-col gap-3">
                            {hasScheduledCancellation ? (
                                <Button
                                    onClick={handleReactivate}
                                    disabled={reactivating}
                                    className="h-[52px] w-full rounded-[20px] bg-[#27272A] text-white shadow-none hover:bg-[#27272A] hover:text-white"
                                >
                                    {reactivating ? "Reactivating..." : "Reactivate Subscription"}
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={() => setShowPlanSelector((current) => !current)}
                                        className="h-[52px] w-full rounded-[20px] bg-[#27272A] text-white shadow-none hover:bg-[#27272A] hover:text-white"
                                    >
                                        <BillingSwitchIcon className="h-5 w-5" />
                                        {showPlanSelector ? "Hide Plans" : "Change Plan"}
                                    </Button>

                                    <div
                                        className={`overflow-hidden grid transition-all duration-500 ease-in-out ${showPlanSelector
                                            ? "grid-rows-[1fr] opacity-100"
                                            : "grid-rows-[0fr] opacity-0"
                                            }`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                {PLANS.map((plan) => {
                                                    const isCurrentPlan = currentPlan?.key === plan.key
                                                    const isCardLoading = checkoutLoadingPlan === plan.key || changingPlanType === plan.key
                                                    const buttonLabel = isCurrentPlan
                                                        ? "Current Plan"
                                                        : isCardLoading
                                                            ? "Switching..."
                                                            : "Switch Plan"

                                                    return (
                                                        <div
                                                            key={plan.key}
                                                            className="flex min-h-[438px] flex-col overflow-hidden rounded-[22px] border border-black/50 bg-white"
                                                        >
                                                            <div className="bg-black px-4 pb-4 pt-3 text-white">
                                                                <div className="flex items-center gap-2">
                                                                    <img src={plan.image} alt={plan.name} className="h-7 w-7 object-contain" />
                                                                    <p className="billing-plan-display text-[18px] font-semibold">{plan.name}</p>
                                                                </div>
                                                                <div className="mt-2 flex items-end gap-1">
                                                                    <p className="billing-price-display text-[32px] leading-none">
                                                                        ${plan.price}
                                                                    </p>
                                                                    <span className="billing-plan-display pb-[1px] text-[14px] font-medium text-white/85">
                                                                        / month
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-1 flex-col px-4 py-3">
                                                                <div className="space-y-5">
                                                                    {[plan.accountLine, ...commonFeatureLines].map((feature, index) => (
                                                                        <div key={feature} className="flex items-start gap-1.5">
                                                                            <CheckCircleIcon className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-black" />
                                                                            <span className={`text-[14px] ${index === 0 ? "font-semibold text-black" : "text-[#5F5F63]"}`}>
                                                                                {feature}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <Button
                                                                    onClick={() => {
                                                                        if (!isCurrentPlan) handleChangePlanClick(plan.key)
                                                                    }}
                                                                    disabled={isCurrentPlan || isCardLoading}
                                                                    className={`mt-auto h-[46px] rounded-full px-3 text-[16px] font-bold shadow-none ${isCurrentPlan
                                                                        ? "bg-[#E8E8EA] text-[#6A6A70] hover:bg-[#E8E8EA] hover:text-[#6A6A70]"
                                                                        : plan.buttonClass
                                                                        }`}
                                                                >
                                                                    <span>{buttonLabel}</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => setShowCancelDialog(true)}
                                        className="h-[52px] w-full rounded-[20px] bg-[#F00D55] text-white shadow-none hover:bg-[#F00D55] hover:text-white"
                                    >
                                        <BillingCancelIcon className="h-5 w-5" />
                                        Cancel Subscription
                                    </Button>
                                </>
                            )}
                            <Button
                                onClick={handleViewInvoices}
                                disabled={portalLoading}
                                variant="outline"
                                className="h-[52px] w-full rounded-[20px] border border-black bg-white text-black shadow-none hover:bg-white hover:text-black"
                            >
                                <BillingInvoiceIcon className="h-5 w-5" />
                                {portalLoading ? "Opening Invoices..." : "View Invoices"}
                            </Button>
                        </div>
                    )}

                    {!isPaidSubscriber() && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {PLANS.map((plan) => {
                                const isCardLoading = checkoutLoadingPlan === plan.key || changingPlanType === plan.key
                                const buttonLabel = isCardLoading ? "Loading..." : "Subscribe"

                                return (
                                    <div
                                        key={plan.key}
                                        className="flex min-h-[438px] flex-col overflow-hidden rounded-[22px] border border-black/50 bg-white"
                                    >
                                        <div className="bg-black px-4 pb-4 pt-3 text-white">
                                            <div className="flex items-center gap-2">
                                                <img src={plan.image} alt={plan.name} className="h-7 w-7 object-contain" />
                                                <p className="billing-plan-display text-[18px] font-extrabold">{plan.name}</p>
                                            </div>
                                            <div className="mt-2 flex items-end gap-1">
                                                <p className="billing-price-display text-[32px] leading-none">
                                                    ${plan.price}
                                                </p>
                                                <span className="billing-plan-display pb-[1px] text-[14px] font-medium text-white/85">
                                                    / month
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-1 flex-col px-4 py-3">
                                            <div className="space-y-5">
                                                {[plan.accountLine, ...commonFeatureLines].map((feature, index) => (
                                                    <div key={feature} className="flex items-start gap-1.5">
                                                        <CheckCircleIcon className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-black" />
                                                        <span className={`text-[14px] ${index === 0 ? "font-semibold text-black" : "text-[#5F5F63]"}`}>
                                                            {feature}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                onClick={() => handleCheckout(plan.key)}
                                                disabled={isCardLoading}
                                                className={`mt-auto h-[46px] rounded-full px-3 text-[16px] font-bold shadow-none ${plan.buttonClass}`}
                                            >
                                                <span>{buttonLabel}</span>
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            <Button
                asChild
                className="h-[52px] w-full rounded-[20px] border border-black/10 bg-white text-black shadow-none hover:bg-white hover:text-black shadow-sm"
            >
                <a
                    href="mailto:shree@withblip.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <MailIcon className="h-5 w-5" />
                    Contact Us For Help
                </a>
            </Button>

            {isTeamMember && (
                <div className="rounded-[24px] border border-black/10 bg-white px-6 py-8 text-center">
                    <p className="text-base font-semibold text-black">You're part of a team plan</p>
                    <p className="mt-1 text-sm text-gray-500">Billing is managed by your team owner</p>
                </div>
            )}

            <Dialog
                open={showCancelDialog}
                onOpenChange={(open) => {
                    setShowCancelDialog(open)
                    if (!open) {
                        setCancelReason(null)
                        setCancelOtherText("")
                    }
                }}
            >
                <DialogOverlay className="bg-black/50 !-mt-[20px]" />
                <DialogContent className="space-y-4 p-6 sm:max-w-[480px] !rounded-[30px]">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-xl">You're breaking my heart</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                            I guess it&apos;s me, not you. At least tell me why.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        {CANCEL_REASONS.map((reason) => (
                            <label
                                key={reason.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${cancelReason === reason.id
                                    ? "border-zinc-800 bg-zinc-50"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="cancelReason"
                                    value={reason.id}
                                    checked={cancelReason === reason.id}
                                    onChange={() => setCancelReason(reason.id)}
                                    className="accent-zinc-800"
                                />
                                <span className="text-sm text-gray-700">{reason.label}</span>
                            </label>
                        ))}

                        {cancelReason === "other" && (
                            <textarea
                                value={cancelOtherText}
                                onChange={(e) => setCancelOtherText(e.target.value)}
                                placeholder="Tell us more..."
                                className="mt-2 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:border-zinc-800 focus:outline-none"
                                rows={2}
                            />
                        )}
                    </div>

                    {!hasUsedRetentionDiscount && (
                        <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-4">
                            <img src={GiftIcon} className="h-10 w-10 flex-shrink-0" alt="" />
                            <div className="space-y-0.5">
                                <p className="text-base font-bold leading-tight text-white">
                                    Wait! Get 75% off your next month
                                </p>
                                <p className="text-xs leading-snug text-gray-300">
                                    Stay with us and we&apos;ll automatically apply a 75% discount to your next invoice. One-time offer.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-1">
                        {!hasUsedRetentionDiscount && (
                            <Button
                                onClick={claimRetentionDiscount}
                                disabled={submittingCancel}
                                className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Claim 75% off and keep subscription
                            </Button>
                        )}
                        <div className="flex w-full gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowCancelDialog(false)}
                                disabled={submittingCancel}
                                className="h-11 flex-1 rounded-2xl"
                            >
                                Keep subscription
                            </Button>
                            <Button
                                onClick={confirmCancel}
                                disabled={submittingCancel}
                                className="h-11 flex-1 rounded-2xl bg-red-600 hover:bg-red-700"
                            >
                                Confirm cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
                <DialogOverlay className="bg-black/50 !-mt-[20px]" />
                <DialogContent className="space-y-6 p-8 sm:max-w-[425px] !rounded-[30px]">
                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-xl">Change Plan</DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            Are you sure you want to switch to the {PLANS.find((plan) => plan.key === pendingPlanChange)?.name} plan?
                            You and your team members will all be switched to this plan immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowChangePlanDialog(false)
                                setPendingPlanChange(null)
                            }}
                            className="flex-1 rounded-2xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmChangePlan}
                            className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700"
                        >
                            Yes, Switch Plan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
