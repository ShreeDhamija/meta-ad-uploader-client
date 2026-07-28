import { ChevronDown } from "lucide-react"
import PropTypes from "prop-types"
import { useNavigate } from "react-router-dom"
import MetaIcon from "@/assets/icons/meta.svg"
import TikTokIcon from "@/assets/icons/tiktok.svg"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PROVIDERS = {
  meta: {
    label: "Meta Launcher",
    icon: MetaIcon,
    route: "/",
  },
  tiktok: {
    label: "TikTok Launcher",
    icon: TikTokIcon,
    route: "/tiktok-ads",
  },
}

export default function LauncherSwitcher({
  platform,
  displayName,
  profilePicUrl,
  canSwitch,
  className = "",
}) {
  const navigate = useNavigate()
  const currentProvider = PROVIDERS[platform]
  const otherProvider = platform === "tiktok" ? PROVIDERS.meta : PROVIDERS.tiktok

  return (
    <div className={`flex items-center gap-3 rounded-[20px] border border-black/10 bg-white px-3 py-2 shadow-[0px_1px_2px_rgba(0,0,0,0.06)] ${className}`}>
      <img
        src={profilePicUrl || "/placeholder.svg"}
        alt="Profile"
        className="h-9 w-9 rounded-full border border-zinc-300 object-cover"
      />
      <span className="max-w-[150px] truncate whitespace-nowrap text-[14px] font-medium text-gray-700">
        {displayName}
      </span>

      {canSwitch && (
        <>
          <div className="h-8 w-px bg-gray-300" aria-hidden="true" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none"
                title="Switch launcher"
              >
                <img src={currentProvider.icon} alt="" className="h-4 w-4" />
                <span className="whitespace-nowrap">{currentProvider.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-52 rounded-2xl p-2">
              <DropdownMenuLabel className="px-2 text-xs font-medium text-gray-400">
                Switch launcher
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate(otherProvider.route)}
                className="cursor-pointer rounded-xl px-3 py-2.5"
              >
                <img src={otherProvider.icon} alt="" className="h-5 w-5" />
                <span className="font-medium">{otherProvider.label}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}

LauncherSwitcher.propTypes = {
  platform: PropTypes.oneOf(["meta", "tiktok"]).isRequired,
  displayName: PropTypes.string,
  profilePicUrl: PropTypes.string,
  canSwitch: PropTypes.bool.isRequired,
  className: PropTypes.string,
}
