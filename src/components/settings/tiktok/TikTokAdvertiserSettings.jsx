import TikTokIcon from "@/assets/icons/tiktok.svg?react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { saveTikTokSettings } from "@/lib/saveTikTokSettings"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import useTikTokAdvertiserSettings from "@/lib/useTikTokAdvertiserSettings"
import { useAppData } from "@/lib/AppContext"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, HelpCircle, Layout, Loader, Loader2, RefreshCcw, Info } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import TikTokCopyTemplates from "./TikTokCopyTemplates"
import TikTokLinkParameters from "./TikTokLinkParameters"
import LabelIcon from "@/assets/icons/label.svg?react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"

const CTA_OPTIONS = [
    { value: 'LEARN_MORE', label: 'Learn More' },
    { value: 'SHOP_NOW', label: 'Shop Now' },
    { value: 'SIGN_UP', label: 'Sign Up' },
    { value: 'DOWNLOAD_NOW', label: 'Download' },
    { value: 'CONTACT_US', label: 'Contact Us' },
    { value: 'ORDER_NOW', label: 'Order Now' },
    { value: 'BOOK_NOW', label: 'Book Now' },
    { value: 'PLAY_GAME', label: 'Play Game' },
    { value: 'APPLY_NOW', label: 'Apply Now' },
    { value: 'WATCH_NOW', label: 'Watch Now' },
    { value: 'INSTALL_NOW', label: 'Install Now' },
    { value: 'GET_QUOTE', label: 'Get Quote' },
    { value: 'SUBSCRIBE', label: 'Subscribe' },
    { value: 'CALL_NOW', label: 'Call Now' },
    { value: 'LISTEN_NOW', label: 'Listen Now' },
    { value: 'VISIT_STORE', label: 'Visit Store' },
    { value: 'SEND_MESSAGE', label: 'Send Message' },
    { value: 'VIEW_PROFILE', label: 'View Profile' },
    { value: 'READ_MORE', label: 'Read More' },
    { value: 'GET_TICKETS_NOW', label: 'Get Tickets Now' },
    { value: 'WATCH_LIVE', label: 'Watch Live' },
    { value: 'GET_SHOWTIMES', label: 'Get Showtimes' },
    { value: 'CHECK_AVAILABILITY', label: 'Check Availability' },
    { value: 'EXPERIENCE_NOW', label: 'Experience Now' },
    { value: 'INTERESTED', label: 'Interested' },
    { value: 'VIEW_NOW', label: 'View Now' },
    { value: 'SHOOT_WITH_THIS_EFFECT', label: 'Shoot with this effect' },
    { value: 'PREORDER_NOW', label: 'Preorder Now' },
    { value: 'VIEW_VIDEO_WITH_THIS_EFFECT', label: 'View video with this effect' },
    { value: 'JOIN_THIS_HASHTAG', label: 'Join this hashtag' },
];

