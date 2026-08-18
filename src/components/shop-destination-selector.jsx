"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronsUpDown, Check, Loader } from "lucide-react"
import { cn } from "@/lib/utils"
import ShopIcon from "@/assets/icons/bag.svg?react"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"
const DEFAULT_ALLOWED_TYPES = ["shop", "product_set", "product"]

function dedupeById(options) {
    const seen = new Set()
    return options.filter((option) => {
        if (!option.id || seen.has(option.id)) return false
        seen.add(option.id)
        return true
    })
}

async function fetchJson(url, signal) {
    const response = await fetch(url, { credentials: "include", signal })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Request failed")
    return data
}

export default function ShopDestinationSelector({
    pageId,
    adAccountId,
    selectedShopDestination,
    setSelectedShopDestination,
    setSelectedShopDestinationType,
    selectedProductCatalogId,
    setSelectedProductCatalogId,
    isFieldModified,
    isVisible = false,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    catalogLabel = "Product Catalog",
    label = "Shop Destination",
    description = "Select a shop, product set, or product for your shop ads",
    placeholder = "Select shop destination",
    searchPlaceholder = "Search shop destinations...",
    emptyLabel = "No shop destinations available",
    triggerClassName,
}) {
    const [catalogOpen, setCatalogOpen] = useState(false)
    const [destinationOpen, setDestinationOpen] = useState(false)
    const [catalogSearchValue, setCatalogSearchValue] = useState("")
    const [searchValue, setSearchValue] = useState("")
    const [catalogs, setCatalogs] = useState([])
    const [shopData, setShopData] = useState({ shops: [], productSets: [], products: [] })
    const [internalCatalogId, setInternalCatalogId] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingCatalogData, setIsLoadingCatalogData] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [productSetCursor, setProductSetCursor] = useState(null)
    const [productCursor, setProductCursor] = useState(null)
    const catalogIndexCacheRef = useRef(new Map())
    const catalogDataCacheRef = useRef(new Map())
    const isProductSetOnly = allowedTypes.length === 1 && allowedTypes[0] === "product_set"
    const wantsProductSets = allowedTypes.includes("product_set")
    const wantsProducts = allowedTypes.includes("product")
    const catalogId = selectedProductCatalogId === undefined ? internalCatalogId : selectedProductCatalogId
    const selectedCatalog = catalogs.find((catalog) => catalog.id === catalogId)

    const updateCatalogId = (nextCatalogId) => {
        if (selectedProductCatalogId === undefined) setInternalCatalogId(nextCatalogId)
        setSelectedProductCatalogId?.(nextCatalogId)
    }

    // The first request returns only shops/catalogs. It never expands catalog edges.
    useEffect(() => {
        if (!pageId || !adAccountId) {
            setCatalogs([])
            setShopData({ shops: [], productSets: [], products: [] })
            setProductSetCursor(null)
            setProductCursor(null)
            return undefined
        }
        if (!isVisible) return undefined

        const indexCacheKey = `${pageId}:${adAccountId}:${isProductSetOnly ? "product_sets" : "all"}`
        const cachedIndex = catalogIndexCacheRef.current.get(indexCacheKey)
        if (cachedIndex) {
            setCatalogs(cachedIndex.catalogs)
            setShopData((previous) => ({ ...previous, shops: cachedIndex.shops }))
            setIsLoading(false)
            return undefined
        }

        const controller = new AbortController()
        setIsLoading(true)
        setCatalogs([])
        setShopData({ shops: [], productSets: [], products: [] })
        setProductSetCursor(null)
        setProductCursor(null)

        const scope = isProductSetOnly ? "&scope=product_sets" : ""
        fetchJson(
            `${API_BASE_URL}/auth/fetch-shop-data?pageId=${encodeURIComponent(pageId)}` +
                `&adAccountId=${encodeURIComponent(adAccountId)}${scope}`,
            controller.signal,
        )
            .then((data) => {
                const nextCatalogs = dedupeById(data.product_catalogs || [])
                const nextShops = data.shops || []
                catalogIndexCacheRef.current.set(indexCacheKey, { catalogs: nextCatalogs, shops: nextShops })
                setCatalogs(nextCatalogs)
                setShopData({ shops: nextShops, productSets: [], products: [] })
            })
            .catch((error) => {
                if (error.name === "AbortError") return
                console.error("Failed to fetch shop catalogs:", error)
                setCatalogs([])
                setShopData({ shops: [], productSets: [], products: [] })
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false)
            })

        return () => controller.abort()
    }, [adAccountId, isProductSetOnly, isVisible, pageId])

    // Fetch only the selected catalog's first edge pages. Each edge owns its cursor.
    useEffect(() => {
        setShopData((previous) => ({ ...previous, productSets: [], products: [] }))
        setProductSetCursor(null)
        setProductCursor(null)
        if (!isVisible || !pageId || !adAccountId || !catalogId) {
            setIsLoadingCatalogData(false)
            return undefined
        }

        const dataCacheKey = `${pageId}:${adAccountId}:${catalogId}:${wantsProductSets ? "sets" : ""}:${wantsProducts ? "products" : ""}`
        const cachedCatalogData = catalogDataCacheRef.current.get(dataCacheKey)
        if (cachedCatalogData) {
            setShopData((previous) => ({
                ...previous,
                productSets: cachedCatalogData.productSets,
                products: cachedCatalogData.products,
            }))
            setProductSetCursor(cachedCatalogData.productSetCursor)
            setProductCursor(cachedCatalogData.productCursor)
            setIsLoadingCatalogData(false)
            return undefined
        }

        const controller = new AbortController()
        setIsLoadingCatalogData(true)
        const baseQuery = `pageId=${encodeURIComponent(pageId)}&catalogId=${encodeURIComponent(catalogId)}`
        const requests = []

        if (wantsProductSets) {
            requests.push(
                fetchJson(`${API_BASE_URL}/auth/fetch-shop-product-sets?${baseQuery}`, controller.signal).then((data) => ({
                    kind: "product_sets",
                    data,
                })),
            )
        }
        if (wantsProducts) {
            requests.push(
                fetchJson(`${API_BASE_URL}/auth/fetch-shop-products?${baseQuery}`, controller.signal).then((data) => ({
                    kind: "products",
                    data,
                })),
            )
        }

        Promise.allSettled(requests)
            .then((results) => {
                if (controller.signal.aborted) return
                let nextProductSets = []
                let nextProducts = []
                let nextProductSetCursor = null
                let nextProductCursor = null
                for (const result of results) {
                    if (result.status === "rejected") {
                        console.error("Failed to fetch selected catalog data:", result.reason)
                        continue
                    }
                    const { kind, data } = result.value
                    if (kind === "product_sets") {
                        nextProductSets = data.product_sets || []
                        nextProductSetCursor = data.product_set_cursor || null
                    } else {
                        nextProducts = data.products || []
                        nextProductCursor = data.product_cursor || null
                    }
                }
                setShopData((previous) => ({ ...previous, productSets: nextProductSets, products: nextProducts }))
                setProductSetCursor(nextProductSetCursor)
                setProductCursor(nextProductCursor)
                if (results.every((result) => result.status === "fulfilled")) {
                    catalogDataCacheRef.current.set(dataCacheKey, {
                        productSets: nextProductSets,
                        products: nextProducts,
                        productSetCursor: nextProductSetCursor,
                        productCursor: nextProductCursor,
                    })
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoadingCatalogData(false)
            })

        return () => controller.abort()
    }, [adAccountId, catalogId, isVisible, pageId, wantsProductSets, wantsProducts])

    const handleCatalogSelect = (nextCatalogId) => {
        if (nextCatalogId !== catalogId) {
            setSelectedShopDestination("")
            setSelectedShopDestinationType("")
        }
        updateCatalogId(nextCatalogId)
        setCatalogOpen(false)
        setSearchValue("")
    }

    const handleLoadMore = async () => {
        if ((!productSetCursor && !productCursor) || isLoadingMore) return
        setIsLoadingMore(true)
        const requests = []
        if (productSetCursor) {
            requests.push(
                fetchJson(
                    `${API_BASE_URL}/auth/fetch-shop-product-sets?pageId=${encodeURIComponent(pageId)}` +
                        `&catalogId=${encodeURIComponent(catalogId)}&cursor=${encodeURIComponent(productSetCursor)}`,
                ).then((data) => ({ kind: "product_sets", data })),
            )
        }
        if (productCursor) {
            requests.push(
                fetchJson(
                    `${API_BASE_URL}/auth/fetch-shop-products?pageId=${encodeURIComponent(pageId)}` +
                        `&catalogId=${encodeURIComponent(catalogId)}&cursor=${encodeURIComponent(productCursor)}`,
                ).then((data) => ({ kind: "products", data })),
            )
        }

        try {
            const results = await Promise.allSettled(requests)
            let nextProductSets = shopData.productSets
            let nextProducts = shopData.products
            let nextProductSetCursor = productSetCursor
            let nextProductCursor = productCursor
            for (const result of results) {
                if (result.status === "rejected") {
                    console.error("Failed to load more catalog data:", result.reason)
                    continue
                }
                const { kind, data } = result.value
                if (kind === "product_sets") {
                    nextProductSets = dedupeById([...nextProductSets, ...(data.product_sets || [])])
                    nextProductSetCursor = data.product_set_cursor || null
                } else {
                    nextProducts = dedupeById([...nextProducts, ...(data.products || [])])
                    nextProductCursor = data.product_cursor || null
                }
            }
            setShopData((previous) => ({ ...previous, productSets: nextProductSets, products: nextProducts }))
            setProductSetCursor(nextProductSetCursor)
            setProductCursor(nextProductCursor)
            const dataCacheKey = `${pageId}:${adAccountId}:${catalogId}:${wantsProductSets ? "sets" : ""}:${wantsProducts ? "products" : ""}`
            catalogDataCacheRef.current.set(dataCacheKey, {
                productSets: nextProductSets,
                products: nextProducts,
                productSetCursor: nextProductSetCursor,
                productCursor: nextProductCursor,
            })
        } finally {
            setIsLoadingMore(false)
        }
    }

    const catalogOptions = useMemo(
        () =>
            catalogs.map((catalog) => ({
                id: catalog.id,
                label: catalog.name || `Catalog ${catalog.id}`,
                meta: catalog.id,
            })),
        [catalogs],
    )
    const filteredCatalogOptions = useMemo(() => {
        const query = catalogSearchValue.trim().toLowerCase()
        if (!query) return catalogOptions
        return catalogOptions.filter(
            (catalog) => catalog.label.toLowerCase().includes(query) || catalog.meta.toLowerCase().includes(query),
        )
    }, [catalogOptions, catalogSearchValue])

    const shopOptions = useMemo(
        () =>
            dedupeById(
                shopData.shops.map((shop) => ({
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
                    meta: isProductSetOnly ? null : selectedCatalog?.name || catalogId,
                    type: "product_set",
                })),
            ),
        [catalogId, isProductSetOnly, selectedCatalog?.name, shopData.productSets],
    )
    const productOptions = useMemo(
        () =>
            dedupeById(
                shopData.products.map((product) => ({
                    id: product.id,
                    label: (product.name || "").replace("Product: ", ""),
                    meta: product.retailer_id || selectedCatalog?.name || catalogId,
                    type: "product",
                })),
            ),
        [catalogId, selectedCatalog?.name, shopData.products],
    )
    const allOptions = useMemo(
        () => [
            ...(allowedTypes.includes("shop") ? shopOptions : []),
            ...(allowedTypes.includes("product_set") ? productSetOptions : []),
            ...(allowedTypes.includes("product") ? productOptions : []),
        ],
        [allowedTypes, productOptions, productSetOptions, shopOptions],
    )

    const query = searchValue.trim().toLowerCase()
    const filterOptions = (options) =>
        query
            ? options.filter(
                  (option) => option.label.toLowerCase().includes(query) || (option.meta || "").toLowerCase().includes(query),
              )
            : options
    const filteredShopOptions = filterOptions(shopOptions)
    const filteredProductSetOptions = filterOptions(productSetOptions)
    const filteredProductOptions = filterOptions(productOptions)
    const visibleCount =
        (allowedTypes.includes("shop") ? filteredShopOptions.length : 0) +
        (allowedTypes.includes("product_set") ? filteredProductSetOptions.length : 0) +
        (allowedTypes.includes("product") ? filteredProductOptions.length : 0)
    const selectedOption = allOptions.find((option) => option.id === selectedShopDestination)

    if (!isVisible) return null

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
                setDestinationOpen(false)
            }}
            className={cn(
                "m-1 flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 transition-colors duration-150",
                "data-[selected=true]:bg-gray-100 hover:bg-gray-100",
                selectedShopDestination === option.id && "bg-gray-100 font-semibold",
            )}
            data-selected={option.id === selectedShopDestination}
        >
            <span className="truncate">{option.label}</span>
            {option.meta && <span className="ml-auto truncate text-xs text-gray-400">{option.meta}</span>}
            {selectedShopDestination === option.id && <Check className="ml-2 h-4 w-4 shrink-0" />}
        </CommandItem>
    )
    const triggerChrome = cn(
        "w-full justify-between rounded-2xl border-gray-300 bg-white py-4.5 shadow hover:bg-white",
        triggerClassName,
    )
    const popoverChrome = {
        minWidth: "var(--radix-popover-trigger-width)",
        width: "auto",
        maxWidth: "var(--radix-popover-trigger-width)",
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                        {isFieldModified?.() ? <span className="font-semibold text-red-500">*</span> : null}
                        <ShopIcon alt="" className="h-4 w-4" />
                        {catalogLabel}
                    </Label>
                    <Label className="block text-[12px] font-normal text-gray-500">
                        {isProductSetOnly
                            ? description
                            : "Choose a catalog to load its product sets and products. Shops remain available without one."}
                    </Label>
                </div>
                <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={catalogOpen}
                            disabled={isLoading || catalogOptions.length === 0}
                            className={triggerChrome}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader className="h-4 w-4 animate-spin" /> Loading product catalogs...
                                </span>
                            ) : selectedCatalog ? (
                                <span className="truncate">{selectedCatalog.name || `Catalog ${selectedCatalog.id}`}</span>
                            ) : catalogOptions.length === 0 ? (
                                "No product catalogs available"
                            ) : (
                                "Select product catalog"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] !max-w-none rounded-2xl bg-white p-0 shadow-lg"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={popoverChrome}
                    >
                        <Command filter={() => 1} shouldFilter={false}>
                            <CommandInput
                                placeholder="Search product catalogs..."
                                value={catalogSearchValue}
                                onValueChange={setCatalogSearchValue}
                                wrapperClassName="rounded-[20px] border-gray-200 bg-gray-50"
                            />
                            <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                                <ScrollArea viewportClassName="max-h-[325px] [&>div]:!block">
                                    {filteredCatalogOptions.length > 0 ? (
                                        <CommandGroup>
                                            {sectionHeader("Product Catalogs", filteredCatalogOptions.length)}
                                            {filteredCatalogOptions.map((catalog) => (
                                                <CommandItem
                                                    key={catalog.id}
                                                    value={catalog.id}
                                                    onSelect={() => handleCatalogSelect(catalog.id)}
                                                    className={cn(
                                                        "m-1 flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 hover:bg-gray-100",
                                                        catalog.id === catalogId && "bg-gray-100 font-semibold",
                                                    )}
                                                >
                                                    <span className="truncate">{catalog.label}</span>
                                                    <span className="ml-auto truncate text-xs text-gray-400">{catalog.meta}</span>
                                                    {catalog.id === catalogId && <Check className="h-4 w-4 shrink-0" />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    ) : (
                                        <div className="px-4 py-5 text-center text-sm text-gray-500">No product catalogs found.</div>
                                    )}
                                </ScrollArea>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                        <ShopIcon alt="" className="h-4 w-4" />
                        {label}
                    </Label>
                    {!isProductSetOnly && <Label className="block text-[12px] font-normal text-gray-500">{description}</Label>}
                </div>
                <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={destinationOpen}
                            disabled={isLoading || isLoadingCatalogData || allOptions.length === 0}
                            className={triggerChrome}
                        >
                            {isLoadingCatalogData ? (
                                <span className="flex items-center gap-2">
                                    <Loader className="h-4 w-4 animate-spin" /> Loading selected catalog...
                                </span>
                            ) : selectedOption ? (
                                <span className="truncate">{selectedOption.label}</span>
                            ) : allOptions.length === 0 ? (
                                catalogId ? emptyLabel : isProductSetOnly ? "Select a product catalog first" : emptyLabel
                            ) : (
                                placeholder
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] !max-w-none rounded-2xl bg-white p-0 shadow-lg"
                        align="start"
                        sideOffset={4}
                        side="bottom"
                        avoidCollisions={false}
                        style={popoverChrome}
                    >
                        <Command filter={() => 1} shouldFilter={false}>
                            <CommandInput
                                placeholder={searchPlaceholder}
                                value={searchValue}
                                onValueChange={setSearchValue}
                                wrapperClassName="rounded-[20px] border-gray-200 bg-gray-50"
                            />
                            <CommandList className="max-h-none overflow-hidden rounded-2xl" selectOnFocus={false}>
                                <ScrollArea viewportClassName="max-h-[325px] [&>div]:!block">
                                    {allowedTypes.includes("shop") && filteredShopOptions.length > 0 && (
                                        <CommandGroup>
                                            {sectionHeader("Shops", filteredShopOptions.length)}
                                            {filteredShopOptions.map(renderItem)}
                                        </CommandGroup>
                                    )}
                                    {allowedTypes.includes("product") && filteredProductOptions.length > 0 && (
                                        <CommandGroup>
                                            {sectionHeader("Products", filteredProductOptions.length)}
                                            {filteredProductOptions.map(renderItem)}
                                        </CommandGroup>
                                    )}
                                    {allowedTypes.includes("product_set") && filteredProductSetOptions.length > 0 && (
                                        <CommandGroup>
                                            {sectionHeader("Product Sets", filteredProductSetOptions.length)}
                                            {filteredProductSetOptions.map(renderItem)}
                                        </CommandGroup>
                                    )}
                                    {visibleCount === 0 && (
                                        <div className="px-4 py-5 text-center text-sm text-gray-500">
                                            {query ? "No results found." : emptyLabel}
                                        </div>
                                    )}
                                    {(productSetCursor || productCursor) && (
                                        <div className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={handleLoadMore}
                                                disabled={isLoadingMore}
                                                className="w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isLoadingMore ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <Loader className="h-3.5 w-3.5 animate-spin" /> Loading...
                                                    </span>
                                                ) : (
                                                    "Load More"
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </ScrollArea>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
