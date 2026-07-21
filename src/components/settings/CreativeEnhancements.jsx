import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EnhanceIcon from '@/assets/icons/enhance.svg?react';
import { AlertCircle, ImageOff, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const MAX_SITE_LINKS = 4;

const ENHANCEMENT_SECTIONS = [
    {
        section: "General",
        items: [
            { key: "overlay", label: "Add Overlays", description: "Overlays added that show text you have provided along with your selected ad creative" },
            { key: "visual", label: "Visual Touch-ups", description: "Your chosen media will be automatically cropped and expanded to fit more placements" },
            { key: "text", label: "Text Improvements", description: "Uses your text options to generate improved primary text, headlines, or captions" },
            { key: "cta", label: "Enhance CTA", description: "Opt-in if you want keyphrases from your ad sources to be paired with your CTA" },
            { key: "brightness", label: "Adjust Brightness and Contrast", description: "Opt-in if you want the brightness and contrast of your image to be adjusted" },
            { key: "comments", label: "Relevant Comments", description: "Add relevant comments to your ads to increase engagement" },
            { key: "expandImage", label: "Expand Image", description: "Expand your images to fit different placements and aspect ratios" },
            {
                key: "textGeneration",
                label: "Text Generation",
                description: "Text variations, generated with AI based on your original text or previous ads",
                warning: "Text generation might not be available in some ad accounts, which can lead to errors while launching ads",
            },
            { key: "translate", label: "Translate Text", description: "Adding text translations to your ad can help make your ads more relevant." },
            { key: "reveal", label: "Reveal Details Over Time", description: "Information from your website to be revealed a few seconds after looking at your ad." },
            { key: "summary", label: "Show Summaries", description: "Show AI summary of reviews & selling points from your website above the comments" },
            { key: "animation", label: "Image Animations", description: "Add common movements such as panning, zooming, rotating & more to eligible images" },
            { key: "flexMedia", label: "Flex Media", description: "Adds media you chose for a specific aspect ratio across all placements" },
            { key: "dynamicDescriptions", label: "Dynamic Descriptions", description: "Uses in item information for catalog ads and dynamically chosen descriptions for carousel" },
            { key: "siteExtensions", label: "Add Site Links", description: "Show additional destination links below eligible single image or video ads" },
        ],
    },
    {
        section: "Catalog",
        items: [
            { key: "catalogItems", label: "Add Catalog Items", description: "Items from your catalog might be shown next to your selected media" },
            { key: "dynamicOverlays", label: "Dynamic Overlays", description: "Add information from catalog items as visually-unique overlays" },
        ],
    },
    {
        section: "Carousel",
        items: [
            { key: "highlightCard", label: "Highlight Carousel Card", description: "Automatically highlight the best performing carousel card to show first" },
            { key: "profileEndCard", label: "Profile End Card", description: "Add an end card showing your Page profile to encourage people to visit your Page" },
        ],
    },
];

const ALL_ENHANCEMENT_ITEMS = ENHANCEMENT_SECTIONS.flatMap(section => section.items);

const normalizeImportedSiteLink = (link = {}) => ({
    site_link_title: String(link.site_link_title || ""),
    site_link_url: String(link.site_link_url || ""),
    ...(link.site_link_image_hash && { site_link_image_hash: link.site_link_image_hash }),
    ...(link.site_link_image_url && { site_link_image_url: link.site_link_image_url }),
});

const EnhancementItem = memo(({ item, isChecked, onToggle }) => (
    <div className="flex flex-col">
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="font-medium text-[14px]">{item.label}</p>
                <p className="text-sm text-gray-400">{item.description}</p>
            </div>
            <Switch
                checked={isChecked}
                onCheckedChange={onToggle}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
            />
        </div>
        {item.warning && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle size={14} />
                {item.warning}
            </p>
        )}
    </div>
));

EnhancementItem.displayName = 'EnhancementItem';

const SectionHeader = memo(({ title }) => (
    <div className="mx-[-4px]">
        <div className="bg-gray-200 rounded-xl px-3 py-2">
            <p className="font-semibold text-[14px] text-zinc-700">{title}</p>
        </div>
    </div>
));

SectionHeader.displayName = 'SectionHeader';

