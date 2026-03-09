// import { useCallback, useMemo, memo } from "react";
// import { Switch } from "@/components/ui/switch";
// import EnhanceIcon from '@/assets/icons/enhance.svg?react';
// import { AlertCircle } from 'lucide-react';


// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// // Move constants outside component to prevent recreation on every render
// const ENHANCEMENT_ITEMS = [
//     {
//         key: "overlay",
//         label: "Add Overlays",
//         description: "Overlays added that show text you have provided along with your selected ad creative",
//     },
//     {
//         key: "visual",
//         label: "Visual Touch-ups",
//         description: "Your chosen media will be automatically cropped and expanded to fit more placements",
//     },
//     {
//         key: "text",
//         label: "Text Improvements",
//         description: "Uses your text options to generate improved primary text, headlines, or captions",
//     },
//     {
//         key: "cta",
//         label: "Enhance CTA",
//         description: "Opt-in if you want keyphrases from your ad sources to be paired with your CTA",
//     },
//     {
//         key: "brightness",
//         label: "Adjust Brightness and Contrast",
//         description: "Opt-in if you want the brightness and contrast of your image to be adjusted",
//     },
//     {
//         key: "comments",
//         label: "Relevant Comments",
//         description: "Add relevant comments to your ads to increase engagement",
//     },
//     {
//         key: "expandImage",
//         label: "Expand Image",
//         description: "Expand your images to fit different placements and aspect ratios",
//     },
//     {
//         key: "catalogItems",
//         label: "Add Catalog Items",
//         description: "Items from your catalog might be shown next to your selected media",
//     },
//     {
//         key: "textGeneration",
//         label: "Text Generation",
//         description: "Text variations, generated with AI based on your original text or previous ads",
//         warning: "Text generation might not be available in some ad accounts, which can lead to errors while launching ads",

//     },

//     //new CE
//     {
//         key: "translate",
//         label: "Translate Text",
//         description: "Adding text translations to your ad can help make your ads more relevant.",
//     },
//     {
//         key: "reveal",
//         label: "Reveal Details Over Time",
//         description: "Information from your website to be revealed a few seconds after looking at your ad.",
//     },
//     {
//         key: "summary",
//         label: "Show Summaries",
//         description: "Show AI summary of reviews & selling points from your website above the comments",
//     },
//     {
//         key: "animation",
//         label: "Image Animations",
//         description: "Add common movements such as panning, zooming, rotating & more to eligible images",
//     },
//     {
//         key: "highlightCard",
//         label: "Highlight Carousel Card",
//         description: "Automatically highlight the best performing carousel card to show first",
//     },
//     {
//         key: "profileEndCard",
//         label: "Profile End Card",
//         description: "Add an end card showing your Page profile to encourage people to visit your Page",
//     },
//     {
//         key: "dynamicDescriptions",
//         label: "Dynamic Descriptions",
//         description: "Uses in item information for catalog ads and dyanmically chosen descriptions for carousel",
//     },
//     {
//         key: "flexMedia",
//         label: "Flex Media",
//         description: "Adds media you chose for a specific aspect ratio across all placements",
//     },
//     {
//         key: "dynamicOverlays",
//         label: "Dynamic Overlays",
//         description: "Add information from catalog items as visually-unique overlays",
//     },
//     {
//         key: "mediaTypeAutomation",
//         label: "Dynamic Media",
//         description: "If you want videos from your catalog to be displayed (along with images) in supported placements.",
//     },



// ];

// // Memoized individual enhancement item component to prevent unnecessary re-renders
// const EnhancementItem = memo(({ item, isChecked, onToggle }) => (
//     <div className="flex flex-col">
//         <div className="flex items-center justify-between">
//             <div>
//                 <p className="font-medium text-[14px]">{item.label}</p>
//                 <p className="text-sm text-gray-400">
//                     {item.description}
//                 </p>
//             </div>
//             <Switch
//                 checked={isChecked}
//                 onCheckedChange={onToggle}
//                 className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
//             />
//         </div>
//         {item.warning && (
//             <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
//                 <AlertCircle size={14} />
//                 {item.warning}
//             </p>
//         )}
//     </div>
// ));

