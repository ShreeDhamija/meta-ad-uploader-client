import { Button } from "@/components/ui/button";

export default function SecondOnboardingPopup({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl px-8 py-10 max-w-xl w-full text-center animate-[popBounce_0.4s_ease-out_forwards]">
                <h2 className="text-xl font-semibold mb-3">Quick Tip 💡</h2>
                <p className="text-gray-600 mb-6">You can upload multiple files and preview them before posting.</p>
                <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Got it
                </Button>
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
        </div>
    );
}
