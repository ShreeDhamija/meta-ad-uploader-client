import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
    CommandEmpty,
} from "@/components/ui/command"



export default function LinkParameters({ defaultLink, setDefaultLink, utmPairs, setUtmPairs }) {
    const [inputValue, setInputValue] = useState("")
    const valueSuggestions = ["facebook", "paid", "{{campaign.id}}", "{{adset.id}}", "{{ad.id}}", "{{campaign.name}}", "{{adset.name}}", "{{ad.name}}", "{{placement}}", "{{site_source_name}}"]
    const [openIndex, setOpenIndex] = useState(null)

    const handlePairChange = (index, field, value) => {
        const updated = utmPairs.map((pair, i) =>
            i === index ? { ...pair, [field]: value } : pair
        )
        setUtmPairs(updated)
    }


    const handleAddPair = () => {
        setUtmPairs([...utmPairs, { key: "", value: "" }])
    }

    return (
        <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-4 w-full max-w-3xl">
            {/* Section Header */}
            <div className="flex items-center gap-2">
                <img
                    src="https://meta-ad-uploader-server-production.up.railway.app/icons/link.svg"
                    alt="link icon"
                    className="w-4 h-4 grayscale brightness-75 contrast-75 opacity-60"
                />
                <span className="text-sm font-medium">Link Parameters</span>
            </div>

            {/* Default Link */}
            <div className="space-y-1">
                <label className="text-sm font-semibold">Default Ad Landing Page Link</label>
                <p className="text-xs text-gray-500">
                    Your ads will lead to this link by default if not edited while posting
                </p>
                <Input
                    placeholder="Default link"
                    value={defaultLink}
                    onChange={(e) => setDefaultLink(e.target.value)}
                    className="rounded-xl bg-white"
                />
            </div>

            {/* UTM Parameters */}
            <div className="space-y-1 pt-2">
                <label className="text-sm font-semibold">UTM Parameters</label>
                <p className="text-xs text-gray-500">
                    We have pre filled your link parameters with the most commonly used values. You can delete or change them.
                </p>
            </div>

            {/* Key/Value Grid */}
            <div className="flex flex-col space-y-5">
                {utmPairs.map((pair, i) => {
                    const defaultPrefillPairs = [
                        { key: "utm_source", value: "facebook" },
                        { key: "utm_medium", value: "paid" },
                        { key: "utm_campaign", value: "{{campaign.name}}" },
                        { key: "utm_content", value: "{{ad.name}}" },
                        { key: "utm_term", value: "{{adset.name}}" }
                    ];

                    // ✅ Prefill logic: apply values to state only if not already set
                    if (pair.key === "" && i < defaultPrefillPairs.length && utmPairs[i].key !== defaultPrefillPairs[i].key) {
                        handlePairChange(i, "key", defaultPrefillPairs[i].key);
                    }
                    // if (pair.value === "" && i < defaultPrefillPairs.length && utmPairs[i].value !== defaultPrefillPairs[i].value) {
                    //     handlePairChange(i, "value", defaultPrefillPairs[i].value);
                    // }

                    return (
                        <div key={i} className="flex gap-2 items-center col-span-2 sm:col-span-1">
                            <Input
                                value={pair.key}
                                onChange={(e) => handlePairChange(i, "key", e.target.value)}
                                className="rounded-xl w-full bg-white"
                            />
                            <div className="relative w-full">

                                <Input
                                    placeholder={`Value ${i + 1}`}
                                    value={pair.value}
                                    onChange={(e) => {
                                        setInputValue(e.target.value)
                                        handlePairChange(i, "value", e.target.value)
                                    }}
                                    onFocus={() => {
                                        setInputValue("") // <-- resets so everything shows on click
                                        setOpenIndex(i)
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setOpenIndex(null), 150)
                                    }}
                                    className="rounded-xl w-full bg-white"
                                />

                                {openIndex === i && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-md mt-1 p-2">
                                        <Command className="max-h-full">
                                            <CommandList>
                                                {valueSuggestions
                                                    .filter((suggestion) =>
                                                        inputValue === "" || suggestion.toLowerCase().includes(inputValue.toLowerCase())
                                                    )
                                                    .map((suggestion, index) => (
                                                        <CommandItem
                                                            key={index}
                                                            value={suggestion}
                                                            onMouseDown={() => {
                                                                handlePairChange(i, "value", suggestion)
                                                                setOpenIndex(null)
                                                            }}
                                                            className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-lg"
                                                        >
                                                            {suggestion}
                                                        </CommandItem>
                                                    ))}

                                            </CommandList>
                                        </Command>
                                    </div>
                                )}
                            </div>

                            <Trash2
                                onClick={() => {
                                    const updated = [...utmPairs];
                                    updated.splice(i, 1);
                                    setUtmPairs(updated);
                                }}
                                className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer shrink-0"
                            />
                        </div>
                    );
                })}
            </div>

            {/* <div className="flex flex-col space-y-5">
                {utmPairs.map((pair, i) => (
                    <div key={i} className="flex gap-2 items-center col-span-2 sm:col-span-1">
                        <Input
                            value={pair.key === "" && i < defaultPrefillPairs.length ? defaultPrefillPairs[i].key : pair.key}
                            onChange={(e) => handlePairChange(i, "key", e.target.value)}
                            className="rounded-xl w-full bg-white"
                        />
                        <div className="relative w-full">
                            <Input
                                value={pair.value === "" && i < defaultPrefillPairs.length ? defaultPrefillPairs[i].value : pair.value}
                                onChange={(e) => handlePairChange(i, "value", e.target.value)}
                                onFocus={() => setOpenIndex(i)}
                                onBlur={() => {
                                    setTimeout(() => setOpenIndex(null), 150);
                                }}
                                className="rounded-xl w-full bg-white"
                            />
                            {openIndex === i && (
                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-md mt-1 p-2">
                                    <Command className="max-h-full">
                                        <CommandList>
                                            {valueSuggestions.map((suggestion, index) => (
                                                <CommandItem
                                                    className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-lg"
                                                    key={index}
                                                    value={suggestion}
                                                    onMouseDown={() => {
                                                        handlePairChange(i, "value", suggestion)
                                                        setOpenIndex(null)
                                                    }}
                                                >
                                                    {suggestion}
                                                </CommandItem>
                                            ))}
                                        </CommandList>
                                    </Command>
                                </div>
                            )}
                        </div>

                        <Trash2
                            onClick={() => {
                                const updated = [...utmPairs]
                                updated.splice(i, 1)
                                setUtmPairs(updated)
                            }}
                            className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer shrink-0"
                        />
                    </div>

                ))}
            </div> */}

            {/* Add Button */}
            <div>
                <Button
                    onClick={handleAddPair}
                    className="bg-zinc-600 text-white w-full rounded-xl hover:bg-black mt-2 h-[40px]"
                >
                    Add New Pairing
                </Button>
            </div>
        </div>
    )
}


