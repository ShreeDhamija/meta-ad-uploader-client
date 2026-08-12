import { Copy, ExternalLink, MessageCircle, Play } from "lucide-react"
import PropTypes from "prop-types"
import { toast } from "sonner"

import ConnectNewAccountsThumbnail from "@/assets/help/Connect New Accounts.webp"
import DraftsThumbnail from "@/assets/help/Drafts.webp"
import InstagramThumbnail from "@/assets/help/Instagram.webp"
import MetaMediaLibraryThumbnail from "@/assets/help/Meta Media Library.webp"
import MultipleNewAdSetsThumbnail from "@/assets/help/Multiple New Ad Sets.webp"
import PagesNotShowingUpThumbnail from "@/assets/help/Pages Not Showing Up.webp"
import PlacementCustomizationThumbnail from "@/assets/help/Placement Customization.webp"
import SplitAdDataThumbnail from "@/assets/help/Split Ad Data.webp"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

const SUPPORT_EMAIL = "shree@withblip.com"

// Add future FAQs here. Omit videoUrl to show the thumbnail as a plain image instead of a video link.
const FAQS = [
    {
        question: "How can I assign different copy to different ads in one launch?",
        answer: "Variants let you use different copy, landing pages, or other form data for different ads within the same launch.",
        steps: [
            "Upload your media files.",
            "Click Split Ad Data in the top-right corner to create form variants.",
            "Edit each variant with the copy or other fields you want to change.",
            "Assign the media on the right to the appropriate variant.",
        ],
        thumbnail: SplitAdDataThumbnail,
    },
    {
        question: "How can I launch multiple new ad sets at the same time?",
        answer: "Use form variants to configure several new ad sets within a single launch.",
        steps: [
            "Upload your media files and click Split Ad Data in the top-right corner.",
            "Create a variant for each new ad set you want to launch.",
            "In each variant, choose to launch ads in a new ad set and select the ad set to duplicate.",
            "Give every variant a unique ad set name; otherwise, they will all launch with the same name.",
        ],
        thumbnail: MultipleNewAdSetsThumbnail,
    },
    {
        question: "How can I assign vertical and square assets to one ad and customize their placements?",
        answer: "Group related assets so each aspect ratio can be assigned to the correct placement within the same ad.",
        steps: [
            "Upload your media, then select Group Assets for placement customization above the files.",
            "Group the related files manually, or use AI Grouping to identify pairs automatically.",
            "Review the groups and assign the placements you want for each asset.",
            "Use manual grouping when an ad has three aspect ratios. AI Grouping supports two-asset ads and analyzes image content or similar video filenames.",
        ],
        thumbnail: PlacementCustomizationThumbnail,
    },
    {
        question: "How do I boost existing Instagram posts?",
        answer: "Import an existing Instagram post as your media, then use it to create the ad.",
        steps: [
            "Click Manage Upload Sources near the file upload area.",
            "Select Instagram as the source.",
            "Browse your posts and import the one you want to boost.",
        ],
        thumbnail: InstagramThumbnail,
    },
    {
        question: "How can I connect or change the accounts connected to Blip?",
        answer: "You can update the Meta accounts available to Blip by repeating the authorization flow from Preferences.",
        steps: [
            "Open Preferences and click Edit active accounts beside the ad account dropdown.",
            "Continue through the Facebook authorization flow.",
            "On the first Facebook screen, choose Edit Settings and explicitly link or unlink the accounts you want.",
        ],
        thumbnail: ConnectNewAccountsThumbnail,
    },
    {
        question: "How can I share a preview or QA sheet with my clients?",
        answer: "Open the arrow beside Publish Ads to save the launch in its current state and create a public preview link for your client to review before you publish.",
        thumbnail: DraftsThumbnail,
    },
    {
        question: "How can I use existing assets from the Meta Media Library?",
        answer: "Import files already stored in Meta Ads Manager and relaunch them as new ads.",
        steps: [
            "Click Manage Upload Sources near the file upload area.",
            "Select Meta Media Library.",
            "Browse your existing assets and import the files you want to use.",
        ],
        thumbnail: MetaMediaLibraryThumbnail,
    },
    {
        question: "My pages or ad accounts are not showing up. How do I fix this?",
        answer: "Missing pages or ad accounts are usually caused by permissions that were not granted during the initial Facebook authorization.",
        steps: [
            "Open Preferences and click Edit active accounts.",
            "Continue through the Facebook authorization flow and choose Edit Settings on the first screen.",
            "Explicitly select the pages and ad accounts you want Blip to access.",
            "If they still do not appear, they may be personal Facebook pages or not linked to your Business Manager. Contact us through chat and we’ll help connect them.",
        ],
        thumbnail: PagesNotShowingUpThumbnail,
    },
]

export default function HelpFAQs({ onOpenChat }) {
    const handleCopySupportEmail = async () => {
        try {
            await navigator.clipboard.writeText(SUPPORT_EMAIL)
            toast.success("Email copied")
        } catch {
            toast.error("Couldn't copy email")
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                {FAQS.map((faq, index) => (
                    <Accordion key={faq.question} type="single" collapsible>
                        <AccordionItem
                            value={`faq-${index}`}
                            className="overflow-hidden rounded-2xl border border-gray-300 bg-white px-4 shadow-sm"
                        >
                            <AccordionTrigger className="py-4 text-[14px] font-medium text-zinc-950 hover:no-underline">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="pb-5">
                                <div className="space-y-5 border-t border-gray-200 pt-4">
                                    <p className="text-sm leading-6 text-gray-600">{faq.answer}</p>

                                    {faq.steps?.length > 0 && (
                                        <ol className="space-y-3">
                                            {faq.steps.map((step, stepIndex) => (
                                                <li key={step} className="flex items-start gap-3 text-sm leading-6 text-gray-700">
                                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                                                        {stepIndex + 1}
                                                    </span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}

                                    {faq.videoUrl ? (
                                        <a
                                            href={faq.videoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group block overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                                            aria-label={`Watch video: ${faq.question}`}
                                        >
                                            <div className="relative aspect-video overflow-hidden bg-gray-100">
                                                <img
                                                    src={faq.thumbnail}
                                                    alt=""
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
                                                        <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">Watch the walkthrough</span>
                                                <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
                                            <img
                                                src={faq.thumbnail}
                                                alt={`Example for ${faq.question}`}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ))}
            </div>

            <div className="space-y-3">
                <div className="bg-white py-2 text-left">
                    <h3 className="text-[20px] font-bold leading-tight text-black">
                        Still need help?
                    </h3>
                    <p className="mt-2 max-w-[620px] text-[14px] leading-6 text-[#5F5F63]">
                        Use the in-app chat for the fastest response, or email us at{" "}
                        <span className="inline-flex items-center gap-1 font-semibold text-black">
                            {SUPPORT_EMAIL}
                            <button
                                type="button"
                                onClick={handleCopySupportEmail}
                                aria-label="Copy support email"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#5F5F63] transition hover:bg-black/5 hover:text-black"
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </button>
                        </span>
                        .
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={onOpenChat}
                    className="h-[52px] w-full rounded-[20px] border border-black/10 bg-white text-black shadow-none shadow-xs hover:bg-white hover:text-black"
                >
                    <MessageCircle className="h-5 w-5" />
                    Contact Us For Help
                </Button>
            </div>
        </div>
    )
}

HelpFAQs.propTypes = {
    onOpenChat: PropTypes.func.isRequired,
}
