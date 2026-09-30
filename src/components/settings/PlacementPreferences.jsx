import { memo } from "react";
import { LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIZES = {
  square: { label: "1 × 1", tint: "border-emerald-200/70 bg-emerald-50 text-emerald-800" },
  four_by_five: { label: "4 × 5", tint: "border-blue-200/70 bg-blue-50 text-blue-800" },
  portrait: { label: "9 × 16", tint: "border-purple-200/70 bg-purple-50 text-purple-800" },
  landscape: { label: "Landscape", tint: "border-orange-200/70 bg-orange-50 text-orange-800" },
};

// Defaults shown here describe square + vertical uploads. Automatic rules also
// adapt to 4:5 and landscape assets, and retain existing account exceptions.
const COLUMNS = [
  {
    name: "Facebook",
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

export function normalizePlacementPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized = Object.fromEntries(PLACEMENT_KEYS.map(key => [key, Object.hasOwn(SIZES, value[key]) ? value[key] : "auto"]));
  // Write all keys when customized so Firestore's merge cannot retain a cleared
  // choice. Null restores automatic behavior for the entire account.
  return Object.values(normalized).some(size => size !== "auto") ? normalized : null;
}

function PlacementPreferences({ value, onChange }) {
  const preferences = normalizePlacementPreferences(value);
  const changePlacement = (key, size) => onChange(normalizePlacementPreferences({ ...preferences, [key]: size }));

  return (
    <div className="bg-[#f7f7f7] rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <LayoutGrid className="w-5 h-5 shrink-0 text-gray-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-[14px] text-zinc-950">Placement asset sizes</h3>
            <p className="text-xs text-gray-400 mt-0.5">Choose which size each placement uses for grouped image or video ads.</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={!preferences} onClick={() => onChange(null)} className="h-7 shrink-0 px-2 text-xs text-gray-500">
          <RotateCcw className="mr-1.5 h-3 w-3" /> Reset
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[540px] table-fixed border-collapse text-left">
          <caption className="sr-only">Asset sizes by placement for Facebook, Instagram, and other platforms</caption>
          <thead>
            <tr className="bg-gray-50/80">
              {COLUMNS.map(column => <th key={column.name} scope="col" className="border-b border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700">{column.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map(sectionIndex => (
              <tr key={sectionIndex}>
                {COLUMNS.map(column => {
                  const section = column.sections[sectionIndex];
                  return (
                    <td key={column.name} className="align-top border-r border-gray-100 p-3 last:border-r-0">
                      {section.placements.length > 0 && <p className="mb-2 text-[10px] font-semibold normal-case text-black">{section.name}</p>}
                      <div className="space-y-2.5">
                        {section.placements.map(([key, label, defaultSize]) => {
                          const selection = preferences?.[key] || "auto";
                          const size = SIZES[selection === "auto" ? defaultSize : selection];
                          return (
                            <div key={key} className="space-y-1">
                              <p className="text-[11px] leading-4 text-gray-600">{label}</p>
                              <Select value={selection} onValueChange={next => changePlacement(key, next)}>
                                <SelectTrigger aria-label={`${column.name}: ${label} asset size`} className={`h-8 rounded-2xl px-2 py-1 text-xs shadow ${size.tint}`}>
                                  <SelectValue><span>{size.label}{selection === "auto" && <span className="ml-1.5 text-[10px] opacity-60">Auto</span>}</span></SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl !bg-white shadow-lg">
                                  <SelectItem value="auto" className="rounded-2xl text-xs focus:bg-gray-100">Automatic</SelectItem>
                                  {Object.entries(SIZES).map(([key, option]) => <SelectItem key={key} value={key} className="rounded-2xl text-xs focus:bg-gray-100">{option.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-[11px] leading-relaxed text-gray-500">
        <p>Auto shows the defaults for 1 × 1 + 9 × 16 uploads and adapts when you add 4 × 5 or landscape. Your existing account rules apply until you change a placement.</p>
        <p>If a chosen size is missing, that placement uses its automatic fallback. Rewarded video applies to videos only. These choices don’t enable placements excluded by your ad set.</p>
      </div>
    </div>
  );
}

export default memo(PlacementPreferences);
