import { useState } from "react"
import PropTypes from "prop-types"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import TikTokIcon from "@/assets/icons/tiktok.svg"
import { startTikTokOAuth } from "@/lib/tiktokOAuth"

// TikTok counterpart of FacebookReauthDialog: sends the user through TikTok OAuth
// again so newly granted advertiser accounts show up in Blip. BC_AUTH_TT identities
// only come back when the Business Center permissions are ticked on TikTok's screen.
export default function TikTokReauthDialog({
  open,
  onOpenChange,
  returnTo = "/tiktok-settings",
  title = "Link New Advertiser Accounts",
  showBackdrop = true,
  contentClassName = "",
}) {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) setIsRedirecting(false)
    onOpenChange(nextOpen)
  }

  const handleTikTokReauth = () => {
    setIsRedirecting(true)
    startTikTokOAuth({ returnTo })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showBackdrop && <DialogOverlay className="bg-black/20" />}
      <DialogContent className={`sm:max-w-md !rounded-[28px] !duration-150 data-[state=open]:!slide-in-from-left-0 data-[state=closed]:!slide-out-to-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=closed]:!slide-out-to-top-0 data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 ${contentClassName}`}>
        <div className="text-left space-y-4 p-6 !rounded-[28px]">
          <div className="space-y-2">
            <img
              src="https://api.withblip.com/logo.webp"
              alt="Logo"
              className="w-12 h-12 rounded-md mb-4"
            />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>1. You will have to reauthenticate to add new advertiser accounts or identities</p>
            <p>2. On TikTok&apos;s authorization screen, select every advertiser account you want Blip to access</p>
            <p>
              3. Under <span className="font-medium text-gray-800">Access Your Ad Account For</span>, tick
              the <span className="font-medium text-gray-800">Business Center</span> box and every box under it,
              otherwise your TikTok identities won&apos;t show up in Blip
            </p>
          </div>

          <Button
            onClick={handleTikTokReauth}
            disabled={isRedirecting}
            className="w-full bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[40px] disabled:opacity-60"
          >
            <img src={TikTokIcon} alt="TikTok" className="w-5 h-5 invert" />
            {isRedirecting ? "Redirecting…" : "Login with TikTok"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

TikTokReauthDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  returnTo: PropTypes.oneOf(["/tiktok-ads", "/tiktok-settings"]),
  title: PropTypes.string,
  showBackdrop: PropTypes.bool,
  contentClassName: PropTypes.string,
}
