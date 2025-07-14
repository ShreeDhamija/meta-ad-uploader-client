"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from "@/lib/utils"
import ShopIcon from '@/assets/icons/bag.svg?react';

export default function ShopDestinationSelector({
    pageId,
    selectedShopDestination,
    setSelectedShopDestination,
    setSelectedShopDestinationType,
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
                    `https://api.withblip.com/auth/fetch-shop-data?pageId=${pageId}`,
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
        //.filter((shop) => shop.shop_status === "ACTIVE" && shop.fb_sales_channel_status === "ENABLED")
        .map((shop) => ({
            id: shop.storefront_shop_id,
            label: shop.fb_page_name,
            type: "shop",
        }))

    const productSetOptions = shopData.productSets.map((set) => ({
        id: set.id,
        label: set.name,
        type: "product_set",
    }))

    const productOptions = shopData.products.map((product) => ({
        id: product.id,
        label: product.name,
        type: "product",
    }))


    const allOptions = [...shopOptions, ...productSetOptions, ...productOptions]
    const filteredOptions = allOptions.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
    const selectedOption = allOptions.find((option) => option.id === selectedShopDestination)

    if (!isVisible) {
        return null
    }

    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <Label className="flex items-center gap-2">
                    <ShopIcon alt="" className="w-4 h-4" />
                    Shop Destination
                </Label>
                <Label className="text-gray-500 text-[12px] font-regular block">Select a shop or product set for your shop ads</Label>
            </div>

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
                    <Command filter={() => 1} loop={false} shouldFilter={false}>
                        <CommandInput
                            placeholder="Search shop destinations..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                        />
                        <CommandEmpty>No shop destinations found.</CommandEmpty>
                        <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                            {/* Shops Section */}
                            {shopOptions.length > 0 && (
                                <CommandGroup>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 sticky top-0 rounded-lg">
                                        Shops
                                    </div>
                                    {shopOptions
                                        .filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
                                        .map((option) => (
                                            <CommandItem
                                                key={option.id}
                                                value={option.id}
                                                onSelect={() => {
                                                    setSelectedShopDestination(option.id)
                                                    setSelectedShopDestinationType(option.type)
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
                                                <span>{option.label.replace('Shop: ', '')}</span> {/* Remove prefix */}
                                                {selectedShopDestination === option.id && <Check className="ml-2 h-4 w-4" />}
                                            </CommandItem>
                                        ))}
                                </CommandGroup>
                            )}

                            {/* Products Section */}
                            {productOptions.length > 0 && (
                                <CommandGroup>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 sticky top-0 rounded-lg">
                                        Products
                                    </div>
                                    {productOptions
                                        .filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
                                        .map((option) => (
                                            <CommandItem
                                                key={option.id}
                                                value={option.id}
                                                onSelect={() => {
                                                    setSelectedShopDestination(option.id)
                                                    setSelectedShopDestinationType(option.type)
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
                                                <span>{option.label.replace('Product: ', '')}</span> {/* Remove prefix */}
                                                {selectedShopDestination === option.id && <Check className="ml-2 h-4 w-4" />}
                                            </CommandItem>
                                        ))}
                                </CommandGroup>
                            )}

                            {/* Product Sets Section */}
                            {/* {productSetOptions.length > 0 && (
                                <CommandGroup>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 sticky top-0 rounded-lg">
                                        Product Sets
                                    </div>
                                    {productSetOptions
                                        .filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
                                        .map((option) => (
                                            <CommandItem
                                                key={option.id}
                                                value={option.id}
                                                onSelect={() => {
                                                    setSelectedShopDestination(option.id)
                                                    setSelectedShopDestinationType(option.type)
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
                                                <span>{option.label.replace('Product Set: ', '')}</span> 
                                                {selectedShopDestination === option.id && <Check className="ml-2 h-4 w-4" />}
                                            </CommandItem>
                                        ))}
                                </CommandGroup>
                            )} */}



                            {/* No results */}
                            {shopOptions.length === 0 && productSetOptions.length === 0 && productOptions.length === 0 && (
                                <CommandItem disabled className="opacity-50 cursor-not-allowed">
                                    No shop destinations found.
                                </CommandItem>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}