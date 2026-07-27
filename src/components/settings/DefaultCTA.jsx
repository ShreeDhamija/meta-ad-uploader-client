
import { memo, useMemo, useState, useCallback } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown } from "lucide-react"
import CTAIcon from '@/assets/icons/cta.svg?react';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// Move constants outside component to prevent recreation on every render
const CTA_OPTIONS = [
    { label: "Learn More", value: "LEARN_MORE" },
    { label: "Shop Now", value: "SHOP_NOW" },
    { label: "Sign Up", value: "SIGN_UP" },
    { label: "Apply Now", value: "APPLY_NOW" },
    { label: "Download", value: "DOWNLOAD" },
    { label: "Get Offer", value: "GET_OFFER" },
    { label: "Contact Us", value: "CONTACT_US" },
    { label: "Book Now", value: "BOOK_NOW" },
    { label: "Subscribe", value: "SUBSCRIBE" },
    { label: "See More", value: "SEE_MORE" },
    { label: "Install Now", value: "INSTALL_MOBILE_APP" },
    { label: "Call Now", value: "CALL_NOW" },
    { label: "See Details", value: "SEE_DETAILS" },
    { label: "Listen Now", value: "LISTEN_NOW" },
    { label: "Watch More", value: "WATCH_MORE" },
    { label: "Get Quote", value: "GET_QUOTE" },
];

function DefaultCTA({ defaultCTA, setDefaultCTA }) {
    const [open, setOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")

    const selectedLabel = useMemo(
        () => CTA_OPTIONS.find((cta) => cta.value === defaultCTA)?.label || "",
        [defaultCTA]
    );

    const filteredCTAs = useMemo(() => {
        if (!searchValue) return CTA_OPTIONS;
        const lowerSearchValue = searchValue.toLowerCase();
        return CTA_OPTIONS.filter((cta) =>
            cta.label.toLowerCase().includes(lowerSearchValue)
        );
    }, [searchValue]);

    const handleSelect = useCallback((value) => {
        setDefaultCTA(value);
        setOpen(false);
        setSearchValue("");
    }, [setDefaultCTA]);

    return (
        <div className="p-4 bg-[#f5f5f5] rounded-2xl space-y-4 w-full max-w-3xl">
            {/* Section Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <CTAIcon
                        alt="CTA icon"
                        className="w-4 h-4 grayscale brightness-75 contrast-75 opacity-60"
                    />
                    <span className="text-sm font-medium">Default CTA</span>
                </div>
                <p className="text-gray-500 text-[12px] font-regular">
                    Your ads will use this CTA by default if not edited while posting
                </p>
            </div>

            {/* Dropdown */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between rounded-2xl border border-gray-300 bg-white shadow hover:bg-white px-3 py-4.5 text-sm font-normal"
                    >
                        <span className="truncate">{selectedLabel}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                    align="start"
                    sideOffset={4}
                    side="bottom"
                    avoidCollisions={false}
                    style={{
                        minWidth: "var(--radix-popover-trigger-width)",
                        width: "auto",
                    }}
                >
                    <Command filter={() => 1} loop={false} value="">
                        <CommandInput
                            placeholder="Search CTAs..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                            className="bg-transparent"
                            wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                        />
                        <CommandList className="max-h-[400px] overflow-y-auto rounded-2xl custom-scrollbar" selectOnFocus={false}>
                            <CommandGroup>
                                {filteredCTAs.map((cta) => (
                                    <CommandItem
                                        key={cta.value}
                                        value={cta.value}
                                        onSelect={() => handleSelect(cta.value)}
                                        className={`
                                        px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150
                                        hover:bg-gray-100
                                        ${defaultCTA === cta.value ? "bg-gray-100 font-semibold" : ""}
                                        `}
                                        data-selected={cta.value === defaultCTA}
                                    >
                                        {cta.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default memo(DefaultCTA);
