import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { toast } from "sonner"
import { FileText, CirclePlus, Trash2, X, Loader, ChevronsUpDown, ArrowUpDown, Check, Info, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import TextareaAutosize from 'react-textarea-autosize'
import { RotateLoader } from "react-spinners"
import { deleteTikTokCopyTemplate } from "@/lib/saveTikTokSettings"
import { useBlocker } from "react-router-dom"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const settingsFieldChrome = "rounded-2xl border border-gray-300 py-4.5 bg-white shadow";
const settingsTextareaChrome = "rounded-2xl border border-gray-300 bg-white px-3 pt-2.5 pb-2.5 leading-5 shadow";

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
    const [text, setText] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [templateSearch, setTemplateSearch] = useState("")
    const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
    const [sortMode, setSortMode] = useState(() => localStorage.getItem("tiktokTemplateSortMode") || "default")
    const [showSortMenu, setShowSortMenu] = useState(false)
    const [bulkDeleteMode, setBulkDeleteMode] = useState(false)
    const [selectedForDelete, setSelectedForDelete] = useState(new Set())
    const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
    const [pendingAction, setPendingAction] = useState(null)
    const [pendingPayload, setPendingPayload] = useState(null)

    const [showImportPopup, setShowImportPopup] = useState(false)
    const [recentAds, setRecentAds] = useState([])
    const [isFetchingCopy, setIsFetchingCopy] = useState(false)
    const [previouslyFetched, setPreviouslyFetched] = useState([])
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [nextPage, setNextPage] = useState(null)

    const tiktokHeaders = useCallback(() => {
        const uid = localStorage.getItem('tiktok_uid');
        const token = localStorage.getItem('tiktok_token');
        return {
            ...(uid && { 'x-tiktok-user-id': uid }),
            ...(token && { 'x-tiktok-token': token }),
            "Content-Type": "application/json"
        };
    }, []);

    // Fetch recent ad copy
    useEffect(() => {
        if (!showImportPopup || !advertiserId) return;

        setIsFetchingCopy(true);
        setNextPage(null);

        fetch(`${API_BASE_URL}/api/tiktok/fetch-recent-copy`, {
            method: "POST",
            headers: tiktokHeaders(),
            body: JSON.stringify({
                advertiserId,
                excludeTexts: [],
                page: 1
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.texts) {
                    setRecentAds(data.texts || []);
                    setPreviouslyFetched(data.texts || []);
                    setNextPage(data.nextPage);
                } else {
                    throw new Error("No data");
                }
            })
            .catch(err => {
                console.error("Error fetching TikTok ad copy:", err);
                toast.error("Failed to load recent ad copy");
            })
            .finally(() => {
                setIsFetchingCopy(false);
            });
    }, [showImportPopup, advertiserId, tiktokHeaders]);

    const handleLoadMore = useCallback(async () => {
        if (!nextPage) {
            toast.info("No more copy available");
            return;
        }

        setIsLoadingMore(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tiktok/fetch-recent-copy`, {
                method: "POST",
                headers: tiktokHeaders(),
                body: JSON.stringify({
                    advertiserId,
                    excludeTexts: previouslyFetched,
                    page: nextPage
                })
            });

            const data = await response.json();
            const newCount = data.texts?.length || 0;

            if (newCount > 0) {
                setRecentAds(prev => [...prev, ...(data.texts || [])]);
                setPreviouslyFetched(prev => [...prev, ...(data.texts || [])]);
                setNextPage(data.nextPage);
            } else {
                toast.info("No more unique copy found");
            }
        } catch (err) {
            console.error("Error loading more TikTok copy:", err);
            toast.error("Failed to load more copy");
        } finally {
            setIsLoadingMore(false);
        }
    }, [advertiserId, previouslyFetched, nextPage, tiktokHeaders]);

    const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');

    const textExistsInTemplate = useCallback((textVal) => {
        const normalizedText = normalizeText(textVal);
        return normalizeText(text) === normalizedText;
    }, [text]);

    const createTextImportHandler = useCallback((textVal) => () => {
        setText(textVal);
        toast.success("Imported text");
    }, []);

    const nameAlreadyExists = useMemo(() =>
        templateName.trim() &&
        templateName !== selectedName &&
        Object.keys(templates).includes(templateName),
        [templateName, selectedName, templates]
    )

    const templateChanged = useMemo(() => {
        const currentTemplate = templates[selectedName] || {};
        const currentTemplateText = currentTemplate.text || (currentTemplate.texts && currentTemplate.texts[0]) || "";
        const trimmedText = text.trim();
        const originalText = currentTemplateText.trim();

        if (!selectedName) {
            return !!(templateName.trim() || trimmedText);
        }

        return (
            templateName !== selectedName ||
            trimmedText !== originalText
        );
    }, [templateName, selectedName, templates, text]);

    const blocker = useBlocker(templateChanged);

    useEffect(() => {
        const handler = (e) => {
            if (templateChanged) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires this
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [templateChanged]);

    // Sync with props
    useEffect(() => {
        if (selectedName && templates[selectedName]) {
            const t = templates[selectedName];
            setTemplateName(t.name || selectedName);
            setText(t.text || (t.texts && t.texts[0]) || "");
        } else if (!selectedName) {
            setTemplateName("");
            setText("");
        }
    }, [selectedName, templates]);

    const lastInitializedAdvertiserRef = useRef(null);

    // Initial default selection
    useEffect(() => {
        if (advertiserId !== lastInitializedAdvertiserRef.current && Object.keys(templates).length > 0) {
            if (defaultName && templates[defaultName]) {
                setSelectedName(defaultName);
                lastInitializedAdvertiserRef.current = advertiserId;
            } else if (Object.keys(templates).length > 0) {
                setSelectedName(Object.keys(templates)[0]);
                lastInitializedAdvertiserRef.current = advertiserId;
            }
        }
    }, [advertiserId, templates, defaultName]);

    const handleNewTemplate = useCallback(() => {
        setSelectedName("")
        setTemplateName("")
        setText("")
    }, [])

    const executePendingAction = useCallback((action, payload) => {
        if (action === "NEW_TEMPLATE") {
            handleNewTemplate()
        } else if (action === "SELECT_TEMPLATE") {
            setSelectedName(payload)
        }
    }, [handleNewTemplate])

    const handleNewTemplateClick = () => {
        if (templateChanged) {
            setPendingAction("NEW_TEMPLATE")
            setPendingPayload(null)
            setShowUnsavedChangesDialog(true)
        } else {
            handleNewTemplate()
        }
    }

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            toast.error("Template name is required")
            return false
        }

        const trimmedText = text.trim();
        if (!trimmedText) {
            toast.error("Text is required")
            return false
        }

        const newTemplate = {
            name: templateName,
            text: trimmedText,
        }

        setIsProcessing(true)
        try {
            const isEditing = selectedName !== null && selectedName !== ""
            const isRenaming = isEditing && selectedName !== templateName

            // Call the parent update callbacks
            await onSaveTemplate(templateName, newTemplate, isRenaming ? selectedName : null);
            setSelectedName(templateName);
            toast.success(isRenaming ? "Template renamed" : isEditing ? "Template updated" : "Template saved")
            return true
        } catch (err) {
            toast.error("Failed to save template")
            console.error(err)
            return false
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSetAsDefault = async () => {
        if (!templateName.trim() || defaultName === templateName) return

        setIsProcessing(true)
        try {
            await onSetDefault(templateName);
            toast.success("Set as default template")
        } catch (err) {
            toast.error("Failed to set default template")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleBulkDelete = useCallback(async () => {
        if (selectedForDelete.size === 0) return

        const namesToDelete = [...selectedForDelete]
        setIsProcessing(true)
        try {
            for (const name of namesToDelete) {
                await deleteTikTokCopyTemplate(advertiserId, name);
                onDeleteTemplate(name);
            }
            toast.success(`Deleted ${namesToDelete.length} template${namesToDelete.length > 1 ? "s" : ""}`)
            setSelectedForDelete(new Set())
            setBulkDeleteMode(false)
            if (namesToDelete.includes(selectedName)) {
                setSelectedName("")
            }
        } catch (err) {
            toast.error("Failed to delete templates")
            console.error(err)
        } finally {
            setIsProcessing(false)
        }
    }, [advertiserId, selectedForDelete, selectedName, onDeleteTemplate])

    const toggleDeleteSelection = useCallback((name) => {
        setSelectedForDelete((prev) => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }, [])

    const availableTemplates = useMemo(() => {
        let entries = Object.entries(templates)

        // Filter by search
        if (templateSearch.trim()) {
            const query = templateSearch.toLowerCase()
            entries = entries.filter(([name]) => name.toLowerCase().includes(query))
        }

        // Sort — default template always pinned at top
        entries.sort(([a, aData], [b, bData]) => {
            if (a === defaultName) return -1
            if (b === defaultName) return 1

            if (sortMode === "most_used") {
                return (bData?.usageCount || 0) - (aData?.usageCount || 0)
            }
            return 0
        })

        if (sortMode === "oldest") {
            const defaultEntry = entries.find(([name]) => name === defaultName)
            const rest = entries.filter(([name]) => name !== defaultName)
            entries = defaultEntry ? [defaultEntry, ...rest.reverse()] : rest.reverse()
        }

        return entries
    }, [templates, defaultName, templateSearch, sortMode])

    return (
        <div className="p-4 bg-[#f5f5f5] rounded-2xl space-y-3 w-full max-w-3xl">
            <div className="flex items-start justify-between mb-6">
                <div className="flex flex-col gap-[12px]">
                    <div className="flex items-center gap-2">
                        <FileText
                            className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60 text-zinc-800"
                        />
                        <span className="text-sm font-medium text-zinc-950">Copy Templates</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">
                        Enter ad text below, <br />
                        Then save as a template to easily add to your TikTok ads in the future
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="flex items-center text-xs rounded-xl px-3 py-1 bg-zinc-800 text-white hover:text-white hover:bg-black"
                        onClick={() => setShowImportPopup(true)}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Import Copy from Recent Ads
                    </Button>
                </div>
            </div>

            {/* Template dropdown and set as default button */}
            {Object.keys(templates).length > 0 && (
                <div className="flex w-full items-center gap-3 mb-4 transition-all duration-300">
                    <div className="flex-1 min-w-0">
                        <Popover open={templateDropdownOpen} onOpenChange={(open) => {
                            setTemplateDropdownOpen(open)
                            if (!open) {
                                setTemplateSearch("")
                                setShowSortMenu(false)
                                if (bulkDeleteMode && selectedForDelete.size === 0) {
                                    setBulkDeleteMode(false)
                                }
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-between ${settingsFieldChrome} px-3 text-sm hover:bg-white`}
                                    disabled={Object.keys(templates).length === 0}
                                >
                                    <span className="truncate">
                                        {selectedName || "Select a template"}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border border-gray-100 shadow-xl"
                                align="start"
                                side="bottom"
                                avoidCollisions={false}
                                style={{
                                    minWidth: "var(--radix-popover-trigger-width)",
                                    width: "auto",
                                }}
                            >
                                <Command filter={() => 1} loop={false} className="overflow-visible">
                                    <div className="flex items-center gap-1.5 mx-2 mt-2 mb-1">
                                        <CommandInput
                                            placeholder="Search templates..."
                                            value={templateSearch}
                                            onValueChange={setTemplateSearch}
                                            wrapperClassName="flex-1 border-gray-200 bg-gray-50 mx-0 mt-0 mb-0"
                                        />
                                        <div className="flex items-center gap-1">
                                            {/* Sort button */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    className={`p-1.5 rounded-lg transition-colors ${showSortMenu ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setShowSortMenu(!showSortMenu)
                                                    }}
                                                    title="Sort templates"
                                                >
                                                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
                                                </button>
                                                {showSortMenu && (
                                                    <>
                                                        <div className="fixed inset-0 z-[99]" onClick={() => setShowSortMenu(false)} />
                                                        <div className="absolute right-0 top-full mt-1 z-[100] bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[150px]">
                                                            {[
                                                                { value: "default", label: "Recently Made" },
                                                                { value: "oldest", label: "Oldest First" },
                                                            ].map((option) => (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center justify-between"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setSortMode(option.value)
                                                                        localStorage.setItem("tiktokTemplateSortMode", option.value)
                                                                        setShowSortMenu(false)
                                                                    }}
                                                                >
                                                                    <span className="flex items-center gap-1.5">
                                                                        {option.label}
                                                                    </span>
                                                                    {sortMode === option.value && (
                                                                        <Check className="h-3.5 w-3.5 text-blue-500" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Bulk delete button */}
                                            {bulkDeleteMode && selectedForDelete.size > 0 ? (
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-70"
                                                    disabled={isProcessing}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleBulkDelete()
                                                    }}
                                                >
                                                    {isProcessing ? <Loader className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                    {isProcessing ? "Deleting..." : `Delete (${selectedForDelete.size})`}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={`p-1.5 rounded-lg transition-colors ${bulkDeleteMode ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (bulkDeleteMode) {
                                                            setBulkDeleteMode(false)
                                                            setSelectedForDelete(new Set())
                                                        } else {
                                                            setBulkDeleteMode(true)
                                                        }
                                                    }}
                                                    title={bulkDeleteMode ? "Cancel delete" : "Delete templates"}
                                                >
                                                    {bulkDeleteMode ? (
                                                        <X className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <CommandList className="max-h-[300px] overflow-y-auto rounded-xl">
                                        {availableTemplates.map(([name, data]) => (
                                            <CommandItem
                                                key={name}
                                                value={name}
                                                onSelect={() => {
                                                    if (bulkDeleteMode) {
                                                        toggleDeleteSelection(name)
                                                    } else {
                                                        if (templateChanged) {
                                                            setPendingAction("SELECT_TEMPLATE")
                                                            setPendingPayload(name)
                                                            setShowUnsavedChangesDialog(true)
                                                        } else {
                                                            setSelectedName(name)
                                                        }
                                                        setTemplateDropdownOpen(false)
                                                        setTemplateSearch("")
                                                    }
                                                }}
                                                className="px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100"
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    {bulkDeleteMode && (
                                                        <Checkbox
                                                            checked={selectedForDelete.has(name)}
                                                            className="border-gray-300 w-4 h-4 rounded-md pointer-events-none"
                                                        />
                                                    )}
                                                    <span className="text-sm truncate flex-1">{name}</span>
                                                    {name === defaultName && (
                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg shrink-0">
                                                            Default
                                                        </span>
                                                    )}
                                                    {!bulkDeleteMode && name === selectedName && (
                                                        <Check className="h-4 w-4 text-blue-500 shrink-0" />
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button
                        variant="outline"
                        className={`shrink-0 ${settingsFieldChrome} px-4 hover:bg-gray-50 text-sm font-medium`}
                        disabled={!templateName.trim() || defaultName === templateName || isProcessing}
                        onClick={handleSetAsDefault}
                    >
                        Set as Default
                    </Button>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[14px] text-gray-600">Template Name</label>
                <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name (e.g. Summer Sale, Evergreen)"
                    className={`${settingsFieldChrome} h-9 rounded-xl py-2`}
                    disabled={isProcessing}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[14px] text-gray-700">Text</label>
                </div>
                <div className="flex flex-col w-full">
                    <TextareaAutosize
                        placeholder="Enter Caption"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className={`${settingsTextareaChrome} w-full text-sm resize-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0`}
                        minRows={3}
                        maxRows={10}
                        disabled={isProcessing}
                    />
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <Button
                    className="bg-blue-500 text-white w-full rounded-xl hover:bg-blue-600 h-[45px]"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || isProcessing || nameAlreadyExists || !templateChanged || !text.trim()}
                >
                    {nameAlreadyExists
                        ? "This template name already exists"
                        : isProcessing
                            ? (
                                <>
                                    <Loader className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            )
                            : !templateName.trim() && text.trim()
                                ? "Enter Template Name to Save"
                                : "Save Template"
                    }
                </Button>

                <div className="flex gap-4">
                    {Object.keys(templates).length > 0 && (
                        <Button
                            variant="outline"
                            className="w-full rounded-xl h-[40px] bg-zinc-800 hover:bg-black flex hover:text-white items-center gap-2 text-white transition-all duration-300"
                            onClick={handleNewTemplateClick}
                            disabled={isProcessing}
                        >
                            <CirclePlus className="w-4 h-4 text-white" />
                            Add New Template
                        </Button>
                    )}
                </div>

                {templateChanged && !nameAlreadyExists ? (
                    <p className="text-xs text-white bg-rose-500 rounded-xl border text-left mt-1 p-2">
                        Your templates have unsaved changes.
                    </p>
                ) : null}
            </div>

            {showUnsavedChangesDialog && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/30 flex justify-center items-center"
                    style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                    onClick={() => setShowUnsavedChangesDialog(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-[500px] shadow-xl relative border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8">
                            <h2 className="text-xl font-semibold mb-2 text-zinc-950">Unsaved Template Changes</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                You have unsaved changes in your template. What would you like to do?
                            </p>

                            <div className="flex flex-col gap-3">
                                <Button
                                    className="bg-blue-500 text-white rounded-xl hover:bg-blue-600 w-full"
                                    onClick={async () => {
                                        const saved = await handleSaveTemplate();
                                        if (saved) {
                                            executePendingAction(pendingAction, pendingPayload);
                                            setShowUnsavedChangesDialog(false);
                                        }
                                    }}
                                >
                                    Save & Continue
                                </Button>
                                <Button
                                    className="rounded-xl bg-rose-500 text-white hover:bg-red-600 w-full"
                                    onClick={() => {
                                        executePendingAction(pendingAction, pendingPayload);
                                        setShowUnsavedChangesDialog(false);
                                    }}
                                >
                                    Discard Changes and Proceed
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl w-full border-gray-300"
                                    onClick={() => setShowUnsavedChangesDialog(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {blocker.state === "blocked" && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/30 flex justify-center items-center"
                    style={{ top: -20, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                    onClick={() => blocker.reset()}
                >
                    <div
                        className="bg-white rounded-2xl w-[500px] shadow-xl relative border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8">
                            <h2 className="text-xl font-semibold mb-2 text-zinc-950">Unsaved Template Changes</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                You have unsaved changes in your template. What would you like to do?
                            </p>

                            <div className="flex flex-col gap-3">
                                <Button
                                    className="bg-blue-500 text-white rounded-xl hover:bg-blue-600 w-full"
                                    onClick={async () => {
                                        const saved = await handleSaveTemplate();
                                        if (saved) {
                                            blocker.proceed();
                                        }
                                    }}
                                >
                                    Save & Continue
                                </Button>
                                <Button
                                    className="rounded-xl bg-rose-500 text-white hover:bg-red-600 w-full"
                                    onClick={() => blocker.proceed()}
                                >
                                    Discard Changes and Proceed
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl w-full border-gray-300"
                                    onClick={() => blocker.reset()}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showImportPopup && (
                <div
                    className="fixed z-50 flex items-center justify-center bg-black/50 p-4"
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100dvh",
                        minHeight: "100vh",
                    }}
                    onClick={() => setShowImportPopup(false)}
                >
                    <div className="relative w-[600px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-h-[80vh] overflow-y-auto import-popup-scroll transition-all duration-300 ease-in-out">
                            <div className="px-6 pb-6 pt-4">
                                {isFetchingCopy ? (
                                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                        <RotateLoader size={6} margin={-16} color="#adadad" />
                                        <span className="text-sm text-gray-600">Loading text copy...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4 w-full">
                                            <h3 className="text-lg font-semibold text-zinc-950">Recent Ad Copy ({recentAds.length})</h3>
                                            <Button
                                                className="bg-red-600 hover:bg-red-700 !shadow-none rounded-xl"
                                                onClick={() => setShowImportPopup(false)}
                                            >
                                                <CirclePlus className="w-4 h-4 rotate-45 text-white mr-1" />
                                                <span className="text-white">Close</span>
                                            </Button>
                                        </div>

                                        {recentAds.length > 0 ? (
                                            <div className="border bg-gray-50 border-gray-200 rounded-2xl p-2 space-y-2">
                                                {recentAds.map((text, index) => (
                                                    <div key={index} className="rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="text-xs font-medium text-gray-500">
                                                                Text Option {index + 1}
                                                            </div>
                                                            <Button
                                                                className={`flex items-center text-xs rounded-xl px-2 py-1 shrink-0 ${textExistsInTemplate(text)
                                                                    ? 'bg-white text-black cursor-not-allowed border border-gray-300 !shadow-none'
                                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                    }`}
                                                                onClick={textExistsInTemplate(text) ? undefined : createTextImportHandler(text)}
                                                                disabled={textExistsInTemplate(text)}
                                                            >
                                                                {textExistsInTemplate(text) ? 'Exists' : 'Import'}
                                                            </Button>
                                                        </div>
                                                        <div className="bg-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line">
                                                            {text}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 text-gray-500">
                                                No recent ad copy found
                                            </div>
                                        )}

                                        {nextPage && (
                                            <div className="text-center pt-4 mt-2">
                                                <Button
                                                    className="bg-gray-700 text-white hover:bg-gray-900 rounded-xl w-full"
                                                    onClick={handleLoadMore}
                                                    disabled={isFetchingCopy || isLoadingMore}
                                                >
                                                    {isFetchingCopy || isLoadingMore ? (
                                                        <>
                                                            <Loader className="w-4 h-4 animate-spin mr-2" />
                                                            Loading More Copy...
                                                        </>
                                                    ) : (
                                                        'Load More Copy'
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
