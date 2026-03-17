"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import slackIcon from "@/assets/icons/slack.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'
const SLACK_PURPLE = '#4A154B'

// const SlackIcon = ({ className = "w-3 h-3" }) => (
//     <svg className={className} viewBox="0 0 24 24" fill="currentColor">
//         <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
//     </svg>
// )

/**
 * SlackAlertsDialog
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - slackConnected: boolean
 *  - slackChannelName: string | null
 *  - slackAlertsEnabled: boolean
 *  - onSlackAlertsEnabledChange: (val: boolean) => void
 *  - onSlackDisconnect: () => void
 *  - slackDisconnecting: boolean
 */
export default function SlackAlertsDialog({
    open,
    onClose,
    slackConnected,
    slackChannelName,
    slackAlertsEnabled,
    onSlackAlertsEnabledChange,
    onSlackDisconnect,
    slackDisconnecting,
}) {
    const [auditViaSlack, setAuditViaSlack] = useState(false)
    const [summaryViaSlack, setSummaryViaSlack] = useState(false)

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                style={{ top: -25, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-[28px] shadow-2xl w-full max-w-[480px] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Content */}
                    <div className="p-8 pb-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: SLACK_PURPLE }}>
                                        <img src={slackIcon} alt="Slack" className="w-5 h-5" />
                                    </div>
                                    Slack Integration
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Connect Slack to receive alerts and reports
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Connection status / connect button */}
                        {!slackConnected ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-500">
                                    Connect Slack to receive anomaly alerts, audit reports, and account summaries in your chosen channel.
                                </p>
                                <a
                                    href={`${API_BASE_URL}/api/analytics/slack/install`}
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
                                    style={{ backgroundColor: SLACK_PURPLE }}
                                >
                                    <img src={slackIcon} alt="Slack" className="w-4 h-4 brightness-0 invert" />
                                    Connect to Slack
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Connected status */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <p className="text-sm text-gray-700">
                                            Connected to <span className="font-medium">{slackChannelName || 'Slack'}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={onSlackDisconnect}
                                        disabled={slackDisconnecting}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                                    >
                                        {slackDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                                    </button>
                                </div>

                                <div className="border-t border-gray-100" />

                                {/* Toggle: Anomaly alerts */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">Anomaly alerts</p>
                                        <p className="text-xs text-gray-500">
                                            Get notified when CPA spikes or overspend is detected
                                        </p>
                                    </div>
                                    <Switch
                                        checked={slackAlertsEnabled}
                                        onCheckedChange={onSlackAlertsEnabledChange}
                                    />
                                </div>

                                {/* Toggle: Audit reports */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">Audit reports</p>
                                        <p className="text-xs text-gray-500">
                                            Receive account audit summaries in Slack
                                        </p>
                                    </div>
                                    <Switch
                                        checked={auditViaSlack}
                                        onCheckedChange={setAuditViaSlack}
                                    />
                                </div>

                                {/* Toggle: Account summary */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">Account summary</p>
                                        <p className="text-xs text-gray-500">
                                            Get a daily account performance summary in Slack
                                        </p>
                                    </div>
                                    <Switch
                                        checked={summaryViaSlack}
                                        onCheckedChange={setSummaryViaSlack}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom bar */}
                    <div className="flex-shrink-0 px-8 py-3 flex items-center justify-center rounded-b-[28px]" style={{ backgroundColor: SLACK_PURPLE }}>
                        <button
                            onClick={onClose}
                            className="text-white text-sm font-medium hover:underline"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}