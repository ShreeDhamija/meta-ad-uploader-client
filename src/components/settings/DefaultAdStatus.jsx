import { memo } from "react";
import { CirclePause } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

function DefaultAdStatus({ value, onValueChange }) {
    return (
        <div className="bg-[#f7f7f7] rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2">
                    <CirclePause className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col">
                        <h3 className="font-medium text-[14px] text-zinc-950">Default ad status</h3>
                        <p className="text-xs text-gray-400">Automatically set new ads to paused if you prefer to activate them later.</p>
                    </div>
                </div>
                <RadioGroup value={value} onValueChange={onValueChange} aria-label="Default ad status" className="flex items-center space-x-2 flex-shrink-0">
                    <div className={cn("flex items-center space-x-2 p-2 rounded-xl transition-colors duration-150", value === "ACTIVE" ? "bg-green-50 border border-green-300" : "border border-transparent")}>
                        <RadioGroupItem value="ACTIVE" id="defaultStatusActive" className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500 [&[data-state=checked]_svg_circle]:fill-green-500" />
                        <Label htmlFor="defaultStatusActive" className={cn("text-sm font-medium leading-none cursor-pointer", value === "ACTIVE" ? "text-green-600" : "text-gray-600")}>Active</Label>
                    </div>
                    <div className={cn("flex items-center space-x-2 p-2 rounded-xl transition-colors duration-150", value === "PAUSED" ? "bg-red-50 border border-red-300" : "border border-transparent")}>
                        <RadioGroupItem value="PAUSED" id="defaultStatusPaused" className="focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-red-500 data-[state=checked]:text-red-500 [&[data-state=checked]_svg_circle]:fill-red-500" />
                        <Label htmlFor="defaultStatusPaused" className={cn("text-sm font-medium leading-none cursor-pointer", value === "PAUSED" ? "text-red-600" : "text-gray-600")}>Paused</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
    );
}

export default memo(DefaultAdStatus);
