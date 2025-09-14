import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAppData } from "@/lib/AppContext"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function AdAccountSelectionPopup({ isOpen, onClose, onSave }) {
    const { adAccounts } = useAppData()
    const [selectedAccountId, setSelectedAccountId] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSave = async () => {
        if (!selectedAccountId) {
            toast.error("Please select an ad account")
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/settings/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    globalSettings: {
                        selectedAdAccountId: selectedAccountId
                    }
                })
            })

            if (response.ok) {
                toast.success("Ad account selected successfully!")
                // onSave(selectedAccountId)
                window.dispatchEvent(new Event('globalSettingsUpdated'))
                onClose()
            } else {
                toast.error("Failed to save ad account selection")
            }
        } catch (error) {
            console.error("Error saving ad account:", error)
            toast.error("Failed to save ad account selection")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => { }} > {/* Empty function prevents closing */}
            <DialogContent
                className="sm:max-w-[500px] !rounded-[30px] p-8 [&>button[data-dialog-close]]:hidden"
                onEscapeKeyDown={(e) => e.preventDefault()} // Prevent ESC key
                onPointerDownOutside={(e) => e.preventDefault()} // Prevent click outside
                onInteractOutside={(e) => e.preventDefault()} // Additional protection

            >
                <DialogHeader className="space-y-4">
                    <DialogTitle className="text-xl">Select Your Ad Account</DialogTitle>
                    <DialogDescription className="text-base leading-relaxed">
                        As a Brand plan subscriber, you can use one ad account. Please select which account you'd like to use.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {adAccounts.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No ad accounts found</p>
                    ) : (
                        <RadioGroup value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {adAccounts.map((account) => (
                                    <div key={account.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                                        <RadioGroupItem value={account.id} id={account.id} />
                                        <Label htmlFor={account.id} className="flex-1 cursor-pointer">
                                            <div className="font-medium">{account.name}</div>
                                            <div className="text-sm text-gray-500">ID: {account.id}</div>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </RadioGroup>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={!selectedAccountId || isLoading}
                        className="rounded-2xl flex-1"
                    >
                        {isLoading ? "Saving..." : "Save Selection"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}