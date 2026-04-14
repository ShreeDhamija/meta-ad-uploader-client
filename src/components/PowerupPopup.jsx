import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import ZapIcon from "@/assets/icons/zap.webp"
import AgencyIcon from "@/assets/agency.webp"
import Powerup1 from "@/assets/Powerup1.webp"
import Powerup2 from "@/assets/Powerup2.webp"

const steps = [
    {
        id: 1,
        title: "A New Powerup",
        icon: ZapIcon,
        image: Powerup1,
        body: "After uploading all your files, click on Customize Ad Data to split the media into different ad sets while keeping the naming, copy and every other field available.",
    },
    {
        id: 2,
        title: "A New Powerup",
        icon: AgencyIcon,
        image: Powerup2,
        body: "These buttons will appear at the bottom to let you create and manage different variations of the form data for each version you want to launch.",
        footer: "And of course if you have any questions just message us!",
    },
]

export default function PowerupPopup({ onClose }) {
    const [stepIndex, setStepIndex] = useState(0)

    const step = steps[stepIndex]
    const isLastStep = stepIndex === steps.length - 1

    const handleBackdropClick = (event) => {
        if (isLastStep && event.target === event.currentTarget) {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={handleBackdropClick}
        >
            <div
                className="relative w-full max-w-[470px] rounded-[30px] bg-[#FAF9F7] px-6 py-5 text-left shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                {isLastStep && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-[#6B5B53] transition-colors hover:bg-black/5"
                        aria-label="Close popup"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                <div className="animate-fadeSwap">
                    <div className="mx-auto w-full max-w-[390px]">
                        <div className="mb-3 flex items-center gap-2.5">
                            <img
                                src={step.icon}
                                alt=""
                                className="h-9 w-9 object-contain"
                            />
                            <h2 className="text-[24px] font-semibold text-[#3A3A3A]">
                                {step.title}
                            </h2>
                        </div>

                        <p className="mb-4 text-[14px] font-medium leading-6 text-[#6B5B53]">
                            You can now upload all your media once and choose to split the media into different ad sets with different ad naming, copy and every other field available.
                        </p>

                        <div className="mb-4 inline-flex rounded-full border border-[#F72585] px-4 py-1 text-[14px] font-semibold text-[#F72585]">
                            Step {step.id}
                        </div>

                        <p className="mb-4 text-[14px] font-medium leading-6 text-[#6B5B53]">
                            {step.body}
                        </p>

                        <div className="mb-4 overflow-hidden rounded-[24px] border border-black/20 bg-white">
                            <img
                                src={step.image}
                                alt={`Powerup step ${step.id}`}
                                className="h-auto w-full object-cover"
                            />
                        </div>

                        {step.footer && (
                            <p className="mb-4 text-[14px] font-medium leading-6 text-[#6B5B53]">
                                {step.footer}
                            </p>
                        )}

                        {isLastStep ? (
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="h-auto flex-1 rounded-full border-[#F72585] bg-transparent py-3 text-[18px] font-semibold text-[#F72585] hover:bg-[#FFF1F7] hover:text-[#F72585]"
                                >
                                    Close
                                </Button>

                                <Button
                                    type="button"
                                    onClick={onClose}
                                    className="h-auto flex-1 rounded-full bg-[#F72585] py-3 text-[18px] font-semibold text-white hover:bg-[#e11d74]"
                                >
                                    Got it
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => setStepIndex((current) => Math.min(current + 1, steps.length - 1))}
                                className="h-auto w-full rounded-full bg-[#F72585] py-3 text-[18px] font-semibold text-white hover:bg-[#e11d74]"
                            >
                                Continue
                            </Button>
                        )}
                    </div>
                </div>

                <style>
                    {`
                        @keyframes fadeSwap {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }

                        .animate-fadeSwap {
                            animation: fadeSwap 0.3s ease-out forwards;
                        }
                    `}
                </style>
            </div>
        </div>
    )
}
