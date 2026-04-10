"use client"

import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Toaster, toast } from "sonner"
import Header from "@/components/header"
import AnalyticsDashboard from "@/components/settings/AnalyticsDashboard"
import TrialExpiredPopup from "@/components/TrialExpiredPopup"
import DesktopIcon from "@/assets/Desktop.webp"
import { useAuth } from "@/lib/AuthContext"
import { useIntercom } from "@/lib/useIntercom"
import useSubscription from "@/lib/useSubscriptionSettings"

export default function Analytics() {
    const { isLoggedIn, authLoading } = useAuth()
    const { showMessenger, hideMessenger } = useIntercom()
    const navigate = useNavigate()
    const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false)
    const [hasDismissedTrialPopup, setHasDismissedTrialPopup] = useState(false)
    const {
        subscriptionData,
        isTrialExpired,
        hasActiveAccess,
        loading: subscriptionLoading,
        canExtendTrial,
        extendTrial
    } = useSubscription()

    useEffect(() => {
        const userHasActiveAccess = hasActiveAccess()

        if (
            !subscriptionLoading &&
            isTrialExpired() &&
            !userHasActiveAccess &&
            !hasDismissedTrialPopup
        ) {
            setShowTrialExpiredPopup(true)
        }
    }, [subscriptionLoading, isTrialExpired, hasActiveAccess, hasDismissedTrialPopup])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const slackStatus = params.get("slack")
        const reason = params.get("reason")

        if (slackStatus === "connected") {
            toast.success("Slack connected successfully!")
        } else if (slackStatus === "error") {
            const messages = {
                missing_params: "Slack connection failed: missing parameters",
                user_not_found: "Slack connection failed: user not found",
                exchange_failed: "Slack connection failed: could not complete authorization",
            }

            toast.error(messages[reason] || `Slack connection failed: ${reason || "unknown error"}`)
        }

        if (slackStatus) {
            const url = new URL(window.location)
            url.searchParams.delete("slack")
            url.searchParams.delete("reason")
            window.history.replaceState({}, '', url)
        }
    }, [])

    const handleExtendTrial = async () => {
        const result = await extendTrial()
        if (result.success) {
            setShowTrialExpiredPopup(false)
            toast.success("Trial Extended Successfully, reloading...")
            setTimeout(() => {
                window.location.reload()
            }, 500)
        }
    }

    if (authLoading) return null
    if (!isLoggedIn) return <Navigate to="/login" />

    return (
        <div className="min-h-screen w-full bg-white">
            <div className="mobile-message fixed inset-0 bg-white flex flex-col items-center justify-center p-6 z-[100] lg:hidden">
                <div className="text-center max-w-md">
                    <img src={DesktopIcon} alt="Desktop computer" className="w-24 h-24 mb-4 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Desktop Recommended</h1>
                    <p className="text-gray-600 mb-6">
                        Blip works best on a bigger screen. <br></br> We've sent you an email to help you<br></br> pick up from here.
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-xl hover:text-blue-700 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>

            <div className="w-full max-w-[1600px] mx-auto py-8 px-2 sm:px-4 md:px-6">
                <Header showMessenger={showMessenger} hideMessenger={hideMessenger} />
            </div>

            <div className="w-full border-t border-gray-200">
                <div className="w-full max-w-[1600px] mx-auto py-6 px-2 sm:px-4 md:px-6">
                    <AnalyticsDashboard />
                </div>
            </div>

            {showTrialExpiredPopup && (
                <TrialExpiredPopup
                    onClose={() => {
                        setShowTrialExpiredPopup(false)
                        setHasDismissedTrialPopup(true)
                    }}
                    onUpgrade={() => {
                        navigate("/settings?tab=billing")
                        setShowTrialExpiredPopup(false)
                        setHasDismissedTrialPopup(true)
                    }}
                    joinTeam={() => {
                        navigate("/settings?tab=team")
                        setShowTrialExpiredPopup(false)
                        setHasDismissedTrialPopup(true)
                    }}
                    onChatWithUs={() => {
                        showMessenger()
                        setShowTrialExpiredPopup(false)
                        setHasDismissedTrialPopup(true)
                    }}
                    canExtendTrial={canExtendTrial()}
                    onExtendTrial={handleExtendTrial}
                    isTeamOwner={!!subscriptionData.isTeamOwner && !!subscriptionData.teamId}
                    isTeamMember={!subscriptionData.isTeamOwner && !!subscriptionData.teamId}
                />
            )}

            <Toaster richColors position="bottom-left" closeButton />
        </div>
    )
}
