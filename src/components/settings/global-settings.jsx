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



export default function GlobalSettings() {


  const [customThumbnail, setCustomThumbnail] = useState(false)
  const [adTypeOption, setAdTypeOption] = useState("")
  const [dateOption, setDateOption] = useState("")
  const [useFileName, setUseFileName] = useState(false)
  const { adNameFormula } = useGlobalSettings();
  const { globalSettings } = useGlobalSettings();
  const [adOrder, setAdOrder] = useState(["adType", "dateType", "fileName"]);
  const [adValues, setAdValues] = useState({
    adType: "",
    dateType: "",
    useFileName: false
  });
  // const fileInputRef = useRef();
  // const [thumbnailFile, setThumbnailFile] = useState(null);
  // const [uploadedFileName, setUploadedFileName] = useState("");
  // const finalFileName = uploadedFileName || globalSettings?.customThumbnailFileName;


  // const handleFileSelection = (e) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   setThumbnailFile(file);
  //   setUploadedFileName(file.name); // for immediate feedback
  // };

  // const handleSave = async () => {
  //   let customThumbnailHash = globalSettings?.customThumbnailHash;
  //   let customThumbnailFileName = globalSettings?.customThumbnailFileName;

  //   // If a new file is selected
  //   if (thumbnailFile) {
  //     const formData = new FormData();
  //     formData.append("thumbnail", thumbnailFile);
  //     formData.append("adAccountId", selectedAdAccount || "");

  //     try {
  //       const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/upload-thumbnail", {
  //         method: "POST",
  //         credentials: "include",
  //         body: formData,
  //       });

  //       const data = await res.json();
  //       if (data?.hash) {
  //         customThumbnailHash = data.hash;
  //         customThumbnailFileName = thumbnailFile.name;
  //       } else {
  //         toast.error("Thumbnail upload failed.");
  //         return;
  //       }
  //     } catch (err) {
  //       console.error("Thumbnail upload error:", err);
  //       toast.error("Thumbnail upload error.");
  //       return;
  //     }
  //   }

  //   // Now save everything in one go
  //   await saveSettings({
  //     adNameFormula: {
  //       order: adOrder,
  //       values: adValues,
  //     },
  //     ...(customThumbnailHash && { customThumbnailHash }),
  //     ...(customThumbnailFileName && { customThumbnailFileName }),
  //   });

  //   toast.success("Settings saved");
  // };


  // const computeAdName = () => {

  useEffect(() => {
    setAdOrder(adNameFormula.order || ["adType", "dateType", "fileName"]);
    setAdValues(adNameFormula.values || {});
  }, [adNameFormula]);



  const CustomRadioButton = ({ value, checked, onChange, label, id }) => {
    const handleClick = (e) => {
      e.preventDefault(); // 🛑 prevent default input behavior
      if (checked) {
        onChange("");
      } else {
        onChange(value);
      }
    };


    return (
      <label
        htmlFor={id}
        className={cn(
          "flex items-center space-x-2 rounded-lg px-1 py-1.5 cursor-pointer transition-all hover:py-1.5",
          checked
            ? "bg-gray-100 font-semibold"
            : "hover:bg-gray-100"
        )}
        onClick={handleClick}
      >
        <div className="relative flex items-center justify-center">
          <div className={`w-4 h-4 rounded-full border ${checked ? "border-black" : "border-gray-400"} bg-white`}>
            {checked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-black"></div>
              </div>
            )}
          </div>
          <input
            type="radio"
            id={id}
            value={value}
            checked={checked}
            onChange={() => { }} // Prevent default React double-call
            className="sr-only"
          />
        </div>
        <span className="text-xs">{label}</span>
      </label>
    )
  }
  const previewParts = adOrder.map((key) => {
    if (key === "adType") return adValues.adType;
    if (key === "dateType") return adValues.dateType;
    if (key === "fileName") return adValues.useFileName ? "File" : null;
  }).filter(Boolean);


  return (
    <div className="space-y-6">
      {/* Ad Naming Convention */}
      <div className="bg-[#f7f7f7] rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <img src="https://meta-ad-uploader-server-production.up.railway.app/icons/name.svg" alt="Ad Name Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
          <h3 className="font-medium text-[14px] text-zinc-950">Ad Name (Internal Name)</h3>
        </div>

        <p className="text-xs text-black text-gray-500">
          You can generate an ad name formula by selecting and re-ordering the properties below. <br></br>You can add custom text on the home page when making an ad
        </p>
        <ReorderAdNameParts
          order={adOrder}
          setOrder={setAdOrder}
          values={adValues}
          setValues={setAdValues}
        />
      </div>


      {/* Thumbnail Settings */}
      <div className="bg-[#f7f7f7] rounded-xl p-4 space-y-3 opacity-60 pointer-events-none select-none cursor-not-allowed">
        <div className="flex items-center gap-2">
          <img src="https://meta-ad-uploader-server-production.up.railway.app/icons/preview.svg" alt="Thumbnail Icon" className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
          <h3 className="font-medium text-[14px] text-zinc-950">Custom Thumbnail (Coming Soon)</h3>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-black font-medium">
            Provide custom thumbnail for video uploads?
            <span className="block text-gray-400 font-normal text-[12px]">
              If off, we will upload our own thumbnail for your videos{" "}
              <a href="https://meta-ad-uploader-server-production.up.railway.app/thumbnail.jpg" className="underline text-black font-medium">View Thumbnail</a>
            </span>
          </p>
          <Switch checked={customThumbnail} onCheckedChange={setCustomThumbnail} />
        </div>
        <Button
          className="hover:bg-black text-white bg-gray-700 rounded-xl"
        >
          Upload Custom Thumbnail
        </Button>
      </div>

      {/* Save Button */}
      <div className="pt-2">

        <Button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-[14px] h-[40px]"
          onClick={async () => {
            const globalSettings = {
              adNameFormula: {
                order: adOrder,
                values: adValues
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
