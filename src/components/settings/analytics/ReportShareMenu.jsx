"use client"

/* eslint-disable react/prop-types */

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Link2, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// Share button for the audit / diagnostic reports: copies a public link to a
// snapshot of the report as rendered (pages/SharedReport.jsx). Each new share
// makes a new link and retires the previous one, so the link is created once
// per report run (snapshotKey) and reused on later clicks.
export default function ReportShareMenu({ type, adAccountId, getSnapshot, snapshotKey, disabled = false, disabledReason }) {
    const [busy, setBusy] = useState(false)
    const linkRef = useRef({ key: null, url: null })

    const createLink = async () => {
        if (linkRef.current.key === snapshotKey && linkRef.current.url) return linkRef.current.url
        const snapshot = await getSnapshot()
        const res = await fetch(`${API_BASE_URL}/api/reports/share`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, adAccountId, snapshot }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.url) throw new Error(data.error || "Failed to create share link")
        linkRef.current = { key: snapshotKey, url: data.url }
        return data.url
    }

    const copyLink = async () => {
        setBusy(true)
        try {
            const url = await createLink()
            try {
                await navigator.clipboard.writeText(url)
                toast.success("Shareable link copied", { description: "Anyone with the link can view this report." })
            } catch {
                toast.success("Shareable link created", { description: url })
            }
        } catch (err) {
            toast.error(err.message || "Failed to create share link")
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            disabled={disabled || busy}
            title={disabled ? disabledReason : "Copy a public link to this report"}
            className="rounded-2xl text-xs gap-1.5 h-9"
        >
            {busy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Copy shareable link
        </Button>
    )
}
