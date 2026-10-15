import { useState } from "react"
import PropTypes from "prop-types"
import { BarChart3, Check, Copy, Link2, MessageCircle, Rocket } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import ClaudeIcon from "@/assets/MCP/claude icon.png"
import ChatGPTIcon from "@/assets/MCP/chat gpt icon.png"
import ClaudeStep1 from "@/assets/MCP/Claude Step 1.webp"
import ClaudeStep2 from "@/assets/MCP/Claude Step 2-1.webp"
import ChatGPTStep1 from "@/assets/MCP/ChatGPT Step 1.webp"
// ChatGPT's "Connect to a custom MCP" screen (the file is named Claude Step 2).
import ChatGPTStep2 from "@/assets/MCP/Claude Step 2.webp"

const MCP_URL = "https://api.withblip.com/mcp"

const APPS = {
    claude: {
        label: "Claude",
        icon: ClaudeIcon,
        steps: [
            "In Claude, open Settings → Connectors and click Add → Add custom connector.",
            "Name it Blip, paste your MCP URL and click Continue.",
            "Click Connect, sign in to Blip and click Authorize MCP Access to approve the app.",
        ],
        screenshots: [ClaudeStep1, ClaudeStep2],
    },
    chatgpt: {
        label: "ChatGPT",
        icon: ChatGPTIcon,
        steps: [
            "In ChatGPT, open Settings → Plugins → MCPs and click Add.",
            "Name it Blip, choose Streamable HTTP, paste your MCP URL and save.",
            "Click Authenticate next to Blip, sign in to Blip and click Authorize MCP Access to approve the app.",
        ],
        screenshots: [ChatGPTStep1, ChatGPTStep2],
    },
}

const PROMPTS = [
    {
        title: "Launch ads",
        icon: Rocket,
        prompts: [
            "Launch the images in this folder as paused ads in my Prospecting ad set.",
            "Group these files by aspect ratio and launch them as placement-customized ads.",
            "Create a carousel ad from these 4 images with a headline for each card.",
            "Launch ads from this Google Drive folder: <link>",
            "Launch the ads in this CSV.",
            "Launch these as partnership ads with @creator in a new ad set based on Prospecting, scheduled for tomorrow 9am.",
        ],
        tip: "Google Drive files and folders must be shared as \"Anyone with the link\". CSVs use Blip's CSV template.",
    },
    {
        title: "Analytics",
        icon: BarChart3,
        prompts: [
            "Show my account overview for the last 14 days.",
            "Give me budget recommendations and apply the top two.",
            "Which ads are performing poorly? Pause them.",
            "What creatives are trending this week?",
            "Give me an account summary for this week.",
            "Run an audit and a diagnostic report on my ad account.",
        ],
        tip: "Analytics use your saved CPA/ROAS settings. If they're missing, Blip will ask for them in chat.",
    },
]

function CopyButton({ text, label }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            toast.success(`${label} copied`)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error(`Couldn't copy ${label.toLowerCase()}`)
        }
    }
    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${label.toLowerCase()}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
    )
}

CopyButton.propTypes = {
    text: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
}

function SectionHeader({ icon: Icon, title, description }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{title}</span>
            </div>
            <p className="text-gray-500 text-[12px]">{description}</p>
        </div>
    )
}

SectionHeader.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
}

export default function MCPSettings() {
    const [app, setApp] = useState("claude")
    const selected = APPS[app]

    return (
        <div className="space-y-6 w-full max-w-3xl">
            {/* MCP URL */}
            <div className="p-4 bg-[#f5f5f5] rounded-2xl space-y-4">
                <SectionHeader
                    icon={Link2}
                    title="Your Blip MCP URL"
                    description="Add this URL to Claude or ChatGPT to launch ads and view analytics from chat."
                />
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-white shadow pl-4 pr-1.5 py-1.5">
                    <span className="truncate font-mono text-sm text-gray-900">{MCP_URL}</span>
                    <CopyButton text={MCP_URL} label="MCP URL" />
                </div>
            </div>

            {/* Connect */}
            <div className="p-4 bg-[#f5f5f5] rounded-2xl space-y-4">
                <SectionHeader
                    icon={MessageCircle}
                    title="Connect your chat app"
                    description="It takes a minute. You'll approve Blip's access once, then Blip only creates ads or changes budgets after you confirm in chat."
                />
                <div className="flex gap-2">
                    {Object.entries(APPS).map(([key, option]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setApp(key)}
                            className={cn(
                                "flex items-center gap-2 rounded-2xl px-4 h-10 text-sm transition-all",
                                app === key
                                    ? "bg-white border border-gray-300 shadow font-semibold text-neutral-900"
                                    : "border border-transparent text-neutral-700 hover:bg-neutral-200"
                            )}
                        >
                            <img src={option.icon} alt="" className="h-5 w-5 rounded-md object-contain" />
                            {option.label}
                        </button>
                    ))}
                </div>

                <ol className="space-y-3">
                    {selected.steps.map((step, index) => (
                        <li key={step} className="flex items-start gap-3 text-sm leading-6 text-gray-700">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                                {index + 1}
                            </span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>

                <div className="space-y-3">
                    {selected.screenshots.map((image, index) => (
                        <a
                            key={image}
                            href={image}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-orange-300"
                        >
                            <img
                                src={image}
                                alt={`${selected.label} step ${index + 1}`}
                                className="h-auto w-full"
                            />
                            <span className="block px-3 py-2 text-xs font-medium text-gray-600">Step {index + 1}</span>
                        </a>
                    ))}
                </div>

                <p className="text-gray-500 text-[12px]">
                    Your chat app may ask before Blip runs a tool. Choose Always allow so it doesn&apos;t ask every time.
                </p>
            </div>

            {/* Example prompts */}
            {PROMPTS.map((group) => (
                <div key={group.title} className="p-4 bg-[#f5f5f5] rounded-2xl space-y-4">
                    <SectionHeader icon={group.icon} title={group.title} description={group.tip} />
                    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-gray-700">
                        {group.prompts.map((prompt) => (
                            <li key={prompt}>&ldquo;{prompt}&rdquo;</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}
