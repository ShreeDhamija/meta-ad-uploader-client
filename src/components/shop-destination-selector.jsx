"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from "@/lib/utils"

export default function ShopDestinationSelector({
    pageId,
    selectedShopDestination,
    setSelectedShopDestination,
    isVisible = false,
}) {
    const [open, setOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [shopData, setShopData] = useState({
        shops: [],
        productSets: [],
        products: [],
    })
    const [isLoading, setIsLoading] = useState(false)

    // Fetch shop data when pageId changes and component is visible
    useEffect(() => {
        if (!pageId || !isVisible) {
            setShopData({ shops: [], productSets: [], products: [] })
            return
        }

        const fetchShopData = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(
                    `https://meta-ad-uploader-server-production.up.railway.app/auth/fetch-shop-data?pageId=${pageId}`,
                    { credentials: "include" },
                )
                const data = await res.json()

                if (res.ok) {
                    setShopData({
                        shops: data.shops || [],
                        productSets: data.product_sets || [],
                        products: data.products || [],
                    })
                } else {
                    console.error("Failed to fetch shop data:", data.error)
                    setShopData({ shops: [], productSets: [], products: [] })
                }
            } catch (err) {
                console.error("Error fetching shop data:", err)
                setShopData({ shops: [], productSets: [], products: [] })
            } finally {
                setIsLoading(false)
            }
        }

        fetchShopData()
    }, [pageId, isVisible])

    // Create options for the dropdown
    const shopOptions = shopData.shops
        .filter((shop) => shop.shop_status === "PUBLISHED" && shop.fb_sales_channel_status === "ACTIVE")
        .map((shop) => ({
            id: shop.storefront_shop_id,
            label: shop.fb_page_name || `Shop ${shop.storefront_shop_id}`,
            type: "shop",
        }))

    const productSetOptions = shopData.productSets.map((set) => ({
        id: set.id,
        label: `Product Set: ${set.name}`,
        type: "product_set",
    }))

    const allOptions = [...shopOptions, ...productSetOptions]
    const filteredOptions = allOptions.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
    const selectedOption = allOptions.find((option) => option.id === selectedShopDestination)

    if (!isVisible) {
        return null
    }

    return (
        <div className="space-y-2">
            <Label>Shop Destination</Label>
            <Label className="text-gray-500 text-[12px] font-regular">Select a shop or product set for your shop ads</Label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={isLoading || allOptions.length === 0}
                        className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
                    >
                        {isLoading
                            ? "Loading shop destinations..."
                            : selectedOption
                                ? selectedOption.label
                                : allOptions.length === 0
                                    ? "No shop destinations available"
                                    : "Select shop destination"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                    align="start"
                    sideOffset={4}
                    side="bottom"
                    avoidCollisions={false}
                    style={{
                        minWidth: "var(--radix-popover-trigger-width)",
                        width: "auto",
                        maxWidth: "none",
                    }}
                >
                    <Command filter={() => 1} loop={false}>
                        <CommandInput
                            placeholder="Search shop destinations..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                        />
                        <CommandEmpty>No shop destinations found.</CommandEmpty>
                        <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                            <CommandGroup>
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((option) => (
                                        <CommandItem
                                            key={option.id}
                                            value={option.id}
                                            onSelect={() => {
                                                setSelectedShopDestination(option.id)
                                                setOpen(false)
                                            }}
                                            className={cn(
                                                "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                                "data-[selected=true]:bg-gray-100",
                                                selectedShopDestination === option.id && "bg-gray-100 rounded-xl font-semibold",
                                                "hover:bg-gray-100",
                                                "flex items-center justify-between",
                                            )}
                                            data-selected={option.id === selectedShopDestination}
                                        >
                                            <span>{option.label}</span>
                                            {selectedShopDestination === option.id && <Check className="ml-2 h-4 w-4" />}
                                        </CommandItem>
                                    ))
                                ) : (
                                    <CommandItem disabled className="opacity-50 cursor-not-allowed">
                                        No shop destinations found.
                                    </CommandItem>
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}