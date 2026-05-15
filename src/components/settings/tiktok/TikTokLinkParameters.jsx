import { useState, useCallback, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ChevronDown, X, Download, Settings2, Loader, Link as LinkIcon } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// TikTok-specific macro tokens
const VALUE_SUGGESTIONS = [
    "tiktok",
    "paid",
    "{{campaign.name}}",
    "{{adgroup.name}}",
    "{{ad.name}}",
    "{{placement}}"
];

const DEFAULT_PREFILL_PAIRS = [
    { key: "utm_source", value: "tiktok" },
    { key: "utm_medium", value: "paid" },
    { key: "utm_campaign", value: "{{campaign.name}}" },
    { key: "utm_content", value: "{{ad.name}}" }
];

export default function TikTokLinkParameters({ 
    links = [], 
    setLinks, 
    utmPairs = [], 
    setUtmPairs, 
    advertiserId,
    thirdPartyTrackingUrl = "",
    setThirdPartyTrackingUrl
}) {
    const [inputValue, setInputValue] = useState("")
    const [linkDropdownOpen, setLinkDropdownOpen] = useState(false)
    const [selectedLinkIndex, setSelectedLinkIndex] = useState(null)
    
    // Modal/Fetch States
    const [showLinkImportModal, setShowLinkImportModal] = useState(false)
    const [showUtmSetupModal, setShowUtmSetupModal] = useState(false)
    const [isFetchingLinks, setIsFetchingLinks] = useState(false)
    const [isFetchingUtms, setIsFetchingUtms] = useState(false)
    const [linkImportPreview, setLinkImportPreview] = useState([])
    
    // Add Link Form
    const [showAddForm, setShowAddForm] = useState(false)
    const [newLinkUrl, setNewLinkUrl] = useState("")
    
    // UTM Setup States
    const [tempUtmPairs, setTempUtmPairs] = useState([])
    const [rawUtmString, setRawUtmString] = useState("")

    const tiktokHeaders = useCallback(() => {
        const uid = localStorage.getItem('tiktok_uid');
        const token = localStorage.getItem('tiktok_token');
        return {
            ...(uid && { 'x-tiktok-user-id': uid }),
            ...(token && { 'x-tiktok-token': token }),
        };
    }, []);

    const selectedLink = useMemo(() => {
        if (!links || links.length === 0) return null;
        if (selectedLinkIndex === null || selectedLinkIndex >= links.length) {
            const defIndex = links.findIndex(l => l.isDefault);
            const index = defIndex !== -1 ? defIndex : 0;
            return links[index];
        }
        return links[selectedLinkIndex];
    }, [links, selectedLinkIndex]);

    const handleLinkSelect = (index) => {
        setSelectedLinkIndex(index);
        setLinkDropdownOpen(false);
    };

    const handleAddNewLink = () => {
        if (!newLinkUrl.trim()) return;
        if (links.some(l => l.url === newLinkUrl.trim())) {
            toast.error("Link already exists");
            return;
        }
        const newLink = { url: newLinkUrl.trim(), isDefault: links.length === 0 };
        setLinks([...links, newLink]);
        setNewLinkUrl("");
        setShowAddForm(false);
    };

    const handleDeleteLink = (url) => {
        const updated = links.filter(l => l.url !== url);
        if (updated.length > 0 && links.find(l => l.url === url)?.isDefault) {
            updated[0].isDefault = true;
        }
        setLinks(updated);
    };

    const handleSetAsDefault = () => {
        if (!selectedLink) return;
        setLinks(links.map((l, i) => ({
            ...l,
            isDefault: i === selectedLinkIndex
        })));
    };

    const handleOpenLinkImport = async () => {
        if (!advertiserId) return;
        setShowLinkImportModal(true);
        setIsFetchingLinks(true);
        try {
            // We use the same ads fetch but extract links
            const res = await fetch(`${API_BASE_URL}/api/tiktok/fetch-recent-utms?advertiserId=${advertiserId}`, {
                headers: tiktokHeaders()
            });
            const data = await res.json();
            // The route currently returns 'pairs'. I'll need to update it to return 'links' too.
            // For now, I'll assume it returns links.
            setLinkImportPreview(data.links || []);
        } catch (err) {
            toast.error("Failed to fetch recent links");
        } finally {
            setIsFetchingLinks(false);
        }
    };

    const handleOpenUtmSetup = async () => {
        setShowUtmSetupModal(true);
        setTempUtmPairs(utmPairs.length > 0 ? [...utmPairs] : DEFAULT_PREFILL_PAIRS);
        if (!advertiserId) return;
        
        setIsFetchingUtms(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tiktok/fetch-recent-utms?advertiserId=${advertiserId}`, {
                headers: tiktokHeaders()
            });
            const data = await res.json();
            if (data.pairs && data.pairs.length > 0) {
                setTempUtmPairs(data.pairs);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingUtms(false);
        }
    };

    const handleExtractUtms = () => {
        if (!rawUtmString) return;
        const query = rawUtmString.includes('?') ? rawUtmString.split('?')[1] : rawUtmString;
        const pairs = query.split('&').filter(p => p.includes('=')).map(p => {
            const [k, v] = p.split('=');
            return { key: decodeURIComponent(k), value: decodeURIComponent(v) };
        });
        if (pairs.length > 0) {
            setTempUtmPairs(pairs);
            setRawUtmString("");
            toast.success("Extracted UTMs");
        }
    };

    return (
        <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Destination Settings</span>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-tight bg-zinc-800 text-white hover:bg-black hover:text-white"
                    onClick={handleOpenLinkImport}
                >
                    <Download className="w-3 h-3 mr-1.5" />
                    Import Links
                </Button>
            </div>

            {/* Link Selector */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">Landing Page Links</label>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700 p-0"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "Cancel" : "+ Add Link"}
                    </Button>
                </div>

                {showAddForm && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                        <Input 
                            placeholder="https://myshop.com/product"
                            value={newLinkUrl}
                            onChange={e => setNewLinkUrl(e.target.value)}
                            className="h-9 rounded-xl text-xs"
                        />
                        <Button size="sm" className="h-9 rounded-xl px-4 bg-black text-white" onClick={handleAddNewLink}>
                            Add
                        </Button>
                    </div>
                )}

                {links.length > 0 && (
                    <div className="flex gap-2">
                        <Popover open={linkDropdownOpen} onOpenChange={setLinkDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="flex-1 justify-between h-11 rounded-2xl border-gray-200 bg-white shadow-sm px-4">
                                    <span className="truncate text-sm font-medium">{selectedLink?.url || "Select a link"}</span>
                                    <ChevronDown className="w-4 h-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white rounded-2xl shadow-xl border-gray-100">
                                <Command>
                                    <CommandList className="max-h-[300px]">
                                        {links.map((l, i) => (
                                            <CommandItem 
                                                key={l.url} 
                                                onSelect={() => handleLinkSelect(i)}
                                                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                                            >
                                                <span className="text-xs truncate max-w-[80%]">{l.url}</span>
                                                <div className="flex items-center gap-1">
                                                    {l.isDefault && <span className="text-[8px] font-bold uppercase bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Default</span>}
                                                    <Trash2 
                                                        className="w-3 h-3 text-gray-300 hover:text-red-500 transition-colors" 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteLink(l.url); }}
                                                    />
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className={cn("h-11 w-11 rounded-2xl border-gray-200", selectedLink?.isDefault ? "bg-blue-50 text-blue-500 border-blue-100" : "bg-white")}
                            disabled={!selectedLink || selectedLink.isDefault}
                            onClick={handleSetAsDefault}
                        >
                            <Settings2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* UTMs & Tracking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">UTM Parameters</label>
                    <Button 
                        variant="outline" 
                        className="w-full h-11 rounded-2xl border-gray-200 bg-white justify-between px-4 font-medium"
                        onClick={handleOpenUtmSetup}
                    >
                        <span className="text-sm">{utmPairs.length > 0 ? `${utmPairs.length} Parameters Active` : "Configure UTMs"}</span>
                        <Settings2 className="w-4 h-4 opacity-50" />
                    </Button>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">3rd Party Tracking</label>
                    <Input 
                        placeholder="Pixel ID or Tracking URL"
                        value={thirdPartyTrackingUrl}
                        onChange={e => setThirdPartyTrackingUrl(e.target.value)}
                        className="h-11 rounded-2xl border-gray-200 bg-white shadow-sm text-sm"
                    />
                </div>
            </div>

            {/* UTM Setup Modal */}
            {showUtmSetupModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 tracking-tight">Configure UTMs</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">TikTok Ad Parameters</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowUtmSetupModal(false)} className="rounded-full">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-700">Quick Extract</label>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Paste a link with UTMs to auto-extract..."
                                        value={rawUtmString}
                                        onChange={e => setRawUtmString(e.target.value)}
                                        className="h-10 rounded-xl text-xs"
                                    />
                                    <Button variant="outline" className="h-10 rounded-xl px-4 border-gray-200" onClick={handleExtractUtms}>
                                        Extract
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-700">Parameter Mapping</label>
                                    {isFetchingUtms && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
                                </div>
                                
                                <div className="space-y-2">
                                    {tempUtmPairs.map((pair, idx) => (
                                        <div key={idx} className="flex gap-2 items-center group">
                                            <Input 
                                                placeholder="utm_source"
                                                value={pair.key}
                                                onChange={e => {
                                                    const next = [...tempUtmPairs];
                                                    next[idx].key = e.target.value;
                                                    setTempUtmPairs(next);
                                                }}
                                                className="h-10 rounded-xl text-xs flex-1"
                                            />
                                            <div className="flex-1 relative">
                                                <Input 
                                                    placeholder="value"
                                                    value={pair.value}
                                                    onChange={e => {
                                                        const next = [...tempUtmPairs];
                                                        next[idx].value = e.target.value;
                                                        setTempUtmPairs(next);
                                                    }}
                                                    className="h-10 rounded-xl text-xs w-full pr-8"
                                                />
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8 text-gray-300 hover:text-gray-600">
                                                            <ChevronDown className="w-4 h-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-48 p-1 bg-white rounded-xl shadow-lg border-gray-100">
                                                        <Command>
                                                            <CommandList>
                                                                {VALUE_SUGGESTIONS.map(s => (
                                                                    <CommandItem 
                                                                        key={s} 
                                                                        onSelect={() => {
                                                                            const next = [...tempUtmPairs];
                                                                            next[idx].value = s;
                                                                            setTempUtmPairs(next);
                                                                        }}
                                                                        className="p-2 text-[11px] font-medium rounded-lg hover:bg-gray-50 cursor-pointer"
                                                                    >
                                                                        {s}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 text-gray-200 hover:text-red-500"
                                                onClick={() => setTempUtmPairs(tempUtmPairs.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full h-10 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 hover:border-gray-200 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-widest"
                                        onClick={() => setTempUtmPairs([...tempUtmPairs, { key: "", value: "" }])}
                                    >
                                        <Plus className="w-3 h-3 mr-2" />
                                        Add Parameter
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <Button variant="outline" className="flex-1 h-12 rounded-2xl border-gray-200" onClick={() => setShowUtmSetupModal(false)}>
                                Cancel
                            </Button>
                            <Button className="flex-1 h-12 rounded-2xl bg-black text-white font-bold" onClick={() => { setUtmPairs(tempUtmPairs); setShowUtmSetupModal(false); }}>
                                Apply Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Import Modal */}
            {showLinkImportModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 tracking-tight">Import Recent Links</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Existing TikTok Ads</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowLinkImportModal(false)} className="rounded-full">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {isFetchingLinks ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader className="w-8 h-8 animate-spin text-gray-200" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Scanning your ads...</p>
                                </div>
                            ) : linkImportPreview.length === 0 ? (
                                <div className="text-center py-12 space-y-2">
                                    <p className="text-sm font-medium text-gray-900">No links found</p>
                                    <p className="text-xs text-gray-500">We couldn't find any recent ads with landing page URLs for this account.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {linkImportPreview.map((url, idx) => (
                                        <div 
                                            key={idx} 
                                            className="group flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
                                            onClick={() => {
                                                if (!links.some(l => l.url === url)) {
                                                    setLinks([...links, { url, isDefault: links.length === 0 }]);
                                                    toast.success("Link imported");
                                                }
                                            }}
                                        >
                                            <span className="text-xs font-medium truncate max-w-[85%]">{url}</span>
                                            <Plus className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                            <Button variant="outline" className="w-full h-12 rounded-2xl border-gray-200" onClick={() => setShowLinkImportModal(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}
