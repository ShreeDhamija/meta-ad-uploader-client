import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function FacebookReauthDialog({
  open,
  onOpenChange,
  redirectState,
  title = "Link New Ad Accounts",
  showBackdrop = true,
  contentClassName = "",
}) {
  const handleFacebookReauth = () => {
    onOpenChange(false)
    window.location.href = `${API_BASE_URL}/auth/facebook?state=${redirectState}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <p>1. You will have to reauthenticate to add new pages or ad accounts</p>
            <p>2. Click on "Edit previous settings" in the Login dialog to confirm Blip has access to the pages you want to use</p>
          </div>

          <Button
            onClick={handleFacebookReauth}
            className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[40px]"
          >
            <img
              src="https://api.withblip.com/facebooklogo.png"
              alt="Facebook"
              className="w-5 h-5"
            />
            Login with Facebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
