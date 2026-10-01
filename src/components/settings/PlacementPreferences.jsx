import { memo } from "react";
import { LayoutPanelLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import FacebookIcon from "@/assets/icons/signup/facebook.svg";
import InstagramIcon from "@/assets/icons/signup/instagram.svg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIZES = {
  square: { label: "1 × 1", tint: "border-emerald-200/70 bg-emerald-50 text-emerald-800" },
  four_by_five: { label: "4 × 5", tint: "border-blue-200/70 bg-blue-50 text-blue-800" },
  portrait: { label: "9 × 16", tint: "border-purple-200/70 bg-purple-50 text-purple-800" },
  landscape: { label: "Landscape", tint: "border-orange-200/70 bg-orange-50 text-orange-800" },
};

const SIZE_ORDER = ["portrait", "square", "four_by_five", "landscape"];

// Baseline placement groups used to initialize a selected size combination.
const COLUMNS = [
  {
    name: "Facebook",
    icon: FacebookIcon,
    sections: [
      { name: "Vertical placements", placements: [
        ["facebook:story", "Stories", "portrait"],
        ["facebook:facebook_reels", "Reels", "portrait"],
      ] },
      { name: "Feed placements", placements: [
        ["facebook:feed", "Feed", "square"],
        ["facebook:profile_feed", "Profile feed", "square"],
        ["facebook:marketplace", "Marketplace", "square"],
        ["facebook:video_feeds", "Video feeds", "square"],
        ["facebook:instream_video", "In-stream video", "square"],
        ["facebook:facebook_reels_overlay", "Reels overlay", "square"],
        ["facebook:biz_disco_feed", "Business Explore", "square"],
        ["facebook:notification", "Notifications", "square"],
      ] },
      { name: "Other placements", placements: [
        ["facebook:right_hand_column", "Right-hand column", "square"],
        ["facebook:search", "Search results", "square"],
      ] },
    ],
  },
  {
    name: "Instagram",
    icon: InstagramIcon,
    sections: [
      { name: "Vertical placements", placements: [
        ["instagram:story", "Stories", "portrait"],
        ["instagram:reels", "Reels", "portrait"],
        ["instagram:profile_reels", "Profile reels", "portrait"],
        ["instagram:ig_search", "Search results", "portrait"],
      ] },
      { name: "Feed placements", placements: [
        ["instagram:stream", "Feed", "square"],
        ["instagram:profile_feed", "Profile feed", "square"],
        ["instagram:explore", "Explore", "square"],
        ["instagram:explore_home", "Explore home", "square"],
      ] },
      { name: "Other placements", placements: [] },
    ],
  },
  {
    name: "Others",
    sections: [
      { name: "Vertical placements", placements: [
        ["messenger:story", "Messenger Stories", "portrait"],
        ["audience_network:classic", "Audience Network", "portrait"],
        ["audience_network:rewarded_video", "Rewarded video", "portrait"],
      ] },
      { name: "Feed placements", placements: [
        ["threads:threads_stream", "Threads feed", "square"],
      ] },
      { name: "Other placements", placements: [] },
    ],
  },
];

const PLACEMENT_KEYS = COLUMNS.flatMap(column => column.sections.flatMap(section => section.placements.map(([key]) => key)));
const BASELINE_SIZES = Object.fromEntries(COLUMNS.flatMap(column => column.sections.flatMap(section => section.placements.map(([key, , size]) => [key, size]))));

function defaultPlacementSize(key, selectedSizes) {
  const has = size => selectedSizes.includes(size);
  const feedSize = ["square", "four_by_five", "landscape", "portrait"].find(has);
  const verticalSize = has("portrait") ? "portrait" : feedSize;
  if (key === "instagram:stream" && has("four_by_five")) return "four_by_five";
  if (key === "facebook:right_hand_column" || key === "facebook:search") return has("landscape") ? "landscape" : feedSize;
  if (key.startsWith("audience_network:") && selectedSizes.length === 4) return "landscape";
  return BASELINE_SIZES[key] === "portrait" ? verticalSize : feedSize;
}

function retainedPlacementSize(size, selectedSizes) {
  if (selectedSizes.includes(size)) return size;
  if (size === "four_by_five" && selectedSizes.includes("square")) return "square";
  if (size === "square" && selectedSizes.includes("four_by_five")) return "four_by_five";
  return null;
}

export function normalizePlacementPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const selectedSizes = Array.isArray(value.selectedSizes) ? SIZE_ORDER.filter(size => value.selectedSizes.includes(size)) : null;
  if (selectedSizes?.length === 0) return null;
  const normalized = Object.fromEntries(PLACEMENT_KEYS.map(key => [key,
    Object.hasOwn(SIZES, value[key]) && (!selectedSizes || selectedSizes.includes(value[key])) ? value[key] : "auto",
  ]));
  if (selectedSizes) {
    normalized.selectedSizes = selectedSizes;
    normalized.customizedPlacements = PLACEMENT_KEYS.filter(key => Array.isArray(value.customizedPlacements) && value.customizedPlacements.includes(key) && normalized[key] !== "auto");
    return normalized;
  }
  // Write all keys when customized so Firestore's merge cannot retain a cleared
  // choice. Preserve older saved maps until the user edits this section.
  return Object.values(normalized).some(size => size !== "auto") ? normalized : null;
}

