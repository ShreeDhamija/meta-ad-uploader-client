// import { useState, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Checkbox } from "@/components/ui/checkbox"
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
// import { Label } from "@/components/ui/label"
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
//     DialogOverlay
// } from "@/components/ui/dialog"
// import { toast } from "sonner"
// import { useAppData } from "@/lib/AppContext"
// import useSubscription from "@/lib/useSubscriptionSettings"
// import { cn } from "@/lib/utils"

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// export default function AdAccountSelectionPopup({ isOpen, onClose, onSave, selectedAdAccountIds }) {
//     const { allAdAccounts } = useAppData()
//     const { subscriptionData } = useSubscription()
//     const [selectedAccountIds, setSelectedAccountIds] = useState([])
//     const [isLoading, setIsLoading] = useState(false)

//     const isStarterPlan = subscriptionData.planType === 'starter'
//     const isBrandPlan = subscriptionData.planType === 'brand'
//     const maxAccounts = isStarterPlan ? 1 : (isBrandPlan ? 5 : Infinity)

//     useEffect(() => {
//         if (isOpen) {
//             setSelectedAccountIds(selectedAdAccountIds || [])
//         }
//     }, [isOpen, selectedAdAccountIds])

//     const handleSave = async () => {
//         if (selectedAccountIds.length === 0) {
//             toast.error("Please select an ad account")
//             return
//         }

//         setIsLoading(true)
//         try {
//             const response = await fetch(`${API_BASE_URL}/settings/save`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 credentials: 'include',
//                 body: JSON.stringify({
//                     globalSettings: {
//                         selectedAdAccountIds: selectedAccountIds
//                     }
//                 })
//             })

//             if (response.ok) {
//                 toast.success("Ad account selected successfully!")
//                 window.dispatchEvent(new Event('globalSettingsUpdated'))
//                 onClose()
//             } else {
//                 toast.error("Failed to save ad account selection")
//             }
//         } catch (error) {
//             console.error("Error saving ad account:", error)
//             toast.error("Failed to save ad account selection")
//         } finally {
//             setIsLoading(false)
//         }
//     }

//     const getDialogDescription = () => {
//         if (isStarterPlan) {
//             return "As a Starter plan subscriber, you can use 1 ad account. Please select which account you'd like to use."
//         } else if (isBrandPlan) {
//             return "As a Light plan subscriber, you can use up to 5 ad accounts. Please select which accounts you'd like to use."
//         }
//         return "Please select your ad accounts."
//     }

//     const handleClose = (open) => {
//         // Only allow closing if not opening (i.e., trying to close) and at least one account is selected
//         if (!open) {
//             if (selectedAccountIds.length === 0) {
//                 toast.error("Please select at least one ad account before closing")
//                 return
//             }
//             onClose()
//         }
//     }

//     return (
//         <Dialog open={isOpen} onOpenChange={handleClose}>
//             <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
//             <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-8">
//                 <DialogHeader className="space-y-4">
//                     <DialogTitle className="text-xl">Select Your Ad Account{maxAccounts > 1 ? 's' : ''}</DialogTitle>
//                     <DialogDescription className="text-base leading-relaxed">
//                         {getDialogDescription()}
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="py-4">
//                     {allAdAccounts.length === 0 ? (
//                         <p className="text-gray-500 text-center py-8">No ad accounts found</p>
//                     ) : isStarterPlan ? (
//                         // Radio buttons for Starter plan (1 account)
//                         <RadioGroup
//                             value={selectedAccountIds[0] || ""}
//                             onValueChange={(value) => setSelectedAccountIds([value])}
//                             className="space-y-2 max-h-60 overflow-y-auto"
//                         >
//                             {allAdAccounts.map((account) => (
//                                 <div key={account.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
//                                     <RadioGroupItem value={account.id} id={account.id} />
//                                     <Label
//                                         htmlFor={account.id}
//                                         className="flex-1 cursor-pointer"
//                                     >
//                                         <div className="font-medium">{account.name}</div>
//                                         <div className="text-sm text-gray-500">ID: {account.id}</div>
//                                     </Label>
//                                 </div>
//                             ))}
//                         </RadioGroup>
//                     ) : (
//                         // Checkboxes for Brand/Light plan (3 accounts) and Pro plan
//                         <div className="space-y-2 max-h-60 overflow-y-auto">
//                             {allAdAccounts.map((account) => (
//                                 <div key={account.id} className={cn(
//                                     "flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50",
//                                     selectedAccountIds.length >= maxAccounts && !selectedAccountIds.includes(account.id)
//                                         ? "opacity-50 cursor-not-allowed bg-gray-50"
//                                         : ""
//                                 )}>
//                                     <Checkbox
//                                         id={account.id}
//                                         checked={selectedAccountIds.includes(account.id)}
//                                         disabled={selectedAccountIds.length >= maxAccounts && !selectedAccountIds.includes(account.id)}
//                                         onCheckedChange={(checked) => {
//                                             if (checked) {
//                                                 setSelectedAccountIds(prev => [...prev, account.id])
//                                             } else {
//                                                 setSelectedAccountIds(prev => prev.filter(id => id !== account.id))
//                                             }
//                                         }}
//                                     />
//                                     <Label
//                                         htmlFor={account.id}
//                                         className={cn(
//                                             "flex-1 cursor-pointer",
//                                             selectedAccountIds.length >= maxAccounts && !selectedAccountIds.includes(account.id)
//                                                 ? "cursor-not-allowed text-gray-400"
//                                                 : ""
//                                         )}
//                                     >
//                                         <div className="font-medium">{account.name}</div>
//                                         <div className="text-sm text-gray-500">ID: {account.id}</div>
//                                     </Label>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>

