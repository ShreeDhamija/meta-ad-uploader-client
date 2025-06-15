import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
// import {
//     Popover,
//     PopoverTrigger,
//     PopoverContent,
// } from "@/components/ui/popover"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,

} from "@/components/ui/command"
import { toast } from "sonner";
import { Download, CirclePlus } from "lucide-react";
import { RotateLoader } from "react-spinners";





export default function LinkParameters({ defaultLink, setDefaultLink, utmPairs, setUtmPairs, selectedAdAccount }) {
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
    const [importPreview, setImportPreview] = useState(null); // null or array of { key, value }
    const [showImportPopup, setShowImportPopup] = useState(false);
    const [isFetchingTags, setIsFetchingTags] = useState(false);


    // const handleImportUTMs = async () => {
    //     if (!selectedAdAccount) {
    //         toast.error("No ad account selected");
    //         return;
    //     }

    //     try {
    //         const res = await fetch(
    //             `https://meta-ad-uploader-server-production.up.railway.app/auth/fetch-recent-url-tags?adAccountId=${selectedAdAccount}`,
    //             { credentials: "include" }
    //         );
    //         const data = await res.json();

    //         if (data.pairs) {
    //             setImportPreview(data.pairs);
    //             setShowImportPopup(true);
    //         } else {
    //             toast.error("No UTM tags found in recent ad.");
    //         }
    //     } catch (err) {
    //         toast.error("Failed to fetch UTM tags");
    //         console.error("Import UTM error:", err);
    //     }
    // };
    const handleImportUTMs = async () => {
        if (!selectedAdAccount) {
            toast.error("No ad account selected");
            return;
        }

        setIsFetchingTags(true);
        setShowImportPopup(true);

        try {
            const res = await fetch(
                `https://meta-ad-uploader-server-production.up.railway.app/auth/fetch-recent-url-tags?adAccountId=${selectedAdAccount}`,
                { credentials: "include" }
            );
            const data = await res.json();

            if (data.pairs) {
                setImportPreview(data.pairs);
            } else {
                toast.error("No UTM tags found in recent ad.");
                setShowImportPopup(false);
            }
        } catch (err) {
            toast.error("Failed to fetch UTM tags");
            console.error("Import UTM error:", err);
            setShowImportPopup(false);
        } finally {
            setIsFetchingTags(false);
        }
    };


    return (
        <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-4 w-full max-w-3xl">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img
                        src="https://meta-ad-uploader-server-production.up.railway.app/icons/link.svg"
                        alt="link icon"
                        className="w-4 h-4 grayscale brightness-75 contrast-75 opacity-60"
                    />
                    <span className="text-sm font-medium">Link Parameters</span>
                </div>
                <Button
                    variant="ghost"
                    className="flex items-center text-xs rounded-xl px-3 py-1 bg-zinc-800 text-white hover:text-white hover:bg-black"
                    onClick={handleImportUTMs}
                >
                    <Download className="w-4 h-4" />
                    Import from Recent Ad
                </Button>

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
            {/* Add Button */}
            <div>
                <Button
                    onClick={handleAddPair}
                    className="bg-zinc-600 text-white w-full rounded-xl hover:bg-black mt-2 h-[40px]"
                >
                    Add New Pairing
                </Button>
            </div>

            {showImportPopup && (
                <div className="fixed inset-0 z-[9999] bg-black/30 flex justify-center items-center" style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}>
                    <div className="bg-white rounded-2xl max-h-[80vh] overflow-y-auto w-[600px] shadow-xl relative border border-gray-200">
                        <div className="sticky top-0 bg-white z-10 px-6 py-3 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-medium text-zinc-900">Import UTM Parameters</h2>
                                <Button
                                    className="bg-red-600 text-white rounded-xl px-3 py-1 hover:bg-red-700 text-sm flex items-center gap-1"
                                    onClick={() => {
                                        setShowImportPopup(false);
                                        setImportPreview(null);
                                    }}
                                >
                                    <CirclePlus className="w-4 h-4 rotate-45" />
                                    Close
                                </Button>
                            </div>
                        </div>

                        <div className="px-6 py-6">
                            {isFetchingTags ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                    <RotateLoader size={6} margin={-16} color="#adadad" />
                                    <span className="text-sm text-gray-600">Fetching parameters…</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500 mb-4">
                                        The following parameters were found in your most recent ad. Click “Import” to apply them.
                                    </p>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                        {importPreview?.map(({ key, value }, idx) => (
                                            <div key={idx} className="flex gap-3 items-center">
                                                <div className="flex-1 bg-gray-100 text-sm text-zinc-800 px-3 py-[10px] rounded-xl truncate">
                                                    {key}
                                                </div>
                                                <div className="flex-1 bg-gray-100 text-sm text-zinc-800 px-3 py-[10px] rounded-xl truncate">
                                                    {value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>


                                    <div className="flex justify-end mt-6">
                                        <Button
                                            className="bg-black text-white rounded-xl hover:bg-zinc-800 px-4"
                                            onClick={() => {
                                                setUtmPairs(importPreview);
                                                toast.success("Imported UTM parameters");
                                                setShowImportPopup(false);
                                            }}
                                        >
                                            Import
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}


        </div>
    )
}


