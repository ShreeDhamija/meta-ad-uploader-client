import { Button } from "@/components/ui/button"

export default function SettingsOnboardingPopup({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#FAF9F7] rounded-[24px] shadow-2xl px-8 py-10 w-[620px] relative overflow-hidden text-left">
                <div className="flex flex-col md:flex-row gap-6 items-stretch w-full animate-fadeSwap">
                    {/* Left content */}
                    <div className="flex-1">
                        <img
                            src="https://meta-ad-uploader-server-production.up.railway.app/settings.png"
                            alt="Settings Icon"
                            className="w-14 mb-4"
                        />
                        <h2 className="text-[24px] font-semibold text-[#415363] mb-6">Settings Page</h2>

                        <div className="mb-6">
                            <div className="bg-[#FFA500] text-white text-sm font-semibold rounded-full inline-block px-4 py-1 mb-2">
                                Configure Presets
                            </div>
                            <p className="text-gray-700 text-sm">
                                Save all your creative enhancements,UTM's and pages once and forget about it.
                            </p>
                        </div>

                        <div className="mb-8">
                            <div className="bg-[#FBB03B] text-white text-sm font-semibold rounded-full inline-block px-4 py-1 mb-2">
                                Import Copy
                            </div>
                            <p className="text-gray-700 text-sm">
                                No need to copy paste text everytime. Import your most used best converting copy and save them as templates.
                            </p>
                        </div>

                        <Button
                            onClick={onClose}
                            className="bg-[#F72585] hover:bg-[#e11d74] text-white text-base px-6 py-2 rounded-full"
                        >
                            Configure Settings
                        </Button>
                    </div>

                    {/* Right image */}
                    <div className="flex-1 bg-[#FDCEDF] rounded-[22px] overflow-hidden flex items-center justify-center">
                        <img
                            src="https://meta-ad-uploader-server-production.up.railway.app/settings-popup-image.webp"
                            alt="Preview UI"
                            className="w-full h-full object-cover"
                        />
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
