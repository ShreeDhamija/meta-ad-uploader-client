import { Button } from "@/components/ui/button"

export default function OnboardingPopup({ userName, onClose, onGoToSettings }) {
    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-all opacity-0 animate-[popBounce_0.4s_ease-out_forwards]">
                <div className="bg-[#FBF8F5] rounded-[24px] shadow-2xl px-8 py-10 w-full max-w-xl text-center">
                    <div className="text-3xl mb-4">👋</div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-1">Welcome to Blip, {userName}!</h2>
                    <p className="text-[#415363] mb-10">There’s 2 ways to get started</p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        {/* Option 1 */}
                        <button
                            onClick={onClose}
                            className="group flex flex-col items-center space-y-3 focus:outline-none"
                        >
                            <img
                                src="https://meta-ad-uploader-server-production.up.railway.app/home.webp"
                                alt="Home Icon"
                                className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="bg-[#FFA500] hover:bg-[#e69500] text-white text-sm rounded-full px-5 py-2">
                                Option 1
                            </div>
                            <p className="text-sm text-gray-800 font-medium text-center">
                                Head Home and<br />Start Creating Ads
                            </p>
                        </button>

                        {/* Option 2 */}
                        <button
                            onClick={onGoToSettings}
                            className="group flex flex-col items-center space-y-3 focus:outline-none"
                        >
                            <img
                                src="https://meta-ad-uploader-server-production.up.railway.app/settings.png"  // Replace with your actual file name
                                alt="Settings Icon"
                                className="w-[100px] h-[100px] object-contain transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="bg-[#F72585] hover:bg-[#e11d74] text-white text-sm rounded-full px-5 py-2">
                                Option 2 (recommended)
                            </div>
                            <p className="text-sm text-gray-800 font-medium text-center">
                                Configure Settings to<br />speed up your process
                            </p>
                        </button>
                    </div>

                </div>
            </div>
            <style>
                {`
        @keyframes popBounce {
          0% { opacity: 0; transform: scale(0.9); }
          60% { opacity: 1; transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        `}
            </style>
        </>

    );
}
