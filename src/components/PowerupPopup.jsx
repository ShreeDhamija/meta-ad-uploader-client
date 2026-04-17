import { useState } from "react"

import { Button } from "@/components/ui/button"
import ZapIcon from "@/assets/icons/zap.webp"
import Poweurp1 from "@/assets/Poweurp1.webp"
import Powerup2 from "@/assets/Powerup2.webp"
import PowerupBG from "@/assets/PowerupBG.webp"

const steps = [
    {
        id: 1,
        image: Poweurp1,
        body: "After uploading all your files, click on Split Ad Data",
    },
    {
        id: 2,
        image: Powerup2,
        body: "These buttons will appear at the bottom to let you create different variations of the form data to you want.",
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
                className="relative w-full max-w-[432px] rounded-[30px] bg-[#FAF9F7] text-left shadow-2xl overflow-hidden animate-fadeSwap"
                style={{ maxHeight: "563px" }}
                onClick={(event) => event.stopPropagation()}
            >
                {/* Image area with background */}
                <div
                    className="w-full flex items-center justify-center px-5 pt-5 pb-4"
                    style={{
                        backgroundImage: `url(${PowerupBG})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    <img
                        src={step.image}
                        alt={`Powerup step ${step.id}`}
                        className="object-contain rounded-[16px]"
                        style={{ width: "395px", height: "196px" }}
                    />
                </div>

                {/* Text content */}
                <div className="px-6 pt-4 pb-5">
                    <div className="mx-auto w-full max-w-[390px]">
                        <div className="mb-2 flex items-center gap-2.5">
                            <img
                                src={ZapIcon}
                                alt=""
                                className="h-9 w-9 object-contain"
                            />
                            <h2 className="text-[22px] font-bold text-black">
                                Split Ad Data Across Media Files!
                            </h2>
                        </div>

                        <p className="mb-3 text-[13px] font-normal leading-5 text-black">
                            You can now upload all your media once and choose to
                            split the media into different ad sets with different
                            ad naming, copy and every other field available.
                        </p>

                        <div className="mb-3 inline-flex rounded-full border border-black px-4 py-1 text-[13px] font-semibold text-black">
                            Step {step.id}
                        </div>

                        <p className="mb-4 text-[13px] font-normal leading-5 text-black">
                            {step.body}
                        </p>

                        <div className="flex items-center gap-3">
                            {isLastStep && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="h-auto flex-1 rounded-full border-black bg-transparent py-3 text-[16px] font-semibold text-black hover:bg-black/5 hover:text-black"
                                >
                                    Close
                                </Button>
                            )}

                            <Button
                                type="button"
                                onClick={
                                    isLastStep
                                        ? onClose
                                        : () =>
                                            setStepIndex((prev) =>
                                                Math.min(
                                                    prev + 1,
                                                    steps.length - 1
                                                )
                                            )
                                }
                                className={`h-auto rounded-full bg-black py-3 text-[16px] font-semibold text-white hover:bg-black/80 ${isLastStep ? "flex-1" : "w-full"
                                    }`}
                            >
                                {isLastStep ? "Got it" : "Next"}
                            </Button>
                        </div>
                    </div>
                </div>

                <style>
                    {`
                        @keyframes fadeSwap {
                            from { opacity: 0; }
                            to   { opacity: 1; }
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
