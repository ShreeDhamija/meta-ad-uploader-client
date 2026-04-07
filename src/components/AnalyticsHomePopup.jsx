import { Button } from "@/components/ui/button"
import AnalyticsIcon from "@/assets/AnalyticsIcon.webp"
import AnalyticsPopup from "@/assets/AnalyticsPopup.webp"

export default function AnalyticsHomePopup({ onClose, onCheckOutAnalytics }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div className="bg-[#FAF9F7] rounded-[24px] shadow-2xl px-8 py-10 w-full max-w-[520px] relative overflow-hidden text-left">
                <div className="animate-fadeSwap">
                    <div className="flex items-center gap-3 mb-5">
                        <img
                            src={AnalyticsIcon}
                            alt="Analytics icon"
                            className="w-12 h-12 object-contain"
                        />
                        <h2 className="text-[24px] font-semibold text-[#3A3A3A]">
                            Introducing Analytics
                        </h2>
                    </div>

                    <p className="text-[15px] leading-7 text-[#6B5B53] mb-8">
                        We took the playbook behind $3M/month in ad spend and put it in your hands.
                        Review recommendations and apply them in one click or not.{" "}
                        <span className="font-semibold text-[#3A3A3A]">Now in Preferences.</span>
                    </p>

                    <img
                        src={AnalyticsPopup}
                        alt="Analytics preview"
                        className="w-[370px] h-auto object-contain mx-auto mb-8"
                    />

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-[#F72585] text-[16px] font-semibold px-3 py-2"
                        >
                            Skip
                        </button>

                        <Button
                            onClick={onCheckOutAnalytics}
                            className="flex-1 bg-[#F72585] hover:bg-[#e11d74] text-white text-[16px] font-semibold rounded-full py-7 px-[18px]"
                        >
                            Check out Analytics
                        </Button>
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
