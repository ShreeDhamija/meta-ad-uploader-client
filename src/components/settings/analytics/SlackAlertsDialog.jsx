"use client"

/* eslint-disable react/prop-types */

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, PenLine, Radio, Siren } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { saveSettings } from "@/lib/saveSettings"
import slackColor from "@/assets/icons/analytics/slack-color.svg"

const DEFAULT_THRESHOLDS = { cpaSpike: 50, overspend: 150 }

// The three daily alerts besides anomalies (server: analytics/slackAlerts.js).
const DAILY_ALERTS = [
    {
        key: "eventsManagerAlertsEnabled",
        title: "Events Manager Alerts",
        icon: Radio,
        iconClass: "text-sky-500",
        description: "Posts only what's new on the account's pixel: a diagnostic that started failing, or a major event whose match quality moved 50%+ (and 2+ points) and held on the next daily check. Catalog / product ID diagnostics are never posted, and problems already there on the first check become the baseline.",
    },
    {
        key: "adCopyAlertsEnabled",
        title: "Ad Copy Check",
        icon: PenLine,
        iconClass: "text-violet-500",
        description: "New ads are checked for spelling mistakes and destination URLs that point at a different product than the copy. One alert per issue type every 7 days.",
    },
    {
        key: "adPerformanceAlertsEnabled",
        title: "Egregious Ad Performance Alerts",
        icon: Siren,
        iconClass: "text-red-500",
        description: "Pause-worthy ad sets and campaigns 100%+ off the account average, and zero-conversion spend of 10x+ the average CPA ($1,000+ spent over 3 days). Repeats muted 7 days.",
    },
]

const pickAlertSettings = (settings) => ({
    slackAlertsEnabled: settings?.slackAlertsEnabled ?? false,
    anomalyThresholds: settings?.anomalyThresholds ?? DEFAULT_THRESHOLDS,
    ...Object.fromEntries(DAILY_ALERTS.map(a => [a.key, settings?.[a.key] ?? false])),
})