export default function TikTokAdvertiserSettings({ advertisers = [] }) {
    const [selectedAdvertiser, setSelectedAdvertiser] = useState(null);
    const { settings, setSettings, loading, refetch } = useTikTokAdvertiserSettings(selectedAdvertiser);
    const { isTikTokLoggedIn, refreshTikTokUser } = useTikTokAuth();
    const [refreshingAdvertisers, setRefreshingAdvertisers] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { tiktokIdentities, tiktokIdentitiesLoading, fetchTikTokIdentities } = useAppData();
    const identities = tiktokIdentities[selectedAdvertiser] || [];
    const loadingIdentities = tiktokIdentitiesLoading[selectedAdvertiser] || false;
    const [openIdentity, setOpenIdentity] = useState(false);
    const [openCta, setOpenCta] = useState(false);
    const [openAdvertiser, setOpenAdvertiser] = useState(false);
    const [initialSettings, setInitialSettings] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    const tiktokHeaders = useCallback(() => {
        const uid = localStorage.getItem('tiktok_uid');
        const token = localStorage.getItem('tiktok_token');
        return {
            ...(uid && { 'x-tiktok-user-id': uid }),
            ...(token && { 'x-tiktok-token': token }),
        };
    }, []);

    const handleRefreshAdvertisers = async () => {
        setRefreshingAdvertisers(true);
        try {
            await refreshTikTokUser();
            toast.success("Advertiser accounts refreshed");
        } catch (err) {
            toast.error("Failed to refresh advertiser accounts");
        } finally {
            setRefreshingAdvertisers(false);
        }
    };

    // Track initial settings for dirty detection
    useEffect(() => {
        if (settings && !initialSettings) {
            setInitialSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [settings, initialSettings]);

    // Detect changes
    useEffect(() => {
        if (!settings || !initialSettings) {
            setHasChanges(false);
            return;
        }
        setHasChanges(JSON.stringify(settings) !== JSON.stringify(initialSettings));
    }, [settings, initialSettings]);

    // Fetch identities when advertiser changes
    useEffect(() => {
        if (selectedAdvertiser) {
            fetchTikTokIdentities(selectedAdvertiser);
        }
    }, [selectedAdvertiser, fetchTikTokIdentities]);

    const fetchIdentities = () => {
        if (selectedAdvertiser) {
            fetchTikTokIdentities(selectedAdvertiser, true);
        }
    };

    const handleSave = async (updatedSettings = settings) => {
        if (!selectedAdvertiser) return;
        setIsSaving(true);
        try {
            await saveTikTokSettings(selectedAdvertiser, updatedSettings);
            toast.success("Settings saved successfully");
            setInitialSettings(JSON.parse(JSON.stringify(updatedSettings)));
            setHasChanges(false);
            refetch();
        } catch (err) {
            toast.error("Failed to save settings");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDismiss = () => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings)));
        }
        setHasChanges(false);
    };

    const handleAdvertiserChange = (id) => {
        setSelectedAdvertiser(id);
        setOpenAdvertiser(false);
        setInitialSettings(null);
        setHasChanges(false);
    };

    if (!isTikTokLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center">
                    <Layout className="w-10 h-10 text-gray-200" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">TikTok Not Connected</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">Please connect your TikTok For Business account to manage preferences and launch ads.</p>
                </div>
                <Button
                    onClick={() => window.location.href = '/tiktok-login'}
                    className="h-12 px-8 rounded-2xl bg-black text-white font-bold"
                >
                    Connect TikTok
                </Button>
            </div>
        );
    }


    const currentSettings = settings || {};
    const currentAdvertiser = advertisers.find(a => (a.advertiser_id || a.id) === selectedAdvertiser);

    return (
        <div className="space-y-6 w-full max-w-3xl">
            {/* Advertiser Selector — mirrors Meta's Ad Account dropdown */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-md font-medium text-gray-800">Select Advertiser Account</label>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={openAdvertiser} onOpenChange={setOpenAdvertiser}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between rounded-2xl border border-gray-300 bg-white shadow-xs hover:bg-white px-3 py-4.5"
                            >
                                {currentAdvertiser?.name || "Select an Advertiser Account"}
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
                                    placeholder="Search advertiser accounts..."
                                    className="bg-transparent"
                                    wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                                />
                                <CommandList className="max-h-[500px] overflow-y-auto rounded-2xl custom-scrollbar" selectOnFocus={false}>
                                    <CommandEmpty>No accounts found.</CommandEmpty>
                                    <CommandGroup>
                                        {advertisers.map(a => {
                                            const id = a.advertiser_id || a.id;
                                            return (
                                                <CommandItem
                                                    key={id}
                                                    value={id}
                                                    onSelect={() => handleAdvertiserChange(id)}
                                                    className={cn(
                                                        "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150 hover:bg-gray-100",
                                                        selectedAdvertiser === id ? "bg-gray-100 font-semibold" : ""
                                                    )}
                                                >
                                                    <span className="text-sm">{a.name}</span>
                                                    {selectedAdvertiser === id && <Check className="ml-auto w-4 h-4" />}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <button
                        type="button"
                        onClick={handleRefreshAdvertisers}
                        disabled={refreshingAdvertisers}
                        className="disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <RefreshCcw className={`w-4 h-4 text-gray-500 ${refreshingAdvertisers ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {selectedAdvertiser && loading && (
                    <div className="flex items-center gap-2 mb-2 text-zinc-500 font-semibold animate-pulse text-sm mt-2">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                        Loading Account settings...
                    </div>
                )}
            </div>

            <fieldset disabled={!selectedAdvertiser || loading}>
                <div className={!selectedAdvertiser || loading ? "opacity-70 cursor-not-allowed space-y-6" : "space-y-6"}>

                    {/* Identity Section — mirrors Meta's bg-[#f7f7f7] section style */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <TikTokIcon className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
                                <h3 className="font-medium text-[14px] text-zinc-950">
                                    Default Linked TikTok Account
                                </h3>
                            </div>
                            <RefreshCcw
                                className={cn(
                                    "h-4 w-4 cursor-pointer transition-all duration-200",
                                    loadingIdentities
                                        ? "text-gray-300 animate-spin"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                                onClick={fetchIdentities}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-500 mb-1 block">Identity</label>
                            <Popover open={openIdentity} onOpenChange={setOpenIdentity}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={loadingIdentities}
                                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-6"
                                    >
                                        {loadingIdentities ? (
                                            <div className="flex items-center gap-2">
                                                <Loader className="h-4 w-4 animate-spin" />
                                                <span className="text-sm font-medium text-gray-500">Loading identities...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const found = identities.find(i => i.identity_id === currentSettings.defaultIdentityId);
                                                    if (!found && currentSettings.defaultIdentityId) {
                                                        return <span className="text-sm font-medium">{currentSettings.defaultIdentityId}</span>;
                                                    }
                                                    return (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {found ? found.display_name : "Select TikTok Identity"}
                                                            </span>
                                                            {found && (
                                                                <span className="text-xs text-gray-400 font-normal">
                                                                    {found.identity_id}
                                                                </span>
                                                            )}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border-gray-200 shadow-2xl"
                                    align="start"
                                    sideOffset={4}
                                    side="bottom"
                                    avoidCollisions={false}
                                    style={{
                                        minWidth: "var(--radix-popover-trigger-width)",
                                        width: "auto",
                                    }}
                                >
                                    <Command filter={() => 1} loop={false}>
                                        <CommandInput
                                            placeholder="Search identities..."
                                            wrapperClassName="bg-gray-50 border-gray-100"
                                        />
                                        <CommandList className="max-h-[300px] overflow-y-auto rounded-xl">
                                            <CommandEmpty className="p-4 text-center text-xs text-gray-500">No identities found.</CommandEmpty>
                                            {identities.map((i) => (
                                                <CommandItem
                                                    key={i.identity_id}
                                                    value={i.identity_id}
                                                    onSelect={() => {
                                                        setSettings({ ...currentSettings, defaultIdentityId: i.identity_id });
                                                        setOpenIdentity(false);
                                                    }}
                                                    className="px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-semibold text-gray-900">{i.display_name}</span>
                                                        <span className="text-xs text-gray-400 font-normal">{i.identity_id}</span>
                                                    </div>
                                                    {currentSettings.defaultIdentityId === i.identity_id && <Check className="ml-auto w-4 h-4 text-black" />}
                                                </CommandItem>
                                            ))}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Default CTAs — flat section like Meta */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-[14px] text-zinc-950">Default Call to Actions</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-500 mb-1 block">Multi-select CTAs</label>
                            <Popover open={openCta} onOpenChange={setOpenCta}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow hover:bg-white px-3 py-6"
                                    >
                                        <span className="text-sm truncate">
                                            {currentSettings.defaultCTAs?.length > 0
                                                ? currentSettings.defaultCTAs.map(v => CTA_OPTIONS.find(o => o.value === v)?.label).join(", ")
                                                : "None selected"}
                                        </span>
                                        <ChevronsUpDown className="w-4 h-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white rounded-2xl shadow-xl border-gray-100" side="bottom" avoidCollisions={false}>
                                    <Command>
                                        <CommandList>
                                            <CommandGroup>
                                                {CTA_OPTIONS.map(opt => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        onSelect={() => {
                                                            const prev = currentSettings.defaultCTAs || [];
                                                            const next = prev.includes(opt.value)
                                                                ? prev.filter(v => v !== opt.value)
                                                                : [...prev, opt.value];
                                                            setSettings({ ...currentSettings, defaultCTAs: next });
                                                        }}
                                                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${currentSettings.defaultCTAs?.includes(opt.value) ? "bg-black border-black text-white" : "border-gray-200"}`}>
                                                            {currentSettings.defaultCTAs?.includes(opt.value) && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <span className="text-sm font-medium">{opt.label}</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Ad Naming Convention */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <LabelIcon className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
                            <h3 className="font-medium text-[14px] text-zinc-950">
                                Set up your default ad naming conventions
                            </h3>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        align="end"
                                        className="max-w-xs p-3 text-xs leading-relaxed rounded-2xl bg-zinc-800 text-white border-black"
                                    >
                                        <p className="font-medium mb-1.5">Select the Custom Date option & replace 'custom' with any combination of the tokens below.</p>
                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                                            <span className="font-semibold">D</span><span className="text-gray-400">Day (1–31)</span>
                                            <span className="font-semibold">DD</span><span className="text-gray-400">Day, zero-padded (01–31)</span>
                                            <span className="font-semibold">M</span><span className="text-gray-400">Month (1–12)</span>
                                            <span className="font-semibold">MM</span><span className="text-gray-400">Month, zero-padded (01–12)</span>
                                            <span className="font-semibold">MMM</span><span className="text-gray-400">Month name (Jan, Feb…)</span>
                                            <span className="font-semibold">YY</span><span className="text-gray-400">Year, 2-digit (25)</span>
                                            <span className="font-semibold">YYYY</span><span className="text-gray-400">Year, 4-digit (2025)</span>
                                        </div>
                                        <p className="text-gray-400 mt-2">Use any separator: <span className="font-mono">/ - . _</span> or space</p>
                                        <p className="text-gray-400 italic mt-1.5">{"Example: {{Date(DD-MMM-YYYY)}} → 05-Mar-2025"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <ReorderAdNameParts
                            formulaInput={currentSettings.adNameFormulaV2?.rawInput || ""}
                            onFormulaChange={(newRawInput) => {
                                setSettings({
                                    ...currentSettings,
                                    adNameFormulaV2: { rawInput: newRawInput }
                                });
                            }}
                            variant="default"
                            customVariables={currentSettings.customVariables || []}
                            onCustomVariablesChange={(newVars) => {
                                setSettings({
                                    ...currentSettings,
                                    customVariables: newVars
                                });
                            }}
                            hideInfoTooltip
                        />
                    </div>

                    {/* Links & UTMs */}
                    <TikTokLinkParameters
                        advertiserId={selectedAdvertiser}
                        links={currentSettings.links || []}
                        setLinks={(nextVal) => {
                            const currentLinks = currentSettings.links || [];
                            const evaluated = typeof nextVal === 'function' ? nextVal(currentLinks) : nextVal;
                            setSettings({ ...currentSettings, links: evaluated });
                        }}
                        utmPairs={currentSettings.defaultUTMs || []}
                        setUtmPairs={(nextVal) => {
                            const currentUTMs = currentSettings.defaultUTMs || [];
                            const evaluated = typeof nextVal === 'function' ? nextVal(currentUTMs) : nextVal;
                            setSettings({ ...currentSettings, defaultUTMs: evaluated });
                        }}
                        thirdPartyTrackingUrl={currentSettings.thirdPartyTrackingUrl || ""}
                        setThirdPartyTrackingUrl={(thirdPartyTrackingUrl) => setSettings({ ...currentSettings, thirdPartyTrackingUrl })}
                    />

                    {/* Copy Templates */}
                    <TikTokCopyTemplates
                        advertiserId={selectedAdvertiser}
                        templates={currentSettings.copyTemplates || {}}
                        defaultName={currentSettings.defaultTemplateName || ""}
                        onSaveTemplate={(name, data, oldName) => {
                            const updated = { ...currentSettings.copyTemplates };
                            if (oldName && oldName !== name) delete updated[oldName];
                            updated[name] = data;
                            const next = { ...currentSettings, copyTemplates: updated };
                            setSettings(next);
                            handleSave(next);
                        }}
                        onSetDefault={(name) => {
                            const next = { ...currentSettings, defaultTemplateName: name };
                            setSettings(next);
                            handleSave(next);
                        }}
                        onDeleteTemplate={(name) => {
                            const updated = { ...currentSettings.copyTemplates };
                            delete updated[name];
                            const next = { ...currentSettings, copyTemplates: updated };
                            if (currentSettings.defaultTemplateName === name) next.defaultTemplateName = "";
                            setSettings(next);
                        }}
                    />

                </div>
            </fieldset>

            {/* Portal Save Bar — identical pattern to Meta's AdAccountSettings */}
            {document.getElementById('settings-save-bar-portal') && createPortal(
                <div
                    className={`absolute bottom-0 left-0 w-full z-40 bg-blue-600 text-white transition-transform duration-300 ease-in-out ${hasChanges ? "translate-y-0" : "translate-y-full"}`}
                >
                    <div className="mx-auto max-w-3xl px-6 py-1.5 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => handleSave()}
                                className="bg-white text-blue-600 hover:bg-white rounded-xl px-6 h-9 text-sm font-semibold shadow-xs"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader className="h-4 w-4 animate-spin" />
                                        <span className="block truncate flex-1 text-left">Saving changes...</span>
                                    </>
                                ) : (
                                    <p className="text-blue-600 hover:text-blue-600">Save Changes</p>
                                )}
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="ghost"
                                className="text-white hover:bg-blue-700 hover:text-white rounded-xl px-4 h-9 text-sm font-medium"
                            >
                                Dismiss changes
                            </Button>
                        </div>
                    </div>
                </div>,
                document.getElementById('settings-save-bar-portal')
            )}
        </div>
    );
}
