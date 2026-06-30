import { useEffect, useState, useCallback, memo } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, Loader, Target } from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const EVENT_ROWS = [
    {
        key: "websitePixelId",
        label: "Website Events",
        description: "Track website (offsite) conversions against the selected Meta Pixel.",
    },
    {
        key: "offlineDatasetId",
        label: "Offline Events",
        description: "Track offline conversions against the selected dataset.",
    },
];

// Single combobox for selecting a pixel/dataset (or none) for one event type.
const PixelSelect = memo(({ pixels, value, onChange, loading, placeholder }) => {
    const [open, setOpen] = useState(false)

    const selected = pixels.find(p => p.id === value)
    const displayText = selected
        ? (selected.name || selected.id)
        : (value ? value : "Select a pixel")

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={loading}
                    className="w-full justify-between rounded-2xl border border-gray-300 bg-white shadow-xs hover:bg-white px-3 py-4.5"
                >
                    {loading ? (
                        <span className="flex items-center gap-2 text-gray-500">
                            <Loader className="h-4 w-4 animate-spin" />
                            Fetching pixels...
                        </span>
                    ) : (
                        <span className={selected ? "" : "text-gray-500"}>{displayText}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                align="start"
                sideOffset={4}
                side="top"
                avoidCollisions={false}
                style={{
                    minWidth: "var(--radix-popover-trigger-width)",
                    width: "auto",
                }}
            >
                <Command filter={(value, search) => {
                    if (!search) return 1;
                    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                }}>
                    <CommandInput placeholder={placeholder || "Search pixels..."} className="bg-transparent" wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]" />
                    <CommandList className="max-h-[300px] overflow-y-auto rounded-2xl custom-scrollbar">
                        <CommandGroup>
                            {pixels.map((pixel) => (
                                <CommandItem
                                    key={pixel.id}
                                    value={`${pixel.name || ""} ${pixel.id}`}
                                    onSelect={() => { onChange(pixel.id); setOpen(false); }}
                                    className={`px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150 hover:bg-gray-100 ${value === pixel.id ? "bg-gray-100 font-semibold" : ""}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm">{pixel.name || pixel.id}</span>
                                        <span className="text-xs text-gray-400">{pixel.id}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
});

PixelSelect.displayName = 'PixelSelect';

function PixelTracking({ pixelTracking, setPixelTracking, selectedAdAccount }) {
    const [pixels, setPixels] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!selectedAdAccount) {
            setPixels([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const fetchPixels = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/fetch-pixels?adAccountId=${selectedAdAccount}`, {
                    credentials: "include",
                });
                const data = await res.json();
                if (!cancelled) {
                    setPixels(Array.isArray(data.pixels) ? data.pixels : []);
                }
            } catch (err) {
                console.error("Failed to fetch pixels:", err);
                if (!cancelled) setPixels([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchPixels();
        return () => { cancelled = true; };
    }, [selectedAdAccount]);

    const handleChange = useCallback((key, id) => {
        setPixelTracking(prev => ({ ...(prev || {}), [key]: id }));
    }, [setPixelTracking]);

    return (
        <div className="bg-[#f7f7f7] rounded-2xl p-4 space-y-4">
            <div className="flex items-start gap-2">
                <Target className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
                <div className="flex flex-col">
                    <h3 className="font-medium text-[14px] text-zinc-950">
                        Pixel Tracking
                    </h3>
                    <label className="text-xs text-gray-400">
                        Attach Website &amp; Offline conversion events to every ad you create
                    </label>
                </div>
            </div>

            {!loading && pixels.length === 0 && selectedAdAccount && (
                <p className="text-xs text-gray-400">
                    No pixels found on this ad account. You can still type a saved value, but nothing was returned by Meta.
                </p>
            )}

            <div className="space-y-4">
                {EVENT_ROWS.map((row) => (
                    <div key={row.key} className="space-y-1.5">
                        <div>
                            <p className="font-medium text-[14px]">{row.label}</p>
                            <p className="text-sm text-gray-400">{row.description}</p>
                        </div>
                        <PixelSelect
                            pixels={pixels}
                            value={pixelTracking?.[row.key] || null}
                            onChange={(id) => handleChange(row.key, id)}
                            loading={loading}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(PixelTracking);
