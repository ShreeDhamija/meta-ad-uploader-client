import { Button } from "@/components/ui/button"
import Settings from '@/assets/settings.png';
import Video from '@/assets/video/onboarding.mp4';

export default function SettingsOnboardingPopup({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-[#FAF9F7] rounded-[24px] shadow-2xl px-8 py-10 w-[620px] relative overflow-hidden text-left" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col w-full animate-fadeSwap">
                    <img
                        src={Settings}
                        alt="Settings Icon"
                        className="w-14 mb-2"
                    />
                    <h2 className="text-[24px] font-semibold text-[#415363] mb-6">Settings</h2>

                    {/* Two points side by side */}
                    <div className="flex gap-6 mb-6 w-full">
                        <div className="flex-1">
                            <div className="text-[#ED9C07] text-sm font-semibold rounded-full inline-block py-1">
                                1. Configure Presets
                            </div>
                            <p className="text-gray-700 text-sm">
                                Save all your creative enhancements, UTMs and default pages once then forget about it.
                            </p>
                        </div>

                        <div className="flex-1">
                            <div className="text-[#ED9C07] text-sm font-semibold rounded-full inline-block py-1">
                                2. Import Copy
                            </div>
                            <p className="text-gray-700 text-sm">
                                No need to copy paste text everytime. Import your most used best converting copy and save them as templates.
                            </p>
                        </div>
                    </div>

                    {/* Video */}
                    <video
                        src={Video}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        className="w-full rounded-[16px] mb-6 border-2 border-black/20"
                    />

                    <Button
                        onClick={onClose}
                        className="w-full bg-[#F72585] hover:bg-[#e11d74] text-white text-base px-6 py-6 rounded-full"
                    >
                        Configure Preferences
                    </Button>
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