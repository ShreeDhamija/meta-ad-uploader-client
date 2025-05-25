import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function OnboardingPopup({ userName, onClose, onGoToSettings }) {
    const [step, setStep] = useState("initial")

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#FAF9F7] rounded-[24px] shadow-2xl px-8 py-10 w-[620px] relative overflow-hidden text-center">
                <div className="relative min-h-[400px]">
                    {/* INITIAL STEP */}
                    {step === "initial" && (
                        <div key="initial" className="absolute inset-0 animate-fadeSwap">
                            <div className="text-4xl mb-4">👋</div>
                            <h2 className="text-2xl font-semibold text-[#415363] mb-1">
                                Welcome to Blip, {userName}!
                            </h2>
                            <p className="text-gray-500 mb-10">There’s 2 ways to get started</p>

                            <div className="flex flex-col sm:flex-row justify-center gap-6">
                                {/* Home Option */}
                                <button
                                    onClick={() => setStep("home")}
                                    className="group flex flex-col items-center space-y-3 focus:outline-none"
                                >
                                    <img
                                        src="https://meta-ad-uploader-server-production.up.railway.app/home.webp"
                                        alt="Home Icon"
                                        className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105"
                                    />
                                    <div className="bg-[#FFA500] hover:bg-[#e69500] text-white text-sm rounded-full px-5 py-2">
                                        Home
                                    </div>
                                    <p className="text-sm text-gray-800 font-medium text-center">
                                        Start Creating Ads
                                    </p>
                                </button>

                                {/* Settings Option */}
                                <button
                                    onClick={onGoToSettings}
                                    className="group flex flex-col items-center space-y-3 focus:outline-none"
                                >
                                    <img
                                        src="https://meta-ad-uploader-server-production.up.railway.app/settings.png"
                                        alt="Settings Icon"
                                        className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105"
                                    />
                                    <div className="bg-[#F72585] hover:bg-[#e11d74] text-white text-sm rounded-full px-5 py-2">
                                        Settings
                                    </div>
                                    <p className="text-sm text-gray-800 font-medium text-center">
                                        Configure Settings
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* HOME STEP */}
                    {step === "home" && (
                        <div key="home" className="absolute inset-0 animate-fadeSwap text-left flex flex-col md:flex-row gap-6">
                            {/* Left content */}
                            <div className="flex-1">
                                <img
                                    src="https://meta-ad-uploader-server-production.up.railway.app/home.webp"
                                    alt="Home Icon"
                                    className="w-10 mb-4"
                                />
                                <h2 className="text-xl font-semibold text-[#415363] mb-6">Home Page</h2>

                                <div className="mb-6">
                                    <div className="bg-[#FFA500] text-white text-sm font-semibold rounded-full inline-block px-4 py-1 mb-2">
                                        Step 1
                                    </div>
                                    <p className="text-gray-700">
                                        Pick an ad account, campaign and ad set to post. The settings of these might change what fields are available in the ad creation form.
                                    </p>
                                </div>

                                <div className="mb-8">
                                    <div className="bg-[#FBB03B] text-white text-sm font-semibold rounded-full inline-block px-4 py-1 mb-2">
                                        Step 2
                                    </div>
                                    <p className="text-gray-700">
                                        Fill out all the ad details and hit create ad. Dynamic video creatives might take longer to process than other ads.
                                    </p>
                                </div>

                                <Button
                                    onClick={onClose}
                                    className="bg-[#F72585] hover:bg-[#e11d74] text-white text-base px-6 py-2 rounded-full"
                                >
                                    Start Posting
                                </Button>
                            </div>

                            {/* Right image */}
                            <div className="flex-1 bg-[#FDCEDF] rounded-xl overflow-hidden p-4 flex items-center justify-center">
                                <img
                                    src="/Group 22.png"
                                    alt="Preview UI"
                                    className="max-h-[280px] object-contain"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <style>
                    {`
            @keyframes fadeSwap {
              from { opacity: 0; transform: scale(0.97); }
              to { opacity: 1; transform: scale(1); }
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
