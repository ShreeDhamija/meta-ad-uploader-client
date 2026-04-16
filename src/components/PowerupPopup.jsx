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
    const [isTransitioning, setIsTransitioning] = useState(false)

    const step = steps[stepIndex]
    const isLastStep = stepIndex === steps.length - 1

    const handleNext = () => {
        setIsTransitioning(true)
        setTimeout(() => {
            setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
            requestAnimationFrame(() => setIsTransitioning(false))
        }, 250)
    }

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
                className="relative w-full max-w-[470px] rounded-[30px] bg-[#FAF9F7] text-left shadow-2xl overflow-hidden animate-fadeSwap"
                style={{ maxHeight: "580px" }}
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
                        key={step.id}
                        src={step.image}
                        alt={`Powerup step ${step.id}`}
                        className={`w-[88%] h-auto object-contain rounded-[16px] shadow-lg transition-all duration-250 ${
                            isTransitioning
                                ? "scale-95 opacity-0"
                                : "popup-bounceIn"
                        }`}
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
                                A New Powerup
                            </h2>
                        </div>

                        <p className="mb-3 text-[14px] font-medium leading-6 text-[#6B5B53]">
                            You can now upload all your media once and choose to
                            split the media into different ad sets with different
                            ad naming, copy and every other field available.
                        </p>

                        <div
                            className={`mb-3 inline-flex rounded-full border border-black px-4 py-1 text-[14px] font-semibold text-black transition-opacity duration-250 ${
                                isTransitioning ? "opacity-0" : "opacity-100"
                            }`}
                        >
                            Step {step.id}
                        </div>

                        <p
                            className={`mb-4 text-[14px] font-medium leading-6 text-[#6B5B53] transition-opacity duration-250 ${
                                isTransitioning ? "opacity-0" : "opacity-100"
                            }`}
                        >
                            {step.body}
                        </p>

                        <div className="flex items-center gap-3">
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-out ${
                                    isLastStep
                                        ? "flex-1 opacity-100 max-w-[50%]"
                                        : "flex-[0] opacity-0 max-w-0"
                                }`}
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="h-auto w-full rounded-full border-black bg-transparent py-3 text-[16px] font-semibold text-black hover:bg-black/5 hover:text-black"
                                >
                                    Close
                                </Button>
                            </div>

                            <Button
                                type="button"
                                onClick={isLastStep ? onClose : handleNext}
                                className={`h-auto rounded-full bg-black py-3 text-[16px] font-semibold text-white hover:bg-black/80 transition-all duration-300 ${
                                    isLastStep ? "flex-1" : "w-full"
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

                        @keyframes popupBounceIn {
                            0%   { transform: scale(0.95); opacity: 0.6; }
                            60%  { transform: scale(1.02); }
                            100% { transform: scale(1);    opacity: 1;   }
                        }
                        .popup-bounceIn {
                            animation: popupBounceIn 0.4s ease-out forwards;
                        }
                    `}
                </style>
            </div>
        </div>
    )
}
