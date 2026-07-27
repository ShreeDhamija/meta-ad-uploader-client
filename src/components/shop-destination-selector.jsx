"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronsUpDown, Check, Loader } from 'lucide-react'
import { cn } from "@/lib/utils"
import ShopIcon from '@/assets/icons/bag.svg?react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// Module-level so the default doesn't churn the memo deps on every render
const DEFAULT_ALLOWED_TYPES = ["shop", "product_set", "product"]

// Options can repeat across catalogs/sets; keep the first occurrence of each id so the
// dropdown never renders duplicate rows (React keys included).
function dedupeById(options) {
    const seen = new Set()
    return options.filter((option) => {
        if (!option.id || seen.has(option.id)) return false
        seen.add(option.id)
        return true
    })
}

export default function ShopDestinationSelector({
    pageId,
    selectedShopDestination,
    setSelectedShopDestination,
    setSelectedShopDestinationType,
    isFieldModified,
    isVisible = false,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    label = "Shop Destination",
    description = "Select a shop or product set for your shop ads",
    placeholder = "Select shop destination",
    searchPlaceholder = "Search shop destinations...",
    emptyLabel = "No shop destinations available",
    triggerClassName,
}) {
    const [open, setOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [shopData, setShopData] = useState({
        shops: [],
        productSets: [],
        products: [],
    })
    const [isLoading, setIsLoading] = useState(false)
    const [lastFetchedPageId, setLastFetchedPageId] = useState(null)



    // Fetch shop data only when pageId changes (not when isVisible changes)
    useEffect(() => {
        if (!pageId) {
            setShopData({ shops: [], productSets: [], products: [] })
            setLastFetchedPageId(null)
            return
        }

        // Skip fetch if we already have data for this pageId
        if (pageId === lastFetchedPageId) {
            return
        }

        const fetchShopData = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(
                    `${API_BASE_URL}/auth/fetch-shop-data?pageId=${pageId}`,
                    { credentials: "include" },
                )
                const data = await res.json()

                if (res.ok) {
                    setShopData({
                        shops: data.shops || [],
                        productSets: data.product_sets || [],
                        products: data.products || [],
                    })
                    setLastFetchedPageId(pageId)
                } else {
                    console.error("Failed to fetch shop data:", data.error)
                    setShopData({ shops: [], productSets: [], products: [] })
                    setLastFetchedPageId(null)
                }
            } catch (err) {
                console.error("Error fetching shop data:", err)
                setShopData({ shops: [], productSets: [], products: [] })
                setLastFetchedPageId(null)
            } finally {
                setIsLoading(false)
            }
        }

        fetchShopData()
    }, [pageId, lastFetchedPageId])

    // Create options for the dropdown. `meta` is the gray subtext that tells otherwise
    // identically-named entries apart (products in particular repeat names constantly).
    const shopOptions = useMemo(
        () =>
            dedupeById(
                shopData.shops
                    //.filter((shop) => shop.shop_status === "ACTIVE" && shop.fb_sales_channel_status === "ENABLED")
                    .map((shop) => ({
                        id: shop.storefront_shop_id,
                        label: (shop.fb_page_name || "").replace("Shop: ", ""),
                        meta: shop.storefront_shop_id,
                        type: "shop",
                    })),
            ),
        [shopData.shops],
    )

    const productSetOptions = useMemo(
        () =>
            dedupeById(
                shopData.productSets.map((set) => ({
                    id: set.id,
                    label: (set.name || "").replace("Product Set: ", ""),
                    meta: set.catalog_name || set.catalog_id || null,
                    type: "product_set",
                })),
            ),
        [shopData.productSets],
    )

    const productOptions = useMemo(
        () =>
            dedupeById(
                shopData.products.map((product) => ({
                    id: product.id,
                    label: (product.name || "").replace("Product: ", ""),
                    meta:
                        [product.set_name || product.catalog_name, product.retailer_id]
                            .filter(Boolean)
                            .join(" · ") || null,
                    type: "product",
                })),
            ),
        [shopData.products],
    )

    const allOptions = useMemo(
        () => [
            ...(allowedTypes.includes("shop") ? shopOptions : []),
            ...(allowedTypes.includes("product_set") ? productSetOptions : []),
            ...(allowedTypes.includes("product") ? productOptions : []),
        ],
        [allowedTypes, shopOptions, productSetOptions, productOptions],
    )

    // Search matches the name or the gray subtext, so a retailer id or catalog name works too
    const query = searchValue.trim().toLowerCase()
    const filterOptions = (options, q) =>
        q
            ? options.filter(
                  (option) =>
                      option.label.toLowerCase().includes(q) || (option.meta || "").toLowerCase().includes(q),
              )
            : options

    const filteredShopOptions = useMemo(() => filterOptions(shopOptions, query), [shopOptions, query])
    const filteredProductOptions = useMemo(() => filterOptions(productOptions, query), [productOptions, query])
    const filteredProductSetOptions = useMemo(
        () => filterOptions(productSetOptions, query),
        [productSetOptions, query],
    )

    const visibleCount =
        (allowedTypes.includes("shop") ? filteredShopOptions.length : 0) +
        (allowedTypes.includes("product") ? filteredProductOptions.length : 0) +
        (allowedTypes.includes("product_set") ? filteredProductSetOptions.length : 0)

    const selectedOption = allOptions.find((option) => option.id === selectedShopDestination)

    if (!isVisible) {
        return null
    }

    const sectionHeader = (title, count) => (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-600">
            <span>{title}</span>
            <span className="font-normal text-gray-500">{count}</span>
        </div>
    )

    const renderItem = (option) => (
        <CommandItem
            key={option.id}
            value={option.id}
            onSelect={() => {
                setSelectedShopDestination(option.id)
                setSelectedShopDestinationType(option.type)
                setOpen(false)
            }}
            className={cn(
                "px-3 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                "data-[selected=true]:bg-gray-100",
                selectedShopDestination === option.id && "bg-gray-100 rounded-2xl font-semibold",
                "hover:bg-gray-100",
                "flex items-center gap-2",
            )}
            data-selected={option.id === selectedShopDestination}
        >
            <span className="truncate">{option.label}</span>
            {option.meta && <span className="ml-auto truncate text-xs text-gray-400">{option.meta}</span>}
            {selectedShopDestination === option.id && <Check className="ml-2 h-4 w-4 shrink-0" />}
        </CommandItem>
    )

    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <Label className="flex items-center gap-2">
                    {isFieldModified?.() ? <span className="text-red-500 font-semibold">*</span> : null}
                    <ShopIcon alt="" className="w-4 h-4" />
                    {label}
                </Label>
                <Label className="text-gray-500 text-[12px] font-regular block">{description}</Label>
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={isLoading || allOptions.length === 0}
                        className={cn(
                            "w-full justify-between border-gray-300 rounded-2xl py-4.5 bg-white shadow hover:bg-white",
                            triggerClassName,
                        )}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader className="h-4 w-4 animate-spin" />
                                <span>Loading shop destinations...</span>
                            </div>
                        ) : selectedOption ? (
                            <span className="truncate">{selectedOption.label}</span>
                        ) : allOptions.length === 0 ? (
                            emptyLabel
                        ) : (
                            placeholder
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                    align="start"
                    sideOffset={4}
                    side="bottom"
                    avoidCollisions={false}
                    style={{
                        minWidth: "var(--radix-popover-trigger-width)",
                        width: "auto",
                        maxWidth: "var(--radix-popover-trigger-width)",
                    }}
                >
                    <Command filter={() => 1} loop={false} shouldFilter={false}>
                        <CommandInput
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onValueChange={setSearchValue}
                            className="bg-transparent"
                            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                        />
                        <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                            {/* [&>div]:!block overrides Radix's inline `display: table` on the
                                viewport content, which otherwise breaks the sticky headers */}
                            <ScrollArea viewportClassName="max-h-[325px] [&>div]:!block">
                                {/* Shops Section */}
                                {allowedTypes.includes("shop") && filteredShopOptions.length > 0 && (
                                    <CommandGroup>
                                        {sectionHeader("Shops", filteredShopOptions.length)}
                                        {filteredShopOptions.map(renderItem)}
                                    </CommandGroup>
                                )}

                                {/* Products Section */}
                                {allowedTypes.includes("product") && filteredProductOptions.length > 0 && (
                                    <CommandGroup>
                                        {sectionHeader("Products", filteredProductOptions.length)}
                                        {filteredProductOptions.map(renderItem)}
                                    </CommandGroup>
                                )}

                                {/* Product Sets Section */}
                                {allowedTypes.includes("product_set") && filteredProductSetOptions.length > 0 && (
                                    <CommandGroup>
                                        {sectionHeader("Product Sets", filteredProductSetOptions.length)}
                                        {filteredProductSetOptions.map(renderItem)}
                                    </CommandGroup>
                                )}

                                {/* No results */}
                                {visibleCount === 0 && (
                                    <div className="px-4 py-5 text-center text-sm text-gray-500">
                                        No shop destinations found.
                                    </div>
                                )}
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
