import { useState, useCallback, useMemo, memo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ChevronDown } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { toast } from "sonner";
import { Download, CirclePlus } from "lucide-react";
import { RotateLoader } from "react-spinners";
import LinkIcon from '@/assets/icons/link.svg?react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


// Move constants outside component
const VALUE_SUGGESTIONS = ["facebook", "paid", "{{campaign.id}}", "{{adset.id}}", "{{ad.id}}", "{{campaign.name}}", "{{adset.name}}", "{{ad.name}}", "{{placement}}", "{{site_source_name}}"];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const DEFAULT_PREFILL_PAIRS = [
    { key: "utm_source", value: "facebook" },
    { key: "utm_medium", value: "paid" },
    { key: "utm_campaign", value: "{{campaign.name}}" },
    { key: "utm_content", value: "{{ad.name}}" },
    { key: "utm_term", value: "{{adset.name}}" }
];

function LinkParameters({ links, setLinks, utmPairs, setUtmPairs, selectedAdAccount }) {
    const [inputValue, setInputValue] = useState("")
    const [openIndex, setOpenIndex] = useState(null)
    const [importPreview, setImportPreview] = useState(null)
    const [linkImportPreview, setLinkImportPreview] = useState([])
    const [showImportPopup, setShowImportPopup] = useState(false)
    const [isFetchingTags, setIsFetchingTags] = useState(false)

    // Frontend-only states for link management
    const [showAddForm, setShowAddForm] = useState(false)
    const [newLinkUrl, setNewLinkUrl] = useState("")
    const [linkDropdownOpen, setLinkDropdownOpen] = useState(false)
    const [rawUtmString, setRawUtmString] = useState("");
    const [selectedLinkIndex, setSelectedLinkIndex] = useState(null)



    // Show add form when no links exist
    useEffect(() => {
        setShowAddForm(links.length === 0);
    }, [links.length]);

    // }, [links, selectedLinkIndex]);
    const selectedLink = useMemo(() => {
        if (links.length === 0) return null;

        // First priority: Find and use default link if no explicit selection has been made
        if (selectedLinkIndex === null) {
            const defaultLink = links.find(link => link.isDefault);
            if (defaultLink) {
                const defaultIndex = links.indexOf(defaultLink);
                setSelectedLinkIndex(defaultIndex);
                return defaultLink;
            }
            // If no default, use first link
            setSelectedLinkIndex(0);
            return links[0];
        }

        // If selectedIndex is valid, use it
        if (selectedLinkIndex >= 0 && selectedLinkIndex < links.length) {
            return links[selectedLinkIndex];
        }

        // Fallback if index is somehow invalid
        setSelectedLinkIndex(0);
        return links[0];
    }, [links, selectedLinkIndex]);


    // Memoized handlers for UTM pairs
    const handlePairChange = useCallback((index, field, value) => {
        setUtmPairs(prev => prev.map((pair, i) =>
            i === index ? { ...pair, [field]: value } : pair
        ))
    }, [setUtmPairs])

    const handleAddPair = useCallback(() => {
        setUtmPairs(prev => [...prev, { key: "", value: "" }])
    }, [setUtmPairs])

    const handleDeletePair = useCallback((index) => {
        setUtmPairs(prev => prev.filter((_, i) => i !== index))
    }, [setUtmPairs])

    // New handlers for link management
    const handleLinkSelect = useCallback((linkIndex) => {
        setSelectedLinkIndex(linkIndex);
        setLinkDropdownOpen(false);
    }, []);

    // Add after handleImportConfirm
    const handleImportLink = useCallback((linkUrl) => {
        // Check if link already exists

        if (links.some(link => link.url === linkUrl)) {
            toast.error("This link already exists");
            return;
        }

        const newLink = {
            url: linkUrl,
            isDefault: links.length === 0
        };

        setLinks(prev => [...prev, newLink]);
        // toast.success("Link imported successfully");
    }, [links, setLinks]);

    const handleImportAllLinks = useCallback((event) => {

        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const newLinks = [];
        let addedCount = 0;

        for (const linkUrl of linkImportPreview) {
            if (!links.some(link => link.url === linkUrl)) {
                newLinks.push({
                    url: linkUrl,
                    isDefault: links.length === 0 && newLinks.length === 0
                });
                addedCount++;
            }
        }

        if (newLinks.length > 0) {
            setLinks(prev => [...prev, ...newLinks]);
            // toast.success(`Imported ${addedCount} link${addedCount > 1 ? 's' : ''}`);
        } else {
            toast.info("All links already exist");
        }
    }, [linkImportPreview, links, setLinks]);


    const handleAddNewLink = useCallback(() => {
        if (!newLinkUrl.trim()) {
            toast.error("Please enter a link URL");
            return;
        }

        // Check for duplicate URLs
        if (links.some(link => link.url === newLinkUrl.trim())) {
            toast.error("This link already exists");
            return;
        }

        const newLink = {
            url: newLinkUrl.trim(),
            isDefault: links.length === 0 // First link becomes default
        };

        setLinks(prev => [...prev, newLink]);
        setSelectedLinkIndex(links.length); // Select the newly added link

        // Reset form
        setNewLinkUrl("");
        setShowAddForm(false);

        // toast.success("Link added successfully");
    }, [newLinkUrl, links, setLinks]);

    const handleSetAsDefault = useCallback(() => {
        if (!selectedLink || selectedLink.isDefault) return;

        setLinks(prev => prev.map((link, index) => ({
            ...link,
            isDefault: index === selectedLinkIndex
        })));

        // toast.success("Default link updated");
    }, [selectedLink, selectedLinkIndex, setLinks]);



    const handleImportUTMs = useCallback(async () => {
        if (!selectedAdAccount) {
            toast.error("No ad account selected");
            return;
        }

        setIsFetchingTags(true);
        setShowImportPopup(true);

        try {
            const res = await fetch(
                `${API_BASE_URL}/auth/fetch-recent-url-tags?adAccountId=${selectedAdAccount}`,
                { credentials: "include" }
            );
            const data = await res.json();

            if (data.pairs) {
                setImportPreview(data.pairs);
            }

            if (data.links) {
                setLinkImportPreview(data.links);
            }

            if (!data.pairs && !data.links) {
                toast.error("No UTM tags or links found in recent ads.");
                setShowImportPopup(false);
            }
        } catch (err) {
            toast.error("Failed to fetch UTM tags and links");
            console.error("Import error:", err);
            // setShowImportPopup(false);
        } finally {
            setIsFetchingTags(false);
        }
    }, [selectedAdAccount])


    const handleExtractUtms = useCallback(() => {
        if (!rawUtmString.trim()) return;

        // Handle if user pastes full URL (split by ?) or just the query string
        const queryString = rawUtmString.includes('?') ? rawUtmString.split('?')[1] : rawUtmString;

        const newPairs = queryString.split('&')
            .filter(part => part.includes('=')) // Ensure valid pair
            .map(part => {
                const [key, ...valueParts] = part.split('=');
                // Join rest in case value contains '='
                return {
                    key: key.trim(),
                    value: valueParts.join('=').trim()
                };
            });

        if (newPairs.length > 0) {
            setUtmPairs(newPairs);
            setRawUtmString("");
            toast.success("UTMs extracted successfully");
        } else {
            toast.error("No valid UTM parameters found");
        }
    }, [rawUtmString, setUtmPairs]);


    const handleCloseImportPopup = useCallback(() => {
        setShowImportPopup(false);
        setImportPreview(null);
    }, [])

    const handleImportConfirm = useCallback((event) => {


        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }



        setUtmPairs(importPreview);
        toast.success("Imported UTM parameters");
        // setShowImportPopup(false);
    }, [importPreview, setUtmPairs])

    // Memoized filtered suggestions
    const filteredSuggestions = useMemo(() =>
        VALUE_SUGGESTIONS.filter(suggestion =>
            inputValue === "" || suggestion.toLowerCase().includes(inputValue.toLowerCase())
        ),
        [inputValue]
    )

    // Add this function after handleSetAsDefault:
    const handleDeleteLink = useCallback((linkUrl) => {
        const linkIndex = links.findIndex(l => l.url === linkUrl);
        if (linkIndex === -1) return;

        const linkToDelete = links[linkIndex];
        const updatedLinks = links.filter((_, index) => index !== linkIndex);

        // If we're deleting the default link, make the first remaining link default
        if (linkToDelete.isDefault && updatedLinks.length > 0) {
            updatedLinks[0].isDefault = true;
        }

        setLinks(updatedLinks);

        // Update selected index
        if (selectedLinkIndex >= updatedLinks.length) {
            setSelectedLinkIndex(updatedLinks.length - 1);
        } else if (selectedLinkIndex > linkIndex) {
            setSelectedLinkIndex(selectedLinkIndex - 1);
        }

        setLinkDropdownOpen(false);
    }, [links, selectedLinkIndex, setLinks]);

    return (
        <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-3 w-full max-w-3xl">
            {/* Section Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <LinkIcon
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

            {/* Link Selection and Management */}
            <div className="space-y-2">
                <div className="space-y-1">
                    <label className="text-sm font-semibold">Ad Landing Page Links</label>
                    <p className="text-xs text-gray-500">
                        Add and set default links for your ads.
                    </p>
                </div>

                {/* Link Dropdown */}
                <div className="flex gap-2 items-center">
                    <Popover open={linkDropdownOpen} onOpenChange={setLinkDropdownOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="flex-1 justify-between rounded-xl bg-white hover:bg-white"
                                disabled={links.length === 0}
                            >
                                {selectedLink ? (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-sm truncate max-w-[300px]">
                                            {selectedLink.url}
                                        </span>
                                        {selectedLink.isDefault && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    "No links available"
                                )}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto min-w-[--radix-popover-trigger-width] max-w-[700px] p-0 bg-white shadow-lg rounded-2xl"
                            align="start"
                            sideOffset={5}
                        >
                            <Command>
                                <CommandList className="max-h-[500px] overflow-y-auto p-1">
                                    {links.map((link, index) => (
                                        <CommandItem
                                            key={link.url}
                                            value={link.url} // CHANGE: Use URL instead of index.toString()
                                            onSelect={() => handleLinkSelect(index)}
                                            className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-xl m-1 group relative"
                                        >
                                            <div className="flex items-center justify-between w-full pr-6">
                                                <div className="flex items-center min-w-0 flex-1">
                                                    <span className="text-sm truncate max-w-[500px]" title={link.url}>
                                                        {link.url}
                                                    </span>
                                                    {link.isDefault && (
                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg whitespace-nowrap flex-shrink-0">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="absolute right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 rounded flex-shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDeleteLink(link.url); // CHANGE: Pass link.url instead of index
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                            </button>
                                        </CommandItem>
                                    ))}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* Set as Default Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-3 whitespace-nowrap"
                        disabled={!selectedLink || selectedLink.isDefault}
                        onClick={handleSetAsDefault}
                    >
                        Set as Default
                    </Button>
                </div>

                {/* Add New Link Form */}
                {showAddForm ? (
                    <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-3">
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter Link URL"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleAddNewLink}
                                className="bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                                size="sm"
                            >
                                Add Link
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewLinkUrl("");
                                }}
                                variant="outline"
                                className="rounded-xl"
                                size="sm"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={() => setShowAddForm(true)}
                        className="bg-zinc-600 text-white w-full rounded-xl hover:bg-black mt-2 h-[40px]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Link
                    </Button>
                )}
            </div>

            {/* UTM Parameters */}
            <div className="space-y-1 pt-2">
                <label className="text-sm font-semibold">UTM Parameters</label>
                <p className="text-xs text-gray-500">
                    We have pre filled your link parameters with some commonly used values.<br></br> You can edit them in the column, or paste your existing string of UTMs and we will extract the values.
                </p>
            </div>

            <div className="flex gap-2 items-center py-2">
                <Input
                    placeholder="Enter UTM string here eg: utm_source=facebook&utm_campaign={{campaign.name}}&utm_medium=paid&utm_content={{ad.name}}&utm_term={{adset.name}}"
                    value={rawUtmString}
                    onChange={(e) => setRawUtmString(e.target.value)}
                    className="rounded-xl bg-white placeholder:text-xs"
                />
                <Button
                    onClick={handleExtractUtms}
                    disabled={!rawUtmString}
                    className="bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 whitespace-nowrap "
                >

                    Extract UTMs
                </Button>
            </div>


            {/* Key/Value Grid */}
            <div className="flex flex-col space-y-5">
                {utmPairs.map((pair, i) => {
                    // Prefill logic
                    if (pair.key === "" && i < DEFAULT_PREFILL_PAIRS.length && utmPairs[i].key !== DEFAULT_PREFILL_PAIRS[i].key) {
                        handlePairChange(i, "key", DEFAULT_PREFILL_PAIRS[i].key);
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
                                        setInputValue("")
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
                                                {filteredSuggestions.map((suggestion, index) => (
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
                                onClick={() => handleDeletePair(i)}
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
                    + Add New Pairing
                </Button>
            </div>
            {showImportPopup && (
                <div className="fixed inset-0 z-[9999] bg-black/30 flex justify-center items-center" style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                    onClick={handleCloseImportPopup} // Add this line
                >
                    <div className="bg-white rounded-2xl max-h-[80vh] overflow-y-auto w-[600px] shadow-xl relative border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white z-10 px-6 py-6 border-b border-gray-200">
                            <Tabs defaultValue="links">
                                <div className="flex items-center justify-between">
                                    <TabsList className="grid w-fit grid-cols-2 rounded-full">
                                        <TabsTrigger value="links" className="rounded-full">Links</TabsTrigger>
                                        <TabsTrigger value="utms" className="rounded-full">UTMs</TabsTrigger>
                                    </TabsList>

                                    <Button
                                        className="bg-red-600 hover:bg-red-700 !shadow-none rounded-xl"
                                        onClick={handleCloseImportPopup}
                                    >

                                        <CirclePlus className="w-4 h-4 rotate-45 text-white" />
                                        <p className="text-white">Close</p>
                                    </Button>
                                </div>

                                <div>
                                    <TabsContent value="links">
                                        <div>
                                            {isFetchingTags ? (
                                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                                    <RotateLoader size={6} margin={-16} color="#adadad" />
                                                    <span className="text-sm text-gray-600">Fetching links…</span>
                                                </div>
                                            ) : linkImportPreview.length > 0 ? (
                                                <>
                                                    <div className="flex items-center justify-between mb-4 mt-4">
                                                        <p className="text-sm text-gray-500">
                                                            Found {linkImportPreview.length} recent link{linkImportPreview.length > 1 ? 's' : ''} from your ads.
                                                        </p>
                                                        <Button
                                                            className="bg-black text-white rounded-xl hover:bg-zinc-800 px-4"
                                                            onClick={(event) => handleImportAllLinks(event)}

                                                        >
                                                            Import All
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                                                        {linkImportPreview.map((linkUrl, idx) => {
                                                            const alreadyExists = links.some(link => link.url === linkUrl);
                                                            return (
                                                                <div key={idx} className="flex gap-3 items-center">
                                                                    <div className={`flex-1 bg-gray-100 text-sm px-3 py-[10px] rounded-xl truncate ${alreadyExists ? 'opacity-50' : 'text-zinc-800'}`}>
                                                                        {linkUrl}
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="rounded-xl"
                                                                        variant={alreadyExists ? "outline" : "default"}
                                                                        disabled={alreadyExists}
                                                                        onClick={() => handleImportLink(linkUrl)}
                                                                    >
                                                                        {alreadyExists ? "Exists" : "Import"}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-10 text-center">
                                                    <p className="text-sm text-gray-500">No recent links found in your ads.</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="utms">
                                        <div> {/* Add padding here */}
                                            {isFetchingTags ? (
                                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                                    <RotateLoader size={6} margin={-16} color="#adadad" />
                                                    <span className="text-sm text-gray-600">Fetching parameters…</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-4 mt-4"> {/* Add this div */}
                                                        <p className="text-sm text-gray-500">
                                                            The following parameters were found in your most recent ad.
                                                        </p>
                                                        <Button
                                                            className=" bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-4"
                                                            onClick={(event) => handleImportConfirm(event)}
                                                        >
                                                            Import
                                                        </Button>
                                                    </div>

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

                                                </>
                                            )}
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(LinkParameters)