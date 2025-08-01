import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function OnboardingPopup({ userName, onClose, onGoToSettings, hasSeenSettingsOnboarding }) {
    const [step, setStep] = useState(hasSeenSettingsOnboarding ? "home" : "initial")

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#FAF9F7] rounded-[24px] shadow-2xl px-8 py-10 w-[520px] relative overflow-hidden text-center">
                <div className="relative w-full transition-all duration-300">
                    {/* INITIAL STEP */}
                    {step === "initial" && (
                        <div key="initial" className="w-full animate-fadeSwap">
                            <div className="text-4xl mb-4">👋</div>
                            <h2 className="text-2xl font-semibold text-[#415363] mb-1">
                                Welcome to Blip, {userName}!
                            </h2>
                            <p className="text-gray-500 mb-2">Start launching ads in 2 minutes</p>
                            <p className="text-gray-400 mb-10 text-sm">Lets configure your ad accounts with your <br></br>preferred values and settings to pre-fill into ads.</p>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => {
                                        console.log("Settings button clicked")
                                        console.log("onGoToSettings prop:", onGoToSettings)
                                        console.log("typeof onGoToSettings:", typeof onGoToSettings)
                                        onGoToSettings()
                                    }}
                                    className="group flex flex-col items-center space-y-3 focus:outline-none"
                                >
                                    <img
                                        src="https://api.withblip.com/settings.webp"
                                        alt="Settings Icon"
                                        className="w-[120px] h-[120px] object-contain transition-transform duration-200 group-hover:scale-105"
                                    />
                                    <div className="bg-[#F72585] hover:bg-[#e11d74] text-white text-sm rounded-full px-5 py-2">
                                        Get Started
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* HOME STEP */}
                    {step === "home" && (
                        <div key="home" className="w-full animate-fadeSwap text-left flex flex-col md:flex-row gap-6 items-stretch">
                            {/* Left content */}
                            <div className="flex-1 flex flex-col justify-between">
                                {/* Top content block */}
                                <div>
                                    <img
                                        src="https://api.withblip.com/home.webp"
                                        alt="Home Icon"
                                        className="w-14 mb-4"
                                    />
                                    <h2 className="text-[24px] font-semibold text-[#415363] mb-6">Home Page</h2>

                                    <div className="mb-6">
                                        <div className="bg-[#FFA500] text-white text-sm font-semibold rounded-full inline-block px-4 py-1 mb-2">
                                            Step 1
                                        </div>
                                        <p className="text-gray-700 text-sm">
                                            Pick an ad account, campaign, then choose to launch ads in a new or existing adset.
                                        </p>
                                    </div>

                                    <div className="mb-8">
                                        <div className="bg-[#FBB03B] text-white text-sm font-semibold rounded-full inline-block px-4 py-1 mb-2">
                                            Step 2
                                        </div>
                                        <p className="text-gray-700 text-sm">
                                            Enter your ad info and click Publish Ads!
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom aligned button */}
                                <Button
                                    onClick={onClose}
                                    className="bg-[#F72585] hover:bg-[#e11d74] text-white text-base px-6 py-2 rounded-full mt-4"
                                >
                                    Start Posting
                                </Button>
                            </div>


                            {/* Right image */}
                            <div className="flex-1 bg-[#FDCEDF] rounded-lg overflow-hidden flex items-center justify-center">
                                <img
                                    src="https://api.withblip.com/Home-Popup-Image.webp"
                                    alt="Preview UI"
                                    className="w-full h-full object-cover "
                                />
                            </div>

                        </div>
                    )}
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