function SiteLinksEditor({ siteLinks, setEnhancements, selectedAdAccount }) {
    const [isFetching, setIsFetching] = useState(false);
    const [fetchMessage, setFetchMessage] = useState("");
    const abortRef = useRef(null);
    const autoFetchKeyRef = useRef(null);

    const fetchRecentSiteLinks = useCallback(async ({ automatic = false } = {}) => {
        if (!selectedAdAccount || isFetching) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsFetching(true);
        setFetchMessage("Checking up to 50 recent ads for site links…");

        try {
            const params = new URLSearchParams({ adAccountId: selectedAdAccount });
            const response = await fetch(`${API_BASE_URL}/auth/fetch-recent-site-links?${params}`, {
                credentials: "include",
                signal: controller.signal,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch recent site links");

            const imported = (data.siteLinks || [])
                .map(normalizeImportedSiteLink)
                .filter(link => link.site_link_title.trim() && link.site_link_url.trim())
                .slice(0, MAX_SITE_LINKS);

            if (imported.length > 0) {
                setEnhancements(prev => ({ ...prev, siteLinks: imported }));
                setFetchMessage(`Found ${imported.length} site link${imported.length === 1 ? "" : "s"} after checking ${data.adsScanned || 0} recent ads.`);
                if (!automatic) toast.success("Imported site links from recent ads");
            } else {
                setFetchMessage(`No site links found in ${data.adsScanned || 0} recent ads. Add them below.`);
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Site link discovery failed:", error);
            setFetchMessage("Couldn’t check recent ads. You can enter site links manually or try again.");
            if (!automatic) toast.error("Failed to fetch recent site links");
        } finally {
            if (abortRef.current === controller) {
                setIsFetching(false);
                abortRef.current = null;
            }
        }
    }, [isFetching, selectedAdAccount, setEnhancements]);

    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        const autoFetchKey = selectedAdAccount || null;
        if (!autoFetchKey || siteLinks.length > 0 || autoFetchKeyRef.current === autoFetchKey) return;
        autoFetchKeyRef.current = autoFetchKey;
        fetchRecentSiteLinks({ automatic: true });
    }, [fetchRecentSiteLinks, selectedAdAccount, siteLinks.length]);

    const updateSiteLink = useCallback((index, field, value) => {
        setEnhancements(prev => ({
            ...prev,
            siteLinks: (prev.siteLinks || []).map((link, linkIndex) =>
                linkIndex === index ? { ...link, [field]: value } : link
            ),
        }));
    }, [setEnhancements]);

    const addSiteLink = useCallback(() => {
        setEnhancements(prev => {
            const current = Array.isArray(prev.siteLinks) ? prev.siteLinks : [];
            if (current.length >= MAX_SITE_LINKS) return prev;
            return { ...prev, siteLinks: [...current, { site_link_title: "", site_link_url: "" }] };
        });
    }, [setEnhancements]);

    const removeSiteLink = useCallback((index) => {
        setEnhancements(prev => ({
            ...prev,
            siteLinks: (prev.siteLinks || []).filter((_, linkIndex) => linkIndex !== index),
        }));
    }, [setEnhancements]);

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-zinc-900">Site link destinations</p>
                    <p className="text-xs text-gray-500 mt-0.5">Add up to {MAX_SITE_LINKS} title and URL pairs. Imported thumbnails are kept, but uploads aren’t supported yet.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl shrink-0"
                    onClick={() => fetchRecentSiteLinks()}
                    disabled={!selectedAdAccount || isFetching}
                >
                    {isFetching ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                    {isFetching ? "Checking…" : "Check recent ads"}
                </Button>
            </div>

            {fetchMessage && (
                <p className="text-xs text-gray-500 flex items-center gap-2">
                    {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    {fetchMessage}
                </p>
            )}

            <div className="space-y-3">
                {siteLinks.map((link, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex gap-3 items-start">
                            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                                {link.site_link_image_url ? (
                                    <img src={link.site_link_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageOff className="w-4 h-4 text-gray-300" />
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                                <Input
                                    value={link.site_link_title || ""}
                                    onChange={(event) => updateSiteLink(index, "site_link_title", event.target.value)}
                                    placeholder="Title, e.g. Blog"
                                    className="bg-white rounded-xl"
                                    maxLength={255}
                                />
                                <Input
                                    value={link.site_link_url || ""}
                                    onChange={(event) => updateSiteLink(index, "site_link_url", event.target.value)}
                                    placeholder="https://example.com/blog"
                                    className="bg-white rounded-xl"
                                    inputMode="url"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-gray-400 hover:text-red-600 shrink-0"
                                onClick={() => removeSiteLink(index)}
                                aria-label={`Remove site link ${index + 1}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {siteLinks.length < MAX_SITE_LINKS && (
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addSiteLink}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add site link
                </Button>
            )}
        </div>
    );
}

function CreativeEnhancements({ enhancements, setEnhancements, selectedAdAccount }) {
    const siteLinks = useMemo(
        () => Array.isArray(enhancements?.siteLinks) ? enhancements.siteLinks : [],
        [enhancements?.siteLinks]
    );

    const allEnabled = useMemo(() =>
        ALL_ENHANCEMENT_ITEMS.every(item => enhancements?.[item.key] === true),
        [enhancements]
    );

    const handleToggleAll = useCallback((enabled) => {
        setEnhancements(prev => {
            const newEnhancements = { ...prev };
            ALL_ENHANCEMENT_ITEMS.forEach(item => {
                newEnhancements[item.key] = enabled;
            });
            return newEnhancements;
        });
    }, [setEnhancements]);

    const handleItemToggle = useCallback((key, value) => {
        setEnhancements(prev => ({ ...prev, [key]: value }));
    }, [setEnhancements]);

    return (
        <div className="bg-[#f7f7f7] rounded-2xl p-4 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                    <EnhanceIcon alt="Enhancement Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
                    <div className="flex flex-col">
                        <h3 className="font-medium text-[14px] text-zinc-950">Meta Creative Enhancements</h3>
                        <label className="text-xs text-gray-400">Some enhancements might not be available for some ad accounts</label>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Toggle All</span>
                    <Switch
                        checked={allEnabled}
                        onCheckedChange={handleToggleAll}
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
                    />
                </div>
            </div>

            {ENHANCEMENT_SECTIONS.map(section => (
                <div key={section.section} className="space-y-6">
                    <SectionHeader title={section.section} />
                    {section.items.map(item => (
                        <div key={item.key} className="space-y-3">
                            <EnhancementItem
                                item={item}
                                isChecked={enhancements?.[item.key] || false}
                                onToggle={(value) => handleItemToggle(item.key, value)}
                            />
                            {item.key === "siteExtensions" && enhancements?.siteExtensions && (
                                <SiteLinksEditor
                                    siteLinks={siteLinks}
                                    setEnhancements={setEnhancements}
                                    selectedAdAccount={selectedAdAccount}
                                />
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default memo(CreativeEnhancements);