export default function SlackAlertsDialog({
    open,
    onClose,
    adAccountId,
    settings,
    settingsLoading,
    onSaved,
    slackConnected,
    slackChannelName,
    onConnectSlack,
    onDisconnectSlack,
    slackDisconnecting,
}) {
    const [temp, setTemp] = useState(() => pickAlertSettings(settings))
    const [saving, setSaving] = useState(false)

    // Start from the saved values each time the popup opens (not on every settings
    // change while it's open, which would wipe unsaved edits).
    useEffect(() => {
        if (open && !settingsLoading) setTemp(pickAlertSettings(settings))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, settingsLoading])

    if (!open) return null

    const setThreshold = (key, value) => setTemp(prev => ({ ...prev, anomalyThresholds: { ...prev.anomalyThresholds, [key]: value } }))

    const handleSave = async () => {
        setSaving(true)
        const patch = {
            ...temp,
            anomalyThresholds: {
                cpaSpike: parseInt(temp.anomalyThresholds.cpaSpike, 10) || DEFAULT_THRESHOLDS.cpaSpike,
                overspend: parseInt(temp.anomalyThresholds.overspend, 10) || DEFAULT_THRESHOLDS.overspend,
            },
        }
        try {
            await saveSettings({ adAccountId, adAccountSettings: patch })
            onSaved(patch)
            toast.success("Slack alerts saved")
            onClose()
        } catch (err) {
            console.error("[Slack Alerts] Save FAILED:", err.message)
            toast.error(`Failed to save Slack alerts: ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    const inputClass = "w-24 px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

    return (
        <>
            <div
                className="fixed bg-black/50 z-50"
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh" }}
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    className="bg-white rounded-[28px] shadow-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-8 pb-6 space-y-6 flex-1 overflow-y-auto min-h-0">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <img src={slackColor} alt="" className="w-5 h-5" />
                                    Slack Alerts
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Choose which alerts this ad account sends to your Slack channel
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {settingsLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                <p className="text-sm text-gray-500">Loading saved alert preferences...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Connection */}
                                {slackConnected ? (
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <p className="text-sm text-gray-700 truncate">
                                                Connected to <span className="font-medium">{slackChannelName || "Slack"}</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onDisconnectSlack}
                                            disabled={slackDisconnecting}
                                            className="flex-shrink-0 text-xs text-white bg-red-500 hover:bg-red-600 font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-70"
                                        >
                                            {slackDisconnecting ? "Disconnecting..." : "Disconnect"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between gap-3">
                                        <p className="text-sm text-gray-600">Connect Slack to receive these alerts.</p>
                                        <button
                                            type="button"
                                            onClick={onConnectSlack}
                                            style={{ borderColor: "rgba(74,21,75,0.35)" }}
                                            className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-medium text-gray-700 shadow-[0_2px_10px_rgba(74,21,75,0.18)] transition-colors hover:bg-gray-50"
                                        >
                                            <img src={slackColor} alt="Slack" className="h-3.5 w-3.5" />
                                            Connect to Slack
                                        </button>
                                    </div>
                                )}

                                {/* Anomaly alerts (moved here from Optimization Focus) */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            Anomaly Alerts
                                        </h3>
                                        <Switch
                                            checked={temp.slackAlertsEnabled}
                                            onCheckedChange={(checked) => setTemp(prev => ({ ...prev, slackAlertsEnabled: checked }))}
                                            disabled={!slackConnected}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 pl-6 -mt-2">
                                        Get notified when CPA spikes or overspend is detected.
                                    </p>
                                    <div className="space-y-4 pl-6">
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">CPA Spike Threshold (%)</p>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    value={temp.anomalyThresholds.cpaSpike}
                                                    onChange={(e) => setThreshold("cpaSpike", e.target.value)}
                                                    onBlur={(e) => setThreshold("cpaSpike", parseInt(e.target.value) || DEFAULT_THRESHOLDS.cpaSpike)}
                                                    className={inputClass}
                                                />
                                                <span className="text-xs text-gray-500 leading-snug">
                                                    Alert when CPA increases by more<br />than this % vs 7-day average
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">Overspend Threshold (%)</p>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    value={temp.anomalyThresholds.overspend}
                                                    onChange={(e) => setThreshold("overspend", e.target.value)}
                                                    onBlur={(e) => setThreshold("overspend", parseInt(e.target.value) || DEFAULT_THRESHOLDS.overspend)}
                                                    className={inputClass}
                                                />
                                                <span className="text-xs text-gray-500 leading-snug">
                                                    Alert when daily spend exceeds this<br />% of budget (ABO only)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Daily alerts */}
                                {DAILY_ALERTS.map(({ key, title, icon: Icon, iconClass, description }) => (
                                    <div key={key} className="space-y-2 border-t border-gray-200 pt-6">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${iconClass}`} />
                                                {title}
                                            </h3>
                                            <Switch
                                                checked={temp[key]}
                                                onCheckedChange={(checked) => setTemp(prev => ({ ...prev, [key]: checked }))}
                                                disabled={!slackConnected}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 pl-6 leading-relaxed">{description}</p>
                                    </div>
                                ))}

                                <p className="text-[11px] text-gray-400">
                                    Daily alerts run once a day and stay silent when nothing changed.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sticky blue bottom bar */}
                    <div className="flex-shrink-0 bg-blue-600 px-8 py-1.5 flex items-center justify-center gap-6 rounded-b-[28px]">
                        <button
                            onClick={handleSave}
                            disabled={saving || settingsLoading}
                            className="rounded-xl bg-white text-blue-600 hover:bg-gray-100 px-6 h-9 text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {saving ? "Saving..." : "Save Alerts"}
                        </button>
                        <button onClick={onClose} className="text-white text-sm font-medium hover:underline">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
