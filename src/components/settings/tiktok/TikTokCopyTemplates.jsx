import { useState, useCallback, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ChevronDown, X, Download, Settings2, Loader, FileText, Check } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
    CommandEmpty,
    CommandGroup
} from "@/components/ui/command"
import { toast } from "sonner";
import TextareaAutosize from 'react-textarea-autosize'
import { deleteTikTokCopyTemplate } from "@/lib/saveTikTokSettings"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function TikTokCopyTemplates({ 
    templates = {}, 
    defaultName = "", 
    onSaveTemplate, 
    onSetDefault, 
    onDeleteTemplate,
    advertiserId
}) {
    const [selectedName, setSelectedName] = useState("")
    const [templateName, setTemplateName] = useState("")
    const [texts, setTexts] = useState([""])
    const [isProcessing, setIsProcessing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // Sync with props
    useEffect(() => {
        if (selectedName && templates[selectedName]) {
            const t = templates[selectedName];
            setTemplateName(t.name || selectedName);
            setTexts(t.texts || [""]);
        } else if (!selectedName) {
            setTemplateName("");
            setTexts([""]);
        }
    }, [selectedName, templates]);

    // Initial default selection
    useEffect(() => {
        if (!selectedName && defaultName && templates[defaultName]) {
            setSelectedName(defaultName);
        } else if (!selectedName && Object.keys(templates).length > 0) {
            setSelectedName(Object.keys(templates)[0]);
        }
    }, [defaultName, templates, selectedName]);

    const handleAddText = () => {
        if (texts.length < 5) setTexts([...texts, ""]);
    };

    const handleRemoveText = (idx) => {
        setTexts(texts.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (!templateName.trim()) {
            toast.error("Template name is required");
            return;
        }
        const filtered = texts.filter(t => t.trim().length > 0);
        if (filtered.length === 0) {
            toast.error("At least one text variant is required");
            return;
        }

        setIsProcessing(true);
        try {
            const isRenaming = selectedName && selectedName !== templateName;
            await onSaveTemplate(templateName, { name: templateName, texts: filtered }, isRenaming ? selectedName : null);
            setSelectedName(templateName);
            toast.success("Template saved");
        } catch (err) {
            toast.error("Failed to save template");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedName) return;
        setIsProcessing(true);
        try {
            await deleteTikTokCopyTemplate(advertiserId, selectedName);
            onDeleteTemplate(selectedName);
            setSelectedName("");
            toast.success("Template deleted");
        } catch (err) {
            toast.error("Failed to delete template");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNew = () => {
        setSelectedName("");
        setTemplateName("");
        setTexts([""]);
    };

    const filteredTemplates = useMemo(() => {
        const entries = Object.entries(templates);
        if (!searchQuery) return entries;
        return entries.filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [templates, searchQuery]);

    return (
        <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-200 space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Ad Text Templates</span>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-tight bg-zinc-800 text-white hover:bg-black hover:text-white"
                    onClick={handleNew}
                >
                    <Plus className="w-3 h-3 mr-1.5" />
                    New Template
                </Button>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Template</label>
                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-11 rounded-2xl border-gray-200 bg-white justify-between px-4">
                            <span className="truncate text-sm font-medium">
                                {selectedName ? (
                                    <div className="flex items-center gap-2">
                                        {selectedName}
                                        {selectedName === defaultName && <span className="text-[8px] font-bold uppercase bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Default</span>}
                                    </div>
                                ) : "Choose a template..."}
                            </span>
                            <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white rounded-2xl shadow-xl border-gray-100">
                        <Command>
                            <CommandInput placeholder="Search templates..." value={searchQuery} onValueChange={setSearchQuery} />
                            <CommandList>
                                <CommandEmpty>No templates found.</CommandEmpty>
                                <CommandGroup>
                                    {filteredTemplates.map(([name]) => (
                                        <CommandItem 
                                            key={name} 
                                            onSelect={() => { setSelectedName(name); setIsDropdownOpen(false); }}
                                            className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                                        >
                                            <span className="text-xs">{name}</span>
                                            {name === defaultName && <Check className="w-3 h-3 text-blue-500" />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">Template Name</label>
                    <Input 
                        placeholder="e.g. Summer Sale, Evergreen"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        className="h-10 rounded-xl border-gray-200 focus:ring-0 text-sm"
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700">Ad Text Variants</label>
                        <span className="text-[10px] text-gray-400 font-medium">{texts.length}/5 Variants</span>
                    </div>
                    
                    <div className="space-y-3">
                        {texts.map((text, idx) => (
                            <div key={idx} className="relative group">
                                <TextareaAutosize
                                    placeholder={`Variant ${idx + 1}...`}
                                    value={text}
                                    onChange={e => {
                                        const next = [...texts];
                                        next[idx] = e.target.value;
                                        setTexts(next);
                                    }}
                                    minRows={2}
                                    maxRows={6}
                                    className="w-full rounded-2xl border border-gray-200 p-3 pr-10 text-sm focus:outline-none focus:border-gray-300 bg-gray-50/30 transition-all"
                                />
                                {texts.length > 1 && (
                                    <button 
                                        onClick={() => handleRemoveText(idx)}
                                        className="absolute right-3 top-3 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {texts.length < 5 && (
                            <Button 
                                variant="ghost" 
                                className="w-full h-10 border-2 border-dashed border-gray-50 rounded-2xl text-gray-400 hover:border-gray-200 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-widest"
                                onClick={handleAddText}
                            >
                                <Plus className="w-3 h-3 mr-2" />
                                Add Variant
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button 
                        className="flex-1 h-11 rounded-2xl bg-black text-white font-bold text-xs"
                        disabled={isProcessing}
                        onClick={handleSave}
                    >
                        {isProcessing ? <Loader className="w-4 h-4 animate-spin" /> : "Save Template"}
                    </Button>
                    {selectedName && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-11 w-11 rounded-2xl border-gray-200 p-0">
                                    <Trash2 className="w-4 h-4 text-gray-400" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-4 bg-white rounded-2xl shadow-xl border-gray-100">
                                <p className="text-xs font-bold text-gray-900 mb-3">Delete this template?</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 h-8 text-[10px] rounded-lg" onClick={() => {}}>No</Button>
                                    <Button className="flex-1 h-8 text-[10px] rounded-lg bg-red-500 text-white" onClick={handleDelete}>Yes</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {selectedName && selectedName !== defaultName && (
                    <Button 
                        variant="ghost" 
                        className="w-full h-8 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                        onClick={() => onSetDefault(selectedName)}
                    >
                        Set as Default Template
                    </Button>
                )}
            </div>
        </div>
    )
}
