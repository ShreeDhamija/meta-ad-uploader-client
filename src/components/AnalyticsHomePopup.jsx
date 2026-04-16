import { Button } from "@/components/ui/button"
import AnalyticsIcon from "@/assets/AnalyticsIcon.webp"
import AnalyticsPopup from "@/assets/AnalyticsPopup.webp"
import AnalyticsBG from "@/assets/AnalyticsBG.webp"

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
            <div
                className="bg-[#FAF9F7] rounded-[30px] shadow-2xl w-full max-w-[430px] relative overflow-hidden text-left"
                style={{ maxHeight: "650px" }}
            >
                <div className="animate-fadeSwap">
                    {/* Image area with background */}
                    <div
                        className="w-full flex items-center justify-center px-5 pt-5 pb-4"
                        style={{
                            backgroundImage: `url(${AnalyticsBG})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <img
                            src={AnalyticsPopup}
                            alt="Analytics preview"
                            className="w-[88%] h-auto object-contain rounded-[16px] shadow-lg"
                        />
                    </div>

                    {/* Text content */}
                    <div className="px-6 pt-4 pb-6">
                        <div className="w-[370px] max-w-full mx-auto">
                            <div className="flex items-center gap-3 mb-3">
                                <img
                                    src={AnalyticsIcon}
                                    alt="Analytics icon"
                                    className="w-12 h-12 object-contain"
                                />
                                <h2 className="text-[22px] font-bold text-black italic">
                                    Introducing Analytics
                                </h2>
                            </div>

                            <p className="text-[15px] leading-7 text-[#6B5B53] mb-6">
                                We took the playbook behind $3M/month in ad
                                spend and put it in your hands. Review
                                recommendations and apply them in one
                                click&mdash;or not.
                            </p>
                        </div>

                        <div className="w-[370px] max-w-full mx-auto flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-black text-[14px] font-semibold px-3 py-3 shrink-0"
                            >
                                I dont want cool insights
                            </button>

                            <Button
                                onClick={onCheckOutAnalytics}
                                className="flex-1 bg-black hover:bg-black/80 text-white text-[16px] font-semibold rounded-full py-[24px] px-[10px]"
                            >
                                Check out Analytics
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
