import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Infotooltip({ side = "top", className = "" }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`h-5 w-5 rounded-full hover:bg-muted ${className}`}>
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Ad naming rules information</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side={side} className="max-w-xs">
                    <div className="text-sm space-y-2">
                        <p className="font-semibold">Ad Naming Rules</p>
                        <div className="space-y-1">
                            <p>
                                1. <strong>File Type:</strong> Displays Static/Video depending on file type uploaded
                            </p>
                            <p>
                                2. <strong>Iteration:</strong> Every ad file uploaded gets a number appended to the end
                            </p>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
