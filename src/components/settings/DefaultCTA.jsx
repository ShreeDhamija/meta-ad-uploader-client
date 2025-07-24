// import { useState } from "react"
// import {
//     Select,
//     SelectTrigger,
//     SelectValue,
//     SelectContent,
//     SelectItem,
// } from "@/components/ui/select"

// const CTA_OPTIONS = [
//     { label: "Learn More", value: "LEARN_MORE" },
//     { label: "Shop Now", value: "SHOP_NOW" },
//     { label: "Sign Up", value: "SIGN_UP" },
//     { label: "Apply Now", value: "APPLY_NOW" },
//     { label: "Download", value: "DOWNLOAD" },
//     { label: "Get Offer", value: "GET_OFFER" },
//     { label: "Contact Us", value: "CONTACT_US" },
//     { label: "Book Now", value: "BOOK_NOW" },
//     { label: "Subscribe", value: "SUBSCRIBE" },
//     { label: "See More", value: "SEE_MORE" }
// ]


// export default function DefaultCTA({ defaultCTA, setDefaultCTA }) {
//     //const [defaultCTA, setDefaultCTA] = useState("Learn More")

//     return (
//         <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-4 w-full max-w-3xl">
//             {/* Section Header */}
//             <div className="space-y-2">
//                 <div className="flex items-center gap-2">
//                     <img src="https://unpkg.com/@mynaui/icons/icons/click.svg"
//                         alt="CTA icon"
//                         className="w-4 h-4 grayscale brightness-75 contrast-75 opacity-60"
//                     />
//                     <span className="text-sm font-medium">Default CTA</span>

//                 </div>
//                 <p className="text-gray-500 text-[12px] font-regular">
//                     Your ads will use this CTA by default if not edited while posting
//                 </p>
//             </div>

//             {/* Dropdown */}
//             <Select value={defaultCTA} onValueChange={setDefaultCTA}>
//                 <SelectTrigger className="w-full rounded-xl px-3 py-2 text-sm justify-between bg-white">
//                     <SelectValue className="truncate" />
//                 </SelectTrigger>
//                 <SelectContent className="rounded-xl bg-white py-2 max-h-full  pt-1">
//                     {CTA_OPTIONS.map((cta) => (
//                         <SelectItem
//                             key={cta.value}
//                             value={cta.value}
//                             className="data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:font-semibold rounded-xl py-2"
//                         >
//                             {cta.label}
//                         </SelectItem>
//                     ))}
//                 </SelectContent>
//             </Select>
//         </div>
//     )
// }

import { memo, useMemo } from "react"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"

// Move constants outside component to prevent recreation on every render
const CTA_OPTIONS = [
    { label: "Learn More", value: "LEARN_MORE" },
    { label: "Shop Now", value: "SHOP_NOW" },
    { label: "Sign Up", value: "SIGN_UP" },
    { label: "Apply Now", value: "APPLY_NOW" },
    { label: "Download", value: "DOWNLOAD" },
    { label: "Get Offer", value: "GET_OFFER" },
    { label: "Contact Us", value: "CONTACT_US" },
    { label: "Book Now", value: "BOOK_NOW" },
    { label: "Subscribe", value: "SUBSCRIBE" },
    { label: "See More", value: "SEE_MORE" }
];

function DefaultCTA({ defaultCTA, setDefaultCTA }) {
    // Since CTA_OPTIONS is static, we can memoize the entire mapping
    const ctaOptions = useMemo(() =>
        CTA_OPTIONS.map((cta) => (
            <SelectItem
                key={cta.value}
                value={cta.value}
                className="data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:font-semibold rounded-xl space-y-2"
            >
                {cta.label}
            </SelectItem>
        )),
        [] // Empty dependency array since CTA_OPTIONS is constant
    );

    return (
        <div className="p-4 bg-[#f5f5f5] rounded-xl space-y-4 w-full max-w-3xl">
            {/* Section Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <img
                        src="https://unpkg.com/@mynaui/icons/icons/click.svg"
                        alt="CTA icon"
                        className="w-4 h-4 grayscale brightness-75 contrast-75 opacity-60"
                    />
                    <span className="text-sm font-medium">Default CTA</span>
                </div>
                <p className="text-gray-500 text-[12px] font-regular">
                    Your ads will use this CTA by default if not edited while posting
                </p>
            </div>

            {/* Dropdown */}
            <Select value={defaultCTA} onValueChange={setDefaultCTA}>
                <SelectTrigger className="w-full rounded-xl px-3 py-2 text-sm justify-between bg-white">
                    <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white py-2 max-h-full pt-1">
                    {ctaOptions}
                </SelectContent>
            </Select>
        </div>
    );
}

export default memo(DefaultCTA);