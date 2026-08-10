import { ExternalLink, Play } from "lucide-react"

import FaqVideoThumbnail from "@/assets/Home.webp"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

// Add future FAQs here. Omit videoUrl to show the thumbnail as a plain image instead of a video link.
const FAQS = [
    {
        question: "How do I upload and launch a batch of ads?",
        answer: "Create a batch from the launcher, then review the generated ads before publishing them.",
        steps: [
            "Open the launcher and select the ad account you want to use.",
            "Upload your creative files and complete the default campaign settings.",
            "Review the generated ads, make any final edits, and click Publish.",
        ],
        thumbnail: FaqVideoThumbnail,
    },
    {
        question: "How do I set default values for new ads?",
        answer: "Preferences let you pre-fill common values so every new batch starts with the right setup.",
        steps: [
            "Open Settings and select Preferences.",
            "Choose the ad account whose defaults you want to edit.",
            "Update the fields you use most often.",
            "Save your changes at the bottom of the page.",
        ],
        thumbnail: FaqVideoThumbnail,
        videoUrl: "https://www.loom.com/",
    },
    {
        question: "How do I connect another ad account?",
        answer: "You can add another eligible ad account from the account selection area in Settings.",
        steps: [
            "Go to Settings and open Preferences.",
            "Open the ad account selector.",
            "Select the accounts you want available in Blip and confirm your selection.",
        ],
        thumbnail: FaqVideoThumbnail,
        videoUrl: "https://www.loom.com/",
    },
    {
        question: "How do I create and use an ad naming formula?",
        answer: "Ad naming formulas combine reusable properties to create consistent names automatically.",
        steps: [
            "Open the Ad Name Formula section in Preferences.",
            "Select the properties you want included in every ad name.",
            "Drag the properties into your preferred order.",
            "Add custom text where needed, then save your settings.",
        ],
        thumbnail: FaqVideoThumbnail,
        videoUrl: "https://www.loom.com/",
    },
    {
        question: "How do I switch between Meta and TikTok?",
        answer: "Use the platform button at the bottom of the Settings navigation to move between launchers.",
        steps: [
            "Open Settings from your current launcher.",
            "Click Meta or TikTok in the left sidebar.",
            "Connect the platform if prompted, then select an advertiser account.",
        ],
        thumbnail: FaqVideoThumbnail,
        videoUrl: "https://www.loom.com/",
    },
]

export default function HelpFAQs() {
    return (
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
    )
}
