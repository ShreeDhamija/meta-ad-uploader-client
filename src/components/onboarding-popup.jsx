import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OnboardingPopup({ onClose, onGoToSettings }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-auto text-center">
                <h2 className="text-xl font-semibold mb-4">Welcome to Blip!</h2>
                <p className="mb-6 text-gray-600">What would you like to do first?</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={onClose}>Go to Home</Button>
                    <Button variant="outline" onClick={onGoToSettings}>Go to Settings</Button>
                </div>
            </div>
        </div>
    );
}
