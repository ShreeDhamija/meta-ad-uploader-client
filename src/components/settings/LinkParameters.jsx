import { useState, useCallback, useMemo, memo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ChevronDown, X } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { toast } from "sonner";
import { Download, CirclePlus, Settings2, Loader } from "lucide-react";
import { RotateLoader } from "react-spinners";
import LinkIcon from '@/assets/icons/link.svg?react';

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

    // Modal States
    const [showLinkImportModal, setShowLinkImportModal] = useState(false)
    const [showUtmSetupModal, setShowUtmSetupModal] = useState(false)

    // Data/Fetching States
    const [linkImportPreview, setLinkImportPreview] = useState([])
    const [isFetchingLinks, setIsFetchingLinks] = useState(false)
    const [isFetchingUtms, setIsFetchingUtms] = useState(false)
    const [utmFetchError, setUtmFetchError] = useState(false)

    // Link Management States
    const [showAddForm, setShowAddForm] = useState(false)
    const [newLinkUrl, setNewLinkUrl] = useState("")
    const [linkDropdownOpen, setLinkDropdownOpen] = useState(false)
    const [rawUtmString, setRawUtmString] = useState("");
    const [selectedLinkIndex, setSelectedLinkIndex] = useState(null)
    const [tempUtmPairs, setTempUtmPairs] = useState([]);


    // 2. TEMP HANDLERS
    const handleTempPairChange = useCallback((index, field, value) => {
        setTempUtmPairs(prev => prev.map((pair, i) => i === index ? { ...pair, [field]: value } : pair))
    }, []);
    const handleAddTempPair = useCallback(() => setTempUtmPairs(prev => [...prev, { key: "", value: "" }]), []);
    const handleDeleteTempPair = useCallback((index) => setTempUtmPairs(prev => prev.filter((_, i) => i !== index)), []);


    // Show add form when no links exist
    useEffect(() => {
        setShowAddForm(links.length === 0);
    }, [links.length]);

    const selectedLink = useMemo(() => {
        if (links.length === 0) return null;
        if (selectedLinkIndex === null) {
            const defaultLink = links.find(link => link.isDefault);
            if (defaultLink) {
                const defaultIndex = links.indexOf(defaultLink);
                setSelectedLinkIndex(defaultIndex);
                return defaultLink;
            }
            setSelectedLinkIndex(0);
            return links[0];
        }
        if (selectedLinkIndex >= 0 && selectedLinkIndex < links.length) {
            return links[selectedLinkIndex];
        }
        setSelectedLinkIndex(0);
        return links[0];
    }, [links, selectedLinkIndex]);


    // --- Handlers: UTM Pairs ---
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


    // --- Handlers: Link Management ---
    const handleLinkSelect = useCallback((linkIndex) => {
        setSelectedLinkIndex(linkIndex);
        setLinkDropdownOpen(false);
    }, []);

    const handleImportLink = useCallback((linkUrl) => {
        if (links.some(link => link.url === linkUrl)) {
            toast.error("This link already exists");
            return;
        }
        const newLink = {
            url: linkUrl,
            isDefault: links.length === 0
        };
        setLinks(prev => [...prev, newLink]);
    }, [links, setLinks]);

    const handleImportAllLinks = useCallback((event) => {
        if (event) { event.stopPropagation(); event.preventDefault(); }

        const newLinks = [];
        for (const linkUrl of linkImportPreview) {
            if (!links.some(link => link.url === linkUrl)) {
                newLinks.push({
                    url: linkUrl,
                    isDefault: links.length === 0 && newLinks.length === 0
                });
            }
        }

        if (newLinks.length > 0) {
            setLinks(prev => [...prev, ...newLinks]);
        } else {
            toast.info("All links already exist");
        }
    }, [linkImportPreview, links, setLinks]);



    const handleAddNewLink = useCallback(() => {
        if (!newLinkUrl.trim()) {
            toast.error("Please enter a link URL");
            return;
        }
        if (links.some(link => link.url === newLinkUrl.trim())) {
            toast.error("This link already exists");
            return;
        }
        const newLink = {
            url: newLinkUrl.trim(),
            isDefault: links.length === 0
        };
        setLinks(prev => [...prev, newLink]);
        setSelectedLinkIndex(links.length);
        setNewLinkUrl("");
        setShowAddForm(false);
    }, [newLinkUrl, links, setLinks]);



    const handleSetAsDefault = useCallback(() => {
        if (!selectedLink || selectedLink.isDefault) return;
        setLinks(prev => prev.map((link, index) => ({
            ...link,
            isDefault: index === selectedLinkIndex
        })));
    }, [selectedLink, selectedLinkIndex, setLinks]);

    const handleDeleteLink = useCallback((linkUrl) => {
        const linkIndex = links.findIndex(l => l.url === linkUrl);
        if (linkIndex === -1) return;

        const linkToDelete = links[linkIndex];
        const updatedLinks = links.filter((_, index) => index !== linkIndex);

        if (linkToDelete.isDefault && updatedLinks.length > 0) {
            updatedLinks[0].isDefault = true;
        }
        setLinks(updatedLinks);
        if (selectedLinkIndex >= updatedLinks.length) {
            setSelectedLinkIndex(updatedLinks.length - 1);
        } else if (selectedLinkIndex > linkIndex) {
            setSelectedLinkIndex(selectedLinkIndex - 1);
        }
        setLinkDropdownOpen(false);
    }, [links, selectedLinkIndex, setLinks]);




    // --- API: Import Links Only ---
    const handleOpenLinkImport = useCallback(async () => {
        if (!selectedAdAccount) {
            toast.error("No ad account selected");
            return;
        }
        setIsFetchingLinks(true);
        setShowLinkImportModal(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/auth/fetch-recent-links?adAccountId=${selectedAdAccount}`,
                { credentials: "include" }
            );
            const data = await res.json();
            if (data.links) {
                setLinkImportPreview(data.links);
            } else {
                setLinkImportPreview([]);
            }
        } catch (err) {
            toast.error("Failed to fetch recent links");
            console.error("Link import error:", err);
        } finally {
            setIsFetchingLinks(false);
        }
    }, [selectedAdAccount]);


    // --- API: Setup UTMs (Fetch & Modal) ---
    // const handleOpenUtmSetup = useCallback(async () => {
    //     if (!selectedAdAccount) return;

    //     setShowUtmSetupModal(true);
    //     setIsFetchingUtms(true);

    //     // Copy current real settings to draft
    //     let currentPairs = utmPairs.length > 0 ? [...utmPairs] : [];
    //     setTempUtmPairs(currentPairs);

    //     try {
    //         const res = await fetch(`${API_BASE_URL}/auth/fetch-recent-utms?adAccountId=${selectedAdAccount}`, { credentials: "include" });
    //         const data = await res.json();

    //         if (data.pairs && data.pairs.length > 0) {
    //             setTempUtmPairs(data.pairs); // Update Draft
    //             setUtmFetchSuccess(true);
    //         } else if (currentPairs.length === 0) {
    //             setTempUtmPairs(DEFAULT_PREFILL_PAIRS); // Suggest Defaults in Draft
    //             setUtmFetchError(true);
    //         }
    //     } catch (err) {
    //         if (currentPairs.length === 0) setTempUtmPairs(DEFAULT_PREFILL_PAIRS);
    //     } finally {
    //         setIsFetchingUtms(false);
    //     }
    // }, [selectedAdAccount, utmPairs]);

    // --- API: Setup UTMs (Fetch & Modal) ---
    const handleOpenUtmSetup = useCallback(async () => {
        if (!selectedAdAccount) return;

        setShowUtmSetupModal(true);
        setIsFetchingUtms(true);
        setUtmFetchError(false); // Reset error state on open

        // Copy current real settings to draft
        let currentPairs = utmPairs.length > 0 ? [...utmPairs] : [];
        setTempUtmPairs(currentPairs);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/fetch-recent-utms?adAccountId=${selectedAdAccount}`, { credentials: "include" });
            const data = await res.json();

            if (data.pairs && data.pairs.length > 0) {
                setTempUtmPairs(data.pairs); // Update Draft
            } else if (currentPairs.length === 0) {
                setTempUtmPairs(DEFAULT_PREFILL_PAIRS); // Suggest Defaults in Draft
                setUtmFetchError(true);
            }
        } catch (err) {
            if (currentPairs.length === 0) setTempUtmPairs(DEFAULT_PREFILL_PAIRS);
        } finally {
            setIsFetchingUtms(false);
        }
    }, [selectedAdAccount, utmPairs]);

    const handleExtractUtms = useCallback(() => {
        if (!rawUtmString.trim()) return;
        const queryString = rawUtmString.includes('?') ? rawUtmString.split('?')[1] : rawUtmString;

        const newPairs = queryString.split('&')
            .filter(part => part.includes('='))
            .map(part => {
                const [key, ...valueParts] = part.split('=');
                return {
                    key: key.trim(),
                    value: valueParts.join('=').trim()
                };
            });

        if (newPairs.length > 0) {
            setTempUtmPairs(newPairs);
            setRawUtmString("");
            toast.success("UTMs extracted successfully");
        } else {
            toast.error("No valid UTM parameters found");
        }
    }, [rawUtmString, setTempUtmPairs]); // Update dependency here as well

    const handleSaveUtms = useCallback(() => {
        setUtmPairs(tempUtmPairs);
        setShowUtmSetupModal(false);
    }, [tempUtmPairs, setUtmPairs]);



    // Memoized filtered suggestions
    const filteredSuggestions = useMemo(() =>
        VALUE_SUGGESTIONS.filter(suggestion =>
            inputValue === "" || suggestion.toLowerCase().includes(inputValue.toLowerCase())
        ),
        [inputValue]
    )

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
                {/* Requirement 1: Only Import Links */}
                <Button
                    variant="ghost"
                    className="flex items-center text-xs rounded-xl px-3 py-1 bg-zinc-800 text-white hover:text-white hover:bg-black"
                    onClick={handleOpenLinkImport}
                >
                    <Download className="w-4 h-4" />
                    Import Links from Recent Ads
                </Button>
            </div>

            {/* Link Selection and Management (Unchanged) */}
            <div className="space-y-2">
                <div className="space-y-1">
                    <label className="text-sm font-semibold">Landing Page Links</label>
                    <p className="text-xs text-gray-500">
                        Add and set default links for your ads.
                    </p>
                </div>

                {links.length > 0 && <div className="flex gap-2 items-center">
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
                                        <span className="text-sm truncate max-w-[350px]">
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
                                            value={link.url}
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
                                                    handleDeleteLink(link.url);
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

                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-3 whitespace-nowrap"
                        disabled={!selectedLink || selectedLink.isDefault}
                        onClick={handleSetAsDefault}
                    >
                        Set as Default
                    </Button>
                </div>}

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
                        className="bg-zinc-600 text-white w-full rounded-xl hover:zinc-800 mt-2 h-[40px]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Link
                    </Button>
                )}
            </div>

            {/* Requirement 2: Set Up UTMs Button */}
            <div className="pt-4 border-t border-gray-200">
                <div className="space-y-1 mb-2">
                    <label className="text-sm font-semibold">UTM Parameters</label>
                    <p className="text-xs text-gray-500">
                        Configure tracking parameters for your links.
                    </p>
                </div>

                {/* Show summary if pairs exist, otherwise just button */}
                {utmPairs.length > 0 && (
                    <div className="mb-3">
                        <p className="text-xs font-semibold mb-1 text-zinc-700">Saved UTMs</p>
                        <div className="flex flex-wrap gap-2">
                            {utmPairs.map((pair, i) => (
                                pair.key && <span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded-md text-gray-600">
                                    {pair.key}={pair.value}
                                </span>
                            ))}
                        </div>

                    </div>
                )}


                <Button
                    onClick={handleOpenUtmSetup}
                    className="bg-zinc-600 text-white w-full rounded-xl hover:bg-zinc-800 mt-2 h-[40px]"
                >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Set Up UTMs
                </Button>
            </div>

            {/* --- MODAL 1: IMPORT LINKS (Modified to remove Tabs) --- */}
            {showLinkImportModal && (
                <div className="fixed inset-0 z-[9999] bg-black/30 flex justify-center items-center"
                    style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                    onClick={() => setShowLinkImportModal(false)}
                >
                    <div className="bg-white rounded-2xl max-h-[80vh] overflow-y-auto w-[600px] shadow-xl relative border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white z-10 px-6 py-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Import Recent Links</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-gray-100"
                                onClick={() => setShowLinkImportModal(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="p-6">
                            {isFetchingLinks ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                    <RotateLoader size={6} margin={-16} color="#adadad" />
                                    <span className="text-sm text-gray-600">Fetching links…</span>
                                </div>
                            ) : linkImportPreview.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm text-gray-500">
                                            Found {linkImportPreview.length} recent link{linkImportPreview.length > 1 ? 's' : ''}.
                                        </p>
                                        <Button
                                            className="bg-black text-white rounded-xl hover:bg-zinc-800 px-4"
                                            onClick={handleImportAllLinks}
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
                    </div>
                </div>
            )}

            {/* --- MODAL 2: UTM SETUP (New Requirement) --- */}
            {showUtmSetupModal && (
                <div className="fixed inset-0 z-[9999] bg-black/30 flex justify-center items-center"
                    style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                    onClick={() => setShowUtmSetupModal(false)}
                >
                    <div className="bg-white rounded-2xl max-h-[85vh] w-[600px] shadow-xl relative border border-gray-200 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-semibold">Configure UTMs</h3>
                                <p className="text-xs text-gray-500 mt-1">Manage your URL tracking parameters.</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-gray-100"
                                onClick={() => setShowUtmSetupModal(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            {/* Extract Section */}
                            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="text-xs font-semibold text-gray-600 block mb-2">Extract from String</label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Paste UTM string here eg: utm_source=facebook&utm_campaign={{campaign.name}}&utm_medium=paid&utm_content={{ad.name}}&utm_term={{adset.name}}"
                                        value={rawUtmString}
                                        onChange={(e) => setRawUtmString(e.target.value)}
                                        className="rounded-xl bg-white placeholder:text-xs h-9"
                                    />
                                    <Button
                                        onClick={handleExtractUtms}
                                        disabled={!rawUtmString}
                                        className="bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 whitespace-nowrap h-9"
                                    >
                                        Extract
                                    </Button>
                                </div>
                            </div>

                            {/* Requirement 6: Loading Spinner / Main Grid */}
                            {isFetchingUtms ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <RotateLoader size={6} margin={-16} color="#adadad" />
                                    <span className="text-sm text-gray-600">Looking for recent UTMs...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Requirement 5: No UTMs found label */}
                                    {!utmFetchError && (
                                        <div className="mb-4 p-3 bg-green-50 text-green-800 text-xs rounded-xl border border-green-100">
                                            We found these UTMs from your recent ads.
                                        </div>
                                    )}

                                    {/* Error/Default Label */}
                                    {utmFetchError && (
                                        <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-100">
                                            No recent UTMs found on Ad Account. Showing suggested default values.
                                        </div>
                                    )}


                                    <div className="flex flex-col space-y-3">
                                        {/* 1. Iterate over tempUtmPairs */}
                                        {tempUtmPairs.map((pair, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                {/* KEY INPUT */}
                                                <Input
                                                    placeholder="Key"
                                                    value={pair.key}
                                                    // 2. Use handleTempPairChange
                                                    onChange={(e) => handleTempPairChange(i, "key", e.target.value)}
                                                    className="rounded-xl flex-1 bg-white h-10"
                                                />

                                                {/* VALUE INPUT */}
                                                <div className="relative flex-1">
                                                    <Input
                                                        placeholder={`Value`}
                                                        value={pair.value}
                                                        // 3. Use handleTempPairChange
                                                        onChange={(e) => {
                                                            setInputValue(e.target.value)
                                                            handleTempPairChange(i, "value", e.target.value)
                                                        }}
                                                        onFocus={() => {
                                                            setInputValue("")
                                                            setOpenIndex(i)
                                                        }}
                                                        onBlur={() => {
                                                            setTimeout(() => setOpenIndex(null), 150)
                                                        }}
                                                        className="rounded-xl w-full bg-white h-10"
                                                    />
                                                    {openIndex === i && (
                                                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 p-2 max-h-[200px] overflow-hidden">
                                                            <Command className="h-full">
                                                                <CommandList className="max-h-[180px] overflow-y-auto">
                                                                    {filteredSuggestions.map((suggestion, index) => (
                                                                        <CommandItem
                                                                            key={index}
                                                                            value={suggestion}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                // 4. Use handleTempPairChange for suggestions
                                                                                handleTempPairChange(i, "value", suggestion)
                                                                                setOpenIndex(null)
                                                                            }}
                                                                            className="cursor-pointer px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
                                                                        >
                                                                            {suggestion}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandList>
                                                            </Command>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* DELETE BUTTON */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    // 5. Use handleDeleteTempPair
                                                    onClick={() => handleDeleteTempPair(i)}
                                                    className="hover:bg-red-50 rounded-full h-8 w-8 shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ADD BUTTON */}
                                    <Button
                                        // 6. Use handleAddTempPair
                                        onClick={handleAddTempPair}
                                        className="w-full rounded-xl mt-4 bg-zinc-800 text-white hover:bg-zinc-900 border-none shadow-none"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add New Parameter
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white rounded-b-2xl border-t border-gray-200">
                            <Button
                                className="w-full bg-black text-white rounded-xl hover:bg-zinc-800 h-10"
                                onClick={handleSaveUtms}
                            >
                                Save & Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(LinkParameters)