function PlacementPreferences({ value, onChange }) {
  const preferences = normalizePlacementPreferences(value);
  const selectedSizes = preferences?.selectedSizes || (preferences
    ? SIZE_ORDER.filter(size => size === "square" || size === "portrait" || PLACEMENT_KEYS.some(key => preferences[key] === size))
    : []);
  const canCustomize = selectedSizes.length >= 2;
  const customizedPlacements = preferences?.customizedPlacements || PLACEMENT_KEYS.filter(key => Object.hasOwn(SIZES, preferences?.[key]));

  const buildPreferences = (sizes, manualKeys) => normalizePlacementPreferences({
    ...Object.fromEntries(PLACEMENT_KEYS.map(key => [key,
      (manualKeys.includes(key) && retainedPlacementSize(preferences?.[key], sizes)) || defaultPlacementSize(key, sizes),
    ])),
    selectedSizes: sizes,
    customizedPlacements: manualKeys.filter(key => retainedPlacementSize(preferences?.[key], sizes)),
  });
  const changeSizes = (size, checked) => {
    const sizes = SIZE_ORDER.filter(candidate => candidate === size ? checked : selectedSizes.includes(candidate));
    onChange(buildPreferences(sizes, customizedPlacements));
  };
  const changePlacement = (key, size) => onChange(normalizePlacementPreferences({
    ...buildPreferences(selectedSizes, customizedPlacements),
    [key]: size,
    customizedPlacements: [...new Set([...customizedPlacements, key])],
  }));

  return (
    <div className="bg-[#f7f7f7] rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <LayoutPanelLeft className="w-5 h-5 shrink-0 text-gray-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-[14px] text-zinc-950">Placement asset sizes</h3>
            <p className="text-xs text-gray-400 mt-0.5">Choose which size each placement uses for grouped image or video ads.</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={!preferences} onClick={() => onChange(null)} className="h-7 shrink-0 gap-1 px-2 text-xs text-gray-500">
          <RotateCcw className="!h-2.5 !w-2.5" /> Reset
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-black">Asset sizes</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SIZE_ORDER.map(size => (
            <label key={size} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
              <Checkbox checked={selectedSizes.includes(size)} onCheckedChange={checked => changeSizes(size, checked === true)} className="rounded-md border-gray-300" />
              {SIZES[size].label}
            </label>
          ))}
        </div>
        {!canCustomize && <p className="text-[11px] text-gray-500">Select at least two sizes to customize placements.</p>}
      </fieldset>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
      <div tabIndex={canCustomize ? undefined : 0} aria-disabled={!canCustomize} className={`overflow-x-auto ${canCustomize ? "" : "opacity-50"}`}>
        <div className={`min-w-[540px] space-y-2.5 ${canCustomize ? "" : "pointer-events-none"}`}>
          <div className="grid grid-cols-3 gap-3">
            {COLUMNS.map(column => (
              <h4 key={column.name} className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700">
                {column.icon && <img src={column.icon} alt="" className="h-4 w-4 shrink-0 object-contain" />}
                {column.name}
              </h4>
            ))}
          </div>
          <div className="grid grid-cols-3 items-start gap-3">
            {COLUMNS.map(column => (
              <div key={column.name} role="group" aria-label={`${column.name} placements`} className="min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-white p-3">
                {column.sections.filter(section => section.placements.length > 0).map(section => (
                  <div key={section.name}>
                    <p className="mb-2 text-[10px] font-semibold normal-case text-black">{section.name}</p>
                    <div className="space-y-2.5">
                      {section.placements.map(([key, label]) => {
                        const selection = canCustomize
                          ? (selectedSizes.includes(preferences?.[key]) ? preferences[key] : defaultPlacementSize(key, selectedSizes))
                          : "";
                        const size = SIZES[selection];
                        return (
                          <div key={key} className="space-y-1">
                            <p className="text-[11px] leading-4 text-gray-600">{label}</p>
                            <Select disabled={!canCustomize} value={selection} onValueChange={next => changePlacement(key, next)}>
                              <SelectTrigger aria-label={`${column.name}: ${label} asset size`} className={`h-8 rounded-2xl px-2 py-1 text-xs shadow ${size?.tint || "border-gray-200 bg-white text-gray-400"}`}>
                                <SelectValue placeholder="Select sizes">{size?.label}</SelectValue>
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl bg-white !bg-white shadow-lg [&_[data-radix-select-viewport]]:!bg-white">
                                {selectedSizes.map(size => <SelectItem key={size} value={size} className="rounded-2xl text-xs focus:bg-gray-100">{SIZES[size].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
          </TooltipTrigger>
          {!canCustomize && (
            <TooltipContent className="rounded-xl bg-zinc-800 text-white">
              Please select 2 asset sizes to customize placements.
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <p className="text-[11px] font-bold leading-relaxed text-gray-500">* These choices don’t enable placements excluded by your ad set.</p>
    </div>
  );
}

export default memo(PlacementPreferences);