//                 <DialogFooter className="flex flex-col sm:flex-row gap-3">
//                     <Button
//                         onClick={handleSave}
//                         disabled={selectedAccountIds.length === 0 || isLoading}
//                         className="rounded-2xl flex-1"
//                     >
//                         {isLoading ? "Saving..." : "Save Selection"}
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     )
// }

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAppData } from "@/lib/AppContext"
import useSubscription from "@/lib/useSubscriptionSettings"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function AdAccountSelectionPopup({ isOpen, onClose, onSave, selectedAdAccountIds }) {
    const { allAdAccounts } = useAppData()
    const { subscriptionData } = useSubscription()
    const [selectedAccountIds, setSelectedAccountIds] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const isStarterPlan = subscriptionData.planType === 'starter'
    const isBrandPlan = subscriptionData.planType === 'brand'
    const maxAccounts = isStarterPlan ? 1 : (isBrandPlan ? 5 : Infinity)

    useEffect(() => {
        if (isOpen) {
            setSelectedAccountIds(selectedAdAccountIds || [])
            setSearchQuery("")
        }
    }, [isOpen, selectedAdAccountIds])

    // Memoized filtered accounts - only recalculates when allAdAccounts or searchQuery changes
    const filteredAccounts = useMemo(() => {
        if (!searchQuery.trim()) {
            return allAdAccounts
        }

        const query = searchQuery.toLowerCase().trim()
        return allAdAccounts.filter(account =>
            account.name.toLowerCase().includes(query) ||
            account.id.toLowerCase().includes(query)
        )
    }, [allAdAccounts, searchQuery])

    const handleSave = async () => {
        if (selectedAccountIds.length === 0) {
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
                        selectedAdAccountIds: selectedAccountIds
                    }
                })
            })

            if (response.ok) {
                toast.success("Ad account selected successfully!")
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

    const getDialogDescription = () => {
        if (isStarterPlan) {
            return "As a Starter plan subscriber, you can use 1 ad account. Please select which account you'd like to use."
        } else if (isBrandPlan) {
            return "As a Light plan subscriber, you can use up to 5 ad accounts. Please select which accounts you'd like to use."
        }
        return "Please select your ad accounts."
    }

    const handleClose = (open) => {
        // Only allow closing if not opening (i.e., trying to close) and at least one account is selected
        if (!open) {
            if (selectedAccountIds.length === 0) {
                toast.error("Please select at least one ad account before closing")
                return
            }
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
            <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-8">
                <DialogHeader className="space-y-4">
                    <DialogTitle className="text-xl">Select Your Ad Account{maxAccounts > 1 ? 's' : ''}</DialogTitle>
                    <DialogDescription className="text-base leading-relaxed">
                        {getDialogDescription()}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 rounded-xl"
                        />
                    </div>

                    {/* Account List */}
                    {filteredAccounts.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            {searchQuery ? "No accounts found matching your search" : "No ad accounts found"}
                        </p>
                    ) : isStarterPlan ? (
                        // Radio buttons for Starter plan (1 account)
                        <RadioGroup
                            value={selectedAccountIds[0] || ""}
                            onValueChange={(value) => setSelectedAccountIds([value])}
                            className="space-y-2 max-h-60 overflow-y-auto"
                        >
                            {filteredAccounts.map((account) => (
                                <div key={account.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                                    <RadioGroupItem value={account.id} id={account.id} />
                                    <Label
                                        htmlFor={account.id}
                                        className="flex-1 cursor-pointer"
                                    >
                                        <div className="font-medium">{account.name}</div>
                                        <div className="text-sm text-gray-500">ID: {account.id}</div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    ) : (
                        // Checkboxes for Brand/Light plan (3 accounts) and Pro plan
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredAccounts.map((account) => (
                                <div key={account.id} className={cn(
                                    "flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50",
                                    selectedAccountIds.length >= maxAccounts && !selectedAccountIds.includes(account.id)
                                        ? "opacity-50 cursor-not-allowed bg-gray-50"
                                        : ""
                                )}>
                                    <Checkbox
                                        id={account.id}
                                        checked={selectedAccountIds.includes(account.id)}
                                        disabled={selectedAccountIds.length >= maxAccounts && !selectedAccountIds.includes(account.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedAccountIds(prev => [...prev, account.id])
                                            } else {
                                                setSelectedAccountIds(prev => prev.filter(id => id !== account.id))
                                            }
                                        }}
                                    />
                                    <Label
                                        htmlFor={account.id}
                                        className={cn(
                                            "flex-1 cursor-pointer",
                                            selectedAccountIds.length >= maxAccounts && !selectedAccountIds.includes(account.id)
                                                ? "cursor-not-allowed text-gray-400"
                                                : ""
                                        )}
                                    >
                                        <div className="font-medium">{account.name}</div>
                                        <div className="text-sm text-gray-500">ID: {account.id}</div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={selectedAccountIds.length === 0 || isLoading}
                        className="rounded-2xl flex-1"
                    >
                        {isLoading ? "Saving..." : "Save Selection"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}