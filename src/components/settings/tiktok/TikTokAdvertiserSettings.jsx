import TikTokIcon from "@/assets/icons/tiktok.svg?react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { saveTikTokSettings } from "@/lib/saveTikTokSettings"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import useTikTokAdvertiserSettings from "@/lib/useTikTokAdvertiserSettings"
import { cn } from "@/lib/utils"
import { Box, Check, ChevronsUpDown, HelpCircle, Layout, Loader, Loader2, RefreshCcw, Save, Target, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import TikTokCopyTemplates from "./TikTokCopyTemplates"
import TikTokLinkParameters from "./TikTokLinkParameters"

const CTA_OPTIONS = [
    { label: "Shop Now", value: "SHOP_NOW" },
    { label: "Learn More", value: "LEARN_MORE" },
    { label: "Sign Up", value: "SIGN_UP" },
    { label: "Contact Us", value: "CONTACT_US" },
    { label: "Book Now", value: "BOOK_NOW" },
    { label: "Apply Now", value: "APPLY_NOW" },
    { label: "Download", value: "DOWNLOAD" },
    { label: "Play Game", value: "PLAY_GAME" },
];

export default function TikTokAdvertiserSettings({ advertisers = [] }) {
    const [selectedAdvertiser, setSelectedAdvertiser] = useState(() => {
        // Auto-select first advertiser if available
        return advertisers.length > 0 ? (advertisers[0].advertiser_id || advertisers[0].id) : null;
    });
    const { settings, setSettings, loading, refetch } = useTikTokAdvertiserSettings(selectedAdvertiser);
    const { isTikTokLoggedIn } = useTikTokAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [identities, setIdentities] = useState([]);
    const [loadingIdentities, setLoadingIdentities] = useState(false);
    const [openIdentity, setOpenIdentity] = useState(false);
    const [openCta, setOpenCta] = useState(false);
    const [openAdvertiser, setOpenAdvertiser] = useState(false);

    const tiktokHeaders = useCallback(() => {
        const uid = localStorage.getItem('tiktok_uid');
        const token = localStorage.getItem('tiktok_token');
        return {
            ...(uid && { 'x-tiktok-user-id': uid }),
            ...(token && { 'x-tiktok-token': token }),
        };
    }, []);

    // Sync selected advertiser if the list changes and nothing is selected
    useEffect(() => {
        if (!selectedAdvertiser && advertisers.length > 0) {
            setSelectedAdvertiser(advertisers[0].advertiser_id || advertisers[0].id);
        }
    }, [advertisers, selectedAdvertiser]);

    // Fetch identities when advertiser changes
    const fetchIdentities = useCallback(() => {
        if (!selectedAdvertiser) return;
        setLoadingIdentities(true);
        fetch(`${import.meta.env.VITE_API_URL}/api/tiktok/fetch-identities?advertiserId=${selectedAdvertiser}&identity_type=BC_AUTH_TT&identity_authorized_bc_id=7580411024059252752`, {
            headers: tiktokHeaders()
        })
            .then(r => r.json())
            .then(d => {
                const list = d.identities || [];
                // Add fallback for customized user if not present
                if (!list.find(i => i.identity_id === 'CUSTOMIZED_USER')) {
                    list.push({ identity_id: 'CUSTOMIZED_USER', display_name: 'Customized User', identity_type: 'CUSTOMIZED_USER' });
                }
                setIdentities(list);
            })
            .catch(e => console.error(e))
            .finally(() => setLoadingIdentities(false));
    }, [selectedAdvertiser, tiktokHeaders]);

    useEffect(() => {
        fetchIdentities();
    }, [fetchIdentities]);

    const handleSave = async (updatedSettings = settings) => {
        if (!selectedAdvertiser) return;
        setIsSaving(true);
        try {
            await saveTikTokSettings(selectedAdvertiser, updatedSettings);
            toast.success("Settings saved successfully");
            refetch();
        } catch (err) {
            toast.error("Failed to save settings");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
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

    if (loading && !settings) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
            </div>
        );
    }

    const currentSettings = settings || {};

    const currentAdvertiser = advertisers.find(a => (a.advertiser_id || a.id) === selectedAdvertiser);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Advertiser Selector Card */}
            <div className="bg-white rounded-[2.5rem] border border-gray-200 p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                        <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Advertiser Account</p>
                        <Popover open={openAdvertiser} onOpenChange={setOpenAdvertiser}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent flex items-center gap-1 font-bold text-lg text-gray-900">
                                    {currentAdvertiser?.name || "Select Account"}
                                    <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-1" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-1 bg-white rounded-2xl shadow-2xl border-gray-100">
                                <Command>
                                    <CommandInput placeholder="Search accounts..." />
                                    <CommandList>
                                        <CommandEmpty>No accounts found.</CommandEmpty>
                                        <CommandGroup>
                                            {advertisers.map(a => {
                                                const id = a.advertiser_id || a.id;
                                                return (
                                                    <CommandItem
                                                        key={id}
                                                        onSelect={() => {
                                                            setSelectedAdvertiser(id);
                                                            setOpenAdvertiser(false);
                                                        }}
                                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <span className="text-sm font-medium">{a.name}</span>
                                                        {selectedAdvertiser === id && <Check className="w-4 h-4" />}
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <Button
                    onClick={() => handleSave()}
                    disabled={isSaving || !selectedAdvertiser}
                    className="h-12 px-8 rounded-2xl bg-black text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save All
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Core Defaults */}
                <div className="space-y-6">
                    {/* Identity & CTA Defaults */}
                    <Card className="rounded-[2.5rem] border-gray-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Launch Defaults
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Default Identity - Redesigned to match Meta PageSelectors */}
                            <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <TikTokIcon
                                            className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
                                        />
                                        <label className="text-sm text-zinc-950 block font-medium">
                                            Default Linked TikTok Account
                                        </label>
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
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">TikTok Identity</label>
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
                                                                <>
                                                                    {(found?.avatar_url || found?.identity_type === 'CUSTOMIZED_USER') && (
                                                                        <img
                                                                            src={found?.avatar_url || "https://api.withblip.com/backup_page_image.png"}
                                                                            alt="Identity"
                                                                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                                                        />
                                                                    )}
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {found?.display_name || "Select TikTok Identity"}
                                                                    </span>
                                                                </>
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
                                                            <img
                                                                src={i.avatar_url || "https://api.withblip.com/backup_page_image.png"}
                                                                alt={i.display_name}
                                                                className="w-7 h-7 rounded-full object-cover"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-gray-900">{i.display_name}</span>
                                                                <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">{i.identity_type}</span>
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

                            {/* Default CTAs */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Default Call to Actions (Multi-select)</Label>
                                <Popover open={openCta} onOpenChange={setOpenCta}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-12 rounded-2xl border-gray-200 justify-between px-4">
                                            <span className="text-sm truncate">
                                                {currentSettings.defaultCTAs?.length > 0
                                                    ? currentSettings.defaultCTAs.map(v => CTA_OPTIONS.find(o => o.value === v)?.label).join(", ")
                                                    : "None selected"}
                                            </span>
                                            <ChevronsUpDown className="w-4 h-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white rounded-2xl shadow-xl border-gray-100">
                                        <Command>
                                            <CommandInput placeholder="Search CTAs..." />
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
                                                            <span className="text-xs font-medium">{opt.label}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Interactive Add-ons Info */}
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3">
                                <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Interactive Add-ons</p>
                                    <p className="text-[10px] text-blue-500/80 leading-relaxed font-medium">
                                        TikTok Interactive Add-ons (music, stickers, etc.) cannot be configured via API.
                                        Please set these in TikTok Ads Manager directly.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Links & UTMs */}
                    <TikTokLinkParameters
                        advertiserId={selectedAdvertiser}
                        links={currentSettings.links || []}
                        setLinks={(links) => setSettings({ ...currentSettings, links })}
                        utmPairs={currentSettings.defaultUTMs || []}
                        setUtmPairs={(defaultUTMs) => setSettings({ ...currentSettings, defaultUTMs })}
                        thirdPartyTrackingUrl={currentSettings.thirdPartyTrackingUrl || ""}
                        setThirdPartyTrackingUrl={(thirdPartyTrackingUrl) => setSettings({ ...currentSettings, thirdPartyTrackingUrl })}
                    />
                </div>

                {/* Right Column: Content & Templates */}
                <div className="space-y-6">
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

                    {/* Product Management */}
                    <Card className="rounded-[2.5rem] border-gray-200 shadow-sm overflow-hidden opacity-50 grayscale pointer-events-none">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Box className="w-4 h-4" />
                                Product Inventory (Coming Soon)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-12 text-center space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Multiple Product Selection</p>
                            <p className="text-[10px] text-gray-400 font-medium max-w-[200px] mx-auto">Soon you'll be able to save multiple products and switch between them in the launcher.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