// EnhancementItem.displayName = 'EnhancementItem';

// function CreativeEnhancements({ enhancements, setEnhancements }) {
//     // Memoize the "all enabled" calculation
//     const allEnabled = useMemo(() =>
//         ENHANCEMENT_ITEMS.every(item => enhancements?.[item.key] === true),
//         [enhancements]
//     );

//     // Memoized toggle all handler
//     const handleToggleAll = useCallback((enabled) => {
//         const newEnhancements = {};
//         ENHANCEMENT_ITEMS.forEach(item => {
//             newEnhancements[item.key] = enabled;
//         });
//         setEnhancements(newEnhancements);
//     }, [setEnhancements]);

//     // Single memoized handler for all items - more efficient for many items
//     const handleItemToggle = useCallback((key, value) => {
//         setEnhancements((prev) => ({ ...prev, [key]: value }));
//     }, [setEnhancements]);

//     // Memoize the enhancement items with their current state
//     const enhancementItemsWithState = useMemo(() =>
//         ENHANCEMENT_ITEMS.map(item => ({
//             ...item,
//             isChecked: enhancements?.[item.key] || false,
//             onToggle: (val) => handleItemToggle(item.key, val)
//         })),
//         [enhancements, handleItemToggle]
//     );

//     return (
//         <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-6">
//             <div className="flex items-center justify-between">
//                 <div className="flex items-start gap-2">
//                     <EnhanceIcon
//                         alt="Enhancement Icon"
//                         className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
//                     />
//                     <div className="flex flex-col">
//                         <h3 className="font-medium text-[14px] text-zinc-950">
//                             Meta Creative Enhancements
//                         </h3>
//                         <label className="text-xs text-gray-400">
//                             Some enhancements might not be available for some ad accounts
//                         </label>
//                     </div>

//                 </div>
//                 <div className="flex items-center gap-2">
//                     <span className="text-sm text-gray-600">
//                         Toggle All
//                     </span>
//                     <Switch
//                         checked={allEnabled}
//                         onCheckedChange={handleToggleAll}
//                         className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
//                     />
//                 </div>
//             </div>

//             {enhancementItemsWithState.map((item) => (
//                 <EnhancementItem
//                     key={item.key}
//                     item={item}
//                     isChecked={item.isChecked}
//                     onToggle={item.onToggle}
//                 />
//             ))}
//         </div>
//     );
// }

// export default memo(CreativeEnhancements);

