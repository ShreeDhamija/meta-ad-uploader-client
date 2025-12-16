import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";

function MultiAdvertiserAds({ enabled, setEnabled }) {
    return (
        <div className="bg-[#f7f7f7] rounded-xl p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                        <h3 className="font-medium text-[14px] text-zinc-950">
                            Multi-advertiser ads
                        </h3>
                        <p className="text-xs text-gray-400">
                            Your ad can appear with others in the same ad unit to help promote discoverability. Your ad creative may be resized or cropped.
                        </p>
                    </div>
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch ml-4 flex-shrink-0"
                />
            </div>
        </div>
    );
}

export default memo(MultiAdvertiserAds);