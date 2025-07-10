// import { useState, useEffect } from "react";
// import { Switch } from "@/components/ui/switch";

// export default function CreativeEnhancements({ enhancements, setEnhancements }) {
//     return (
//         <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-4">
//             <div className="flex items-center gap-2">
//                 <img
//                     src="https://meta-ad-uploader-server-production.up.railway.app/icons/enhance.svg"
//                     alt="Enhancement Icon"
//                     className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
//                 />
//                 <h3 className="font-medium text-[14px] text-zinc-950">
//                     Meta Creative Enhancements
//                 </h3>
//             </div>

//             {[
//                 {
//                     key: "overlay",
//                     label: "Add Overlay",
//                     description: "Overlays added that show text you have provided along with your selected ad creative",
//                 },
//                 {
//                     key: "visual",
//                     label: "Visual Touch Ups",
//                     description: "Your chosen media will be automatically cropped and expanded to fit more placements",
//                 },
//                 {
//                     key: "text",
//                     label: "Text Improvements",
//                     description: "Uses your text options to generate improved primary text, headlines, or captions",
//                 },
//                 {
//                     key: "cta",
//                     label: "Enhance CTA",
//                     description: "Opt-in if you want keyphrases from your ad sources to be paired with your CTA",
//                 },
//                 {
//                     key: "brightness",
//                     label: "Adjust Brightness and Contrast",
//                     description: "Opt-in if you want the brightness and contrast of your image to be adjusted",
//                 },
//             ]
//                 .map((item) => (
//                     <div key={item.key} className="flex items-center justify-between">
//                         <div>
//                             <p className="font-medium text-[14px]">{item.label}</p>
//                             <p className="text-sm text-gray-400">
//                                 {item.description}
//                             </p>
//                         </div>
//                         <Switch
//                             checked={enhancements?.[item.key] || false}
//                             onCheckedChange={(val) =>
//                                 setEnhancements((prev) => ({ ...prev, [item.key]: val }))
//                             }
//                             className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
//                         />
//                     </div>
//                 ))}

//         </div>
//     );
// }
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

export default function CreativeEnhancements({ enhancements, setEnhancements }) {
    const enhancementItems = [
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
            key: "catalogItems",
            label: "Add Catalog Items",
            description: "Items from your catalog might be shown next to your selected media",
        },
        {
            key: "textGeneration",
            label: "Text Generation",
            description: "Text variations, generated with AI based on your original text or previous ads",
        },
    ];

    const allEnabled = enhancementItems.every(item => enhancements?.[item.key]);
    const someEnabled = enhancementItems.some(item => enhancements?.[item.key]);

    const handleToggleAll = (enabled) => {
        const newEnhancements = {};
        enhancementItems.forEach(item => {
            newEnhancements[item.key] = enabled;
        });
        setEnhancements(newEnhancements);
    };

    return (
        <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img
                        src="https://meta-ad-uploader-server-production.up.railway.app/icons/enhance.svg"
                        alt="Enhancement Icon"
                        className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60"
                    />
                    <h3 className="font-medium text-[14px] text-zinc-950">
                        Meta Creative Enhancements
                    </h3>
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

            {enhancementItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-[14px]">{item.label}</p>
                        <p className="text-sm text-gray-400">
                            {item.description}
                        </p>
                    </div>
                    <Switch
                        checked={enhancements?.[item.key] || false}
                        onCheckedChange={(val) =>
                            setEnhancements((prev) => ({ ...prev, [item.key]: val }))
                        }
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-transparent .switch"
                    />
                </div>
            ))}
        </div>
    );
}