import { useCallback, useMemo, memo } from "react";
import { Switch } from "@/components/ui/switch";
import EnhanceIcon from '@/assets/icons/enhance.svg?react';
import { AlertCircle } from 'lucide-react';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// Move constants outside component to prevent recreation on every render
const ENHANCEMENT_SECTIONS = [
    {
        section: "General",
        items: [
            {
                key: "overlay",
                label: "Add Overlays",
                description: "Overlays added that show text you have provided along with your selected ad creative",
            },
            {
                key: "visual",
                label: "Visual Touch-ups",
                description: "Your chosen media will be automatically cropped and expanded to fit more placements",
            },
            {
                key: "text",
                label: "Text Improvements",
                description: "Uses your text options to generate improved primary text, headlines, or captions",
            },
            {
                key: "cta",
                label: "Enhance CTA",
                description: "Opt-in if you want keyphrases from your ad sources to be paired with your CTA",
            },
            {
                key: "brightness",
                label: "Adjust Brightness and Contrast",
                description: "Opt-in if you want the brightness and contrast of your image to be adjusted",
            },
            {
                key: "comments",
                label: "Relevant Comments",
                description: "Add relevant comments to your ads to increase engagement",
            },
            {
                key: "expandImage",
                label: "Expand Image",
                description: "Expand your images to fit different placements and aspect ratios",
            },
            {
                key: "textGeneration",
                label: "Text Generation",
                description: "Text variations, generated with AI based on your original text or previous ads",
                warning: "Text generation might not be available in some ad accounts, which can lead to errors while launching ads",
            },
            {
                key: "translate",
                label: "Translate Text",
                description: "Adding text translations to your ad can help make your ads more relevant.",
            },
            {
                key: "reveal",
                label: "Reveal Details Over Time",
                description: "Information from your website to be revealed a few seconds after looking at your ad.",
            },
            {
                key: "summary",
                label: "Show Summaries",
                description: "Show AI summary of reviews & selling points from your website above the comments",
            },
            {
                key: "animation",
                label: "Image Animations",
                description: "Add common movements such as panning, zooming, rotating & more to eligible images",
            },
            {
                key: "flexMedia",
                label: "Flex Media",
                description: "Adds media you chose for a specific aspect ratio across all placements",
            },
            {
                key: "dynamicDescriptions",
                label: "Dynamic Descriptions",
                description: "Uses in item information for catalog ads and dynamically chosen descriptions for carousel",
            },
        ],
    },
    {
        section: "Catalog",
        items: [
            {
                key: "catalogItems",
                label: "Add Catalog Items",
                description: "Items from your catalog might be shown next to your selected media",
            },
            {
                key: "dynamicOverlays",
                label: "Dynamic Overlays",
                description: "Add information from catalog items as visually-unique overlays",
            },
            {
                key: "mediaTypeAutomation",
                label: "Dynamic Media",
                description: "If you want videos from your catalog to be displayed (along with images) in supported placements.",
            },
        ],
    },
    {
        section: "Carousel",
        items: [
            {
                key: "highlightCard",
                label: "Highlight Carousel Card",
                description: "Automatically highlight the best performing carousel card to show first",
            },
            {
                key: "profileEndCard",
                label: "Profile End Card",
                description: "Add an end card showing your Page profile to encourage people to visit your Page",
            },
        ],
    },
];

// Flat list of all items for toggle-all logic
const ALL_ENHANCEMENT_ITEMS = ENHANCEMENT_SECTIONS.flatMap(s => s.items);

// Memoized individual enhancement item component to prevent unnecessary re-renders
const EnhancementItem = memo(({ item, isChecked, onToggle }) => (
    <div className="flex flex-col">
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-[14px]">{item.label}</p>
                <p className="text-sm text-gray-400">
                    {item.description}
                </p>
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

function CreativeEnhancements({ enhancements, setEnhancements }) {
    // Memoize the "all enabled" calculation
    const allEnabled = useMemo(() =>
        ALL_ENHANCEMENT_ITEMS.every(item => enhancements?.[item.key] === true),
        [enhancements]
    );

    // Memoized toggle all handler
    const handleToggleAll = useCallback((enabled) => {
        const newEnhancements = {};
        ALL_ENHANCEMENT_ITEMS.forEach(item => {
            newEnhancements[item.key] = enabled;
        });
        setEnhancements(newEnhancements);
    }, [setEnhancements]);

    // Single memoized handler for all items
    const handleItemToggle = useCallback((key, value) => {
        setEnhancements((prev) => ({ ...prev, [key]: value }));
    }, [setEnhancements]);

    return (
        <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                    <EnhanceIcon
                        alt="Enhancement Icon"
                        className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
                    />
                    <div className="flex flex-col">
                        <h3 className="font-medium text-[14px] text-zinc-950">
                            Meta Creative Enhancements
                        </h3>
                        <label className="text-xs text-gray-400">
                            Some enhancements might not be available for some ad accounts
                        </label>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        Toggle All
                    </span>
                    <Switch
                        checked={allEnabled}
                        onCheckedChange={handleToggleAll}
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
                    />
                </div>
            </div>

            {ENHANCEMENT_SECTIONS.map((section) => (
                <div key={section.section} className="space-y-6">
                    <SectionHeader title={section.section} />
                    {section.items.map((item) => (
                        <EnhancementItem
                            key={item.key}
                            item={item}
                            isChecked={enhancements?.[item.key] || false}
                            onToggle={(val) => handleItemToggle(item.key, val)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default memo(CreativeEnhancements);