import { useState } from "react"
import PropTypes from "prop-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import TikTokIcon from "@/assets/icons/tiktok.svg"
import { startTikTokOAuth } from "@/lib/tiktokOAuth"

export default function TikTokConnectDialog({ open, onOpenChange }) {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) setIsRedirecting(false)
    onOpenChange(nextOpen)
  }

  const handleConnect = () => {
    setIsRedirecting(true)
    startTikTokOAuth()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] !rounded-[28px] p-8 data-[state=open]:!slide-in-from-left-0 data-[state=closed]:!slide-out-to-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=closed]:!slide-out-to-top-0">
        <DialogHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
            <img src={TikTokIcon} alt="" className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">Connect TikTok Ads</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-neutral-600">
            Link your TikTok for Business account to manage advertiser preferences and switch between both launchers.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <li className="flex gap-3">
            <span className="font-semibold text-neutral-400">1.</span>
            Sign in with the TikTok account that has access to your Business Center.
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-neutral-400">2.</span>
            Review and approve access to the advertiser accounts you use in Blip.
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-neutral-400">3.</span>
            After approval, you’ll return to the TikTok launcher automatically.
          </li>
        </ol>

        <Button
          onClick={handleConnect}
          disabled={isRedirecting}
          className="h-11 w-full rounded-2xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          <img src={TikTokIcon} alt="" className="mr-2 h-5 w-5 invert" />
          {isRedirecting ? "Redirecting…" : "Continue with TikTok"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

TikTokConnectDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
}
