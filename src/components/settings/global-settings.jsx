import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import "../../settings.css"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveSettings } from "@/lib/saveSettings"
import useGlobalSettings from "@/lib/useGlobalSettings";
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts";
import { Infotooltip } from "@/components/ui/infotooltip"



export default function GlobalSettings() {


  const [customThumbnail, setCustomThumbnail] = useState(false)
  const { adNameFormula } = useGlobalSettings();
  const defaultOrder = ["adType", "dateType", "fileName", "iteration"];

  const [adOrder, setAdOrder] = useState(() => adNameFormula.order || defaultOrder);
  const [adValues, setAdValues] = useState(() => ({
    dateType: adNameFormula.values?.dateType || "MonthYYYY",
  }));
  const [selectedAdNameItems, setSelectedAdNameItems] = useState(() => adNameFormula.selected || []);
  const [customAdNameText, setCustomAdNameText] = useState("")



  useEffect(() => {
    if (adNameFormula && adNameFormula.order) {
      const mergedOrder = Array.from(new Set([...(adNameFormula.order || []), "iteration"]));
      setAdOrder(mergedOrder);
    } else {
      setAdOrder(defaultOrder);
    }

    if (adNameFormula && adNameFormula.values) {
      setAdValues({
        dateType: adNameFormula.values.dateType || "MonthYYYY", // ✅ Only dateType
      });
    }

    if (adNameFormula && adNameFormula.selected) {
      setSelectedAdNameItems(adNameFormula.selected);
    }
  }, [adNameFormula]);



  return (
    <div className="space-y-6">
      {/* Ad Naming Convention */}
      <div className="bg-[#f7f7f7] rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <img src="https://unpkg.com/@mynaui/icons/icons/label.svg" alt="Ad Name Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
          <h3 className="font-medium text-[14px] text-zinc-950 flex items-center gap-1">
            Ad Name Formula
            <span className="inline-flex items-center">
              <Infotooltip side="bottom" />
            </span>
          </h3>
        </div>

        <p className="text-xs text-black text-gray-500">
          You can generate an ad name formula by selecting and re-ordering the properties below. <br></br>You can add custom text on the home page when making an ad
        </p>
        <ReorderAdNameParts
          order={adOrder}
          setOrder={setAdOrder}
          values={adValues}
          setValues={setAdValues}
          selectedItems={selectedAdNameItems}
          onItemToggle={(item) => {
            setSelectedAdNameItems((prev) =>
              prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
            )
          }}
          customTextValue={customAdNameText}
          onCustomTextChange={setCustomAdNameText}
        />
      </div>


      {/* Thumbnail Settings */}
      {/* <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-3 opacity-60 pointer-events-none select-none cursor-not-allowed">
        <div className="flex items-center gap-2">
          <img src="https://api.withblip.com/icons/preview.svg" alt="Thumbnail Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
          <h3 className="font-medium text-[14px] text-zinc-950">Custom Thumbnail (Coming Soon)</h3>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-black font-medium">
            Provide custom thumbnail for video uploads?
            <span className="block text-gray-400 font-normal text-[12px]">
              If off, we will upload our own thumbnail for your videos{" "}
              <a href="https://api.withblip.com/thumbnail.jpg" className="underline text-black font-medium">View Thumbnail</a>
            </span>
          </p>
          <Switch checked={customThumbnail} onCheckedChange={setCustomThumbnail} />
        </div>
        <Button
          className="hover:bg-black text-white bg-gray-700 rounded-xl"
        >
          Upload Custom Thumbnail
        </Button>
      </div> */}

      {/* Save Button */}
      <div className="pt-2">

        <Button
          className="w-full h-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-xl h-[40px]"
          onClick={async () => {
            const globalSettings = {
              adNameFormula: {
                order: adOrder,
                selected: selectedAdNameItems, // ✅ which fields are selected
                values: {
                  dateType: adValues.dateType // ✅ only dateType needs a value
                }
              }
            };

            try {
              await saveSettings({ globalSettings });
              toast.success("Global settings saved!");
            } catch (err) {
              toast.error("Failed to save global settings: " + err.message);
            }
          }}
        >
          Save Settings
        </Button>


      </div>
    </div>
  )
